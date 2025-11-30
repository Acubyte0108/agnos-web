"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import {
  usePatientWebSocket,
  useDashboardWebSocket,
  createWSMessage,
  ActivePatientStatus,
} from "@/hooks/web-socket";
import { PatientForm } from "@/components/form/patient-form";
import { usePatientForm, PatientFormValues } from "@/hooks/patient-form";

const FULL_SNAPSHOT_THRESHOLD = 3;
const PATIENT_ID_STORAGE_KEY = "patientId";
const IDLE_TIMEOUT = 30000; // 30 seconds
const ONLINE_TIMEOUT = 2000; // 2 seconds

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

function calculateProgress(values: Partial<PatientFormValues>): number {
  // List of required fields (excluding optional fields)
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

  const form = usePatientForm();

  // Initialize patient ID on mount
  useEffect(() => {
    setPatientId(generatePatientId());
  }, []);

  // WebSocket connections
  const patientWS = usePatientWebSocket(patientId);
  const dashboardWS = useDashboardWebSocket(patientId);

  // Send status update - memoized properly
  const sendStatusUpdate = useCallback(
    (status: ActivePatientStatus) => {
      if (!patientId) return;

      const message = createWSMessage("status", patientId, undefined, status);

      // Send to dashboard (for staff overview)
      dashboardWS.sendImmediate(message);

      // ALSO send to patient's own room (for staff viewing this specific patient)
      patientWS.send(message);

      setCurrentStatus(status);

      console.log(`[Patient] Status changed to: ${status}`);
    },
    [patientId, dashboardWS, patientWS]
  );
  // Create a stable ref for sendStatusUpdate to avoid effect re-runs
  const sendStatusRef = useRef(sendStatusUpdate);

  useEffect(() => {
    sendStatusRef.current = sendStatusUpdate;
  }, [sendStatusUpdate]);

  // Handle keyboard input (typing) - triggers "updating"
  const handleKeyboardInput = useCallback(() => {
    // Clear existing timers
    if (activityTimerRef.current) {
      window.clearTimeout(activityTimerRef.current);
    }
    if (idleTimerRef.current) {
      window.clearTimeout(idleTimerRef.current);
    }

    // Send "updating" status immediately when typing
    if (currentStatus !== "updating") {
      sendStatusRef.current("updating");
    }

    // After 2 seconds of no typing, switch to "online"
    activityTimerRef.current = window.setTimeout(() => {
      sendStatusRef.current("online");
    }, ONLINE_TIMEOUT);

    // After 30 seconds of no typing, switch to "idle"
    idleTimerRef.current = window.setTimeout(() => {
      sendStatusRef.current("idle");
    }, IDLE_TIMEOUT);
  }, [currentStatus]);

  // Handle focus (just being in the form) - maintains "online"
  const handleInputFocus = useCallback(() => {
    // Clear idle timer when user focuses on input
    if (idleTimerRef.current) {
      window.clearTimeout(idleTimerRef.current);
    }

    // If user was idle, set back to online
    if (currentStatus === "idle") {
      sendStatusRef.current("online");
    }

    // Reset idle timer
    idleTimerRef.current = window.setTimeout(() => {
      sendStatusRef.current("idle");
    }, IDLE_TIMEOUT);
  }, [currentStatus]);

  /// Send initial "online" status and setup global idle detection
  useEffect(() => {
    if (!patientId) return;

    // Send initial status after connection
    const timer = setTimeout(() => {
      sendStatusRef.current("online");
    }, 1000);

    // Store idle timer in the ref so it can be cleared by other functions
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

  // Send full snapshot to patient room
  const sendFullSnapshot = useCallback(
    (values: PatientFormValues) => {
      const message = createWSMessage("formSnapshot", patientId, values);
      patientWS.send(message);
    },
    [patientId, patientWS]
  );

  // Send lightweight summary to dashboard
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

  // Watch form changes and send updates
  useEffect(() => {
    const subscription = form.watch((values) => {
      if (!patientId) return;

      // Always send summary to dashboard
      sendDashboardSummary(values);

      // Send full snapshot if enough fields are filled
      const filledCount = Object.values(values).filter(Boolean).length;
      if (filledCount >= FULL_SNAPSHOT_THRESHOLD) {
        sendFullSnapshot(values as PatientFormValues);
      }
    });

    return () => subscription.unsubscribe();
  }, [form, patientId, sendDashboardSummary, sendFullSnapshot]);

  // Handle form submission
  const onSubmit = useCallback(
    (values: PatientFormValues) => {
      // Send submit message to patient room
      const submitMessage = createWSMessage("submit", patientId, values);
      patientWS.send(submitMessage);

      // Notify dashboard of submission
      const dashboardMessage = createWSMessage("summary", patientId, {
        ...values,
        progress: 100,
        submitted: true,
      });
      dashboardWS.sendImmediate(dashboardMessage);

      alert("Form submitted successfully!");
    },
    [patientId, patientWS, dashboardWS]
  );

  // Get status badge styling
  const getStatusStyle = (status: ActivePatientStatus) => {
    const styles = {
      updating: {
        bg: "bg-blue-100",
        text: "text-blue-800",
        label: "✏️ Typing",
      },
      online: {
        bg: "bg-green-100",
        text: "text-green-800",
        label: "🟢 Online",
      },
      idle: { bg: "bg-yellow-100", text: "text-yellow-800", label: "💤 Idle" },
    };
    return styles[status];
  };

  const statusStyle = getStatusStyle(currentStatus);

  return (
    <div className="max-w-lg mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Patient Form</h1>
        <div className="flex items-center gap-2 mt-2">
          <p className="text-sm text-gray-500">
            Patient ID: {patientId || "Loading..."}
          </p>
          {patientId && (
            <Badge
              className={`${statusStyle.bg} ${statusStyle.text} border-0 text-xs`}
            >
              {statusStyle.label}
            </Badge>
          )}
        </div>
      </div>

      <PatientForm
        form={form as UseFormReturn<PatientFormValues>}
        onSubmit={onSubmit}
        onInputFocus={handleInputFocus}
        onKeyDown={handleKeyboardInput}
      />

      <div className="text-xs text-gray-400 text-center">
        Your activity is monitored in real-time by staff
      </div>
    </div>
  );
}
