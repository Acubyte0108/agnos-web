"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { usePatientWebSocket, useDashboardWebSocket, createWSMessage } from "@/hooks/web-socket";

const formSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().min(5, "Phone must be at least 5 characters"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

const FULL_SNAPSHOT_THRESHOLD = 3; // number of filled fields before sending full snapshot
const PATIENT_ID_STORAGE_KEY = "patientId";

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

function calculateProgress(values: Partial<FormValues>): number {
  const fields: (keyof FormValues)[] = ["firstName", "lastName", "phone", "email"];
  const filledCount = fields.filter((field) => values[field]).length;
  return Math.round((filledCount / fields.length) * 100);
}

export default function PatientPage() {
  const [patientId, setPatientId] = useState<string>("");
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { firstName: "", lastName: "", phone: "", email: "" },
  });

  // Initialize patient ID on mount
  useEffect(() => {
    setPatientId(generatePatientId());
  }, []);

  // WebSocket connections
  const patientWS = usePatientWebSocket(patientId);
  const dashboardWS = useDashboardWebSocket(patientId);

  // Send full snapshot to patient room
  const sendFullSnapshot = useCallback(
    (values: FormValues) => {
      const message = createWSMessage("formSnapshot", patientId, values);
      patientWS.send(message);
    },
    [patientId, patientWS]
  );

  // Send lightweight summary to dashboard
  const sendDashboardSummary = useCallback(
    (values: Partial<FormValues>) => {
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
        sendFullSnapshot(values as FormValues);
      }
    });

    return () => subscription.unsubscribe();
  }, [form, patientId, sendDashboardSummary, sendFullSnapshot]);

  // Handle form submission
  const onSubmit = useCallback(
    (values: FormValues) => {
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

  return (
    <div className="max-w-lg mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Patient Form</h1>
        <p className="text-sm text-gray-500 mt-1">
          Patient ID: {patientId || "Loading..."}
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Input
            placeholder="First name"
            {...form.register("firstName")}
            aria-label="First name"
          />
          {form.formState.errors.firstName && (
            <p className="text-sm text-red-500">
              {form.formState.errors.firstName.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Input
            placeholder="Last name"
            {...form.register("lastName")}
            aria-label="Last name"
          />
          {form.formState.errors.lastName && (
            <p className="text-sm text-red-500">
              {form.formState.errors.lastName.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Input
            placeholder="Phone"
            {...form.register("phone")}
            aria-label="Phone"
          />
          {form.formState.errors.phone && (
            <p className="text-sm text-red-500">
              {form.formState.errors.phone.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Input
            placeholder="Email (optional)"
            type="email"
            {...form.register("email")}
            aria-label="Email"
          />
          {form.formState.errors.email && (
            <p className="text-sm text-red-500">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full">
          Submit Form
        </Button>
      </form>
    </div>
  );
}
