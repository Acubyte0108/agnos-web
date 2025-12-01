"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import {
  usePatientWebSocket,
  useDashboardWebSocket,
  createWSMessage,
  ActivePatientStatus,
} from "@/hooks/use-web-socket";
import { PatientForm } from "@/components/form/patient-form";
import { usePatientForm, PatientFormValues } from "@/hooks/use-patient-form";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";

const PATIENT_ID_STORAGE_KEY = "patientId";
const PATIENT_FORM_DATA_KEY = "patientFormData";
const IDLE_TIMEOUT = 30000;
const ONLINE_TIMEOUT = 2000;

function generatePatientId(): string {
  if (typeof window === "undefined") return "anonymous";

  const storedId = sessionStorage.getItem(PATIENT_ID_STORAGE_KEY);
  if (storedId) return storedId;

  const newId =
    crypto && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `patient-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  sessionStorage.setItem(PATIENT_ID_STORAGE_KEY, newId);
  return newId;
}

function loadSavedFormData(): Partial<PatientFormValues> | null {
  if (typeof window === "undefined") return null;

  try {
    const saved = sessionStorage.getItem(PATIENT_FORM_DATA_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function saveFormData(data: Partial<PatientFormValues>) {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.setItem(PATIENT_FORM_DATA_KEY, JSON.stringify(data));
  } catch (err) {
    console.error("[Patient Page] Error saving form data:", err);
  }
}

function clearSavedFormData() {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.removeItem(PATIENT_FORM_DATA_KEY);
  } catch (err) {
    console.error("[Patient Page] Error clearing saved form data:", err);
  }
}

function calculateProgress(values: Partial<PatientFormValues>): number {
  const requiredFields: (keyof PatientFormValues)[] = [
    "firstName",
    "lastName",
    "dateOfBirth",
    "gender",
    "phone",
    "email",
    "address",
    "preferredLanguage",
    "nationality",
  ];

  const filledCount = requiredFields.filter((field) => values[field]).length;
  return Math.round((filledCount / requiredFields.length) * 100);
}

export default function PatientPage() {
  const [patientId, setPatientId] = useState<string>("");
  const [currentStatus, setCurrentStatus] =
    useState<ActivePatientStatus>("online");
  const activityTimerRef = useRef<number | null>(null);
  const idleTimerRef = useRef<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasRestoredRef = useRef(false);

  const form = usePatientForm();
  const router = useRouter();

  useEffect(() => {
    setPatientId(generatePatientId());
  }, []);

  const patientWS = usePatientWebSocket(patientId);
  const dashboardWS = useDashboardWebSocket(patientId);

  useEffect(() => {
    if (!patientId || hasRestoredRef.current) return;

    const savedData = loadSavedFormData();

    if (savedData) {
      hasRestoredRef.current = true;

      setTimeout(() => {
        form.reset(savedData, {
          keepErrors: false,
          keepDirty: false,
          keepIsSubmitted: false,
          keepTouched: false,
          keepIsValid: false,
          keepSubmitCount: false,
        });
      }, 100);

      const timer = setTimeout(() => {
        const summary = {
          firstName: savedData.firstName || null,
          lastName: savedData.lastName || null,
          progress: calculateProgress(savedData),
        };

        dashboardWS.sendImmediate(
          createWSMessage("summary", patientId, summary)
        );
        patientWS.send(createWSMessage("formSnapshot", patientId, savedData));
      }, 1500);

      return () => clearTimeout(timer);
    } else {
      hasRestoredRef.current = true;
    }
  }, [patientId, form]);

  const sendStatusUpdate = useCallback(
    (status: ActivePatientStatus) => {
      if (!patientId) return;

      const message = createWSMessage("status", patientId, undefined, status);
      dashboardWS.sendImmediate(message);
      patientWS.send(message);
      setCurrentStatus(status);
    },
    [patientId, dashboardWS, patientWS]
  );

  const sendStatusRef = useRef(sendStatusUpdate);

  useEffect(() => {
    sendStatusRef.current = sendStatusUpdate;
  }, [sendStatusUpdate]);

  const handleKeyboardInput = useCallback(() => {
    if (activityTimerRef.current) window.clearTimeout(activityTimerRef.current);
    if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);

    if (currentStatus !== "updating") {
      sendStatusRef.current("updating");
    }

    activityTimerRef.current = window.setTimeout(() => {
      sendStatusRef.current("online");
    }, ONLINE_TIMEOUT);

    idleTimerRef.current = window.setTimeout(() => {
      sendStatusRef.current("idle");
    }, IDLE_TIMEOUT);
  }, [currentStatus]);

  const handleInputFocus = useCallback(() => {
    if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);

    if (currentStatus === "idle") {
      sendStatusRef.current("online");
    }

    idleTimerRef.current = window.setTimeout(() => {
      sendStatusRef.current("idle");
    }, IDLE_TIMEOUT);
  }, [currentStatus]);

  useEffect(() => {
    if (!patientId) return;

    const timer = setTimeout(() => {
      sendStatusRef.current("online");
    }, 1000);

    idleTimerRef.current = window.setTimeout(() => {
      sendStatusRef.current("idle");
    }, IDLE_TIMEOUT);

    return () => {
      clearTimeout(timer);
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };
  }, [patientId]);

  const sendFullSnapshot = useCallback(
    (values: PatientFormValues) => {
      const message = createWSMessage("formSnapshot", patientId, values);
      patientWS.send(message);
    },
    [patientId, patientWS]
  );

  const sendDashboardSummary = useCallback(
    (values: Partial<PatientFormValues>) => {
      const summary = {
        firstName: values.firstName || null,
        lastName: values.lastName || null,
        progress: calculateProgress(values),
      };

      const message = createWSMessage("summary", patientId, summary);
      dashboardWS.sendDebounced(message);
    },
    [patientId, dashboardWS]
  );

  useEffect(() => {
    const subscription = form.watch((values) => {
      if (!patientId || !hasRestoredRef.current) return;

      saveFormData(values);
      sendDashboardSummary(values);
      sendFullSnapshot(values as PatientFormValues);
    });

    return () => subscription.unsubscribe();
  }, [form, patientId, sendDashboardSummary, sendFullSnapshot]);

  const onSubmit = useCallback(
    async (values: PatientFormValues) => {
      setIsSubmitting(true);

      try {
        const submitMessage = createWSMessage("submit", patientId, {
          ...values,
          progress: calculateProgress(values),
        });
        patientWS.send(submitMessage);

        const dashboardMessage = createWSMessage("summary", patientId, {
          firstName: values.firstName,
          lastName: values.lastName,
          progress: 100,
          submitted: true,
        });
        dashboardWS.sendImmediate(dashboardMessage);

        clearSavedFormData();
        await new Promise((resolve) => setTimeout(resolve, 500));
        router.push("/thank-you");
      } catch (error) {
        alert("Error submitting form. Please try again.");
        setIsSubmitting(false);
      }
    },
    [patientId, patientWS, dashboardWS, router]
  );

  return (
    <div className="max-w-lg mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Patient Form</h1>
        <div className="flex items-center gap-2 mt-2">
          <p className="text-sm text-gray-500">
            Patient ID: {patientId || "Loading..."}
          </p>
          {patientId && <StatusBadge status={currentStatus} />}
        </div>
      </div>

      <PatientForm
        form={form as UseFormReturn<PatientFormValues>}
        onSubmit={onSubmit}
        onInputFocus={handleInputFocus}
        onKeyDown={handleKeyboardInput}
        disabled={isSubmitting}
        submitButtonText={isSubmitting ? "Submitting..." : "Submit Form"}
      />

      <div className="text-xs text-gray-400 text-center">
        {isSubmitting
          ? "Submitting your form..."
          : "Your activity is monitored in real-time by staff"}
      </div>
    </div>
  );
}
