"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PatientForm } from "@/components/form/patient-form";
import { usePatientForm, PatientFormValues } from "@/hooks/patient-form";
import {
  usePatientWebSocket,
  type ActivePatientStatus,
  type WebSocketMessage,
} from "@/hooks/web-socket";
import { toast } from "sonner"; // ADD THIS

export default function StaffPatientView({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const resolvedParams = use(params);
  const { patientId } = resolvedParams;
  const router = useRouter();

  const [formData, setFormData] = useState<Partial<PatientFormValues>>({});
  const [currentStatus, setCurrentStatus] =
    useState<ActivePatientStatus>("online");
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Initialize form with empty values
  const form = usePatientForm();

  // Update form whenever formData changes
  useEffect(() => {
    if (Object.keys(formData).length > 0) {
      console.log("[Staff Live View] Updating form with:", formData);

      // Reset the form with new data
      form.reset(formData, {
        keepErrors: false,
        keepDirty: false,
        keepIsSubmitted: false,
        keepTouched: false,
        keepIsValid: false,
        keepSubmitCount: false,
      });

      console.log("[Staff Live View] Form after reset:", form.getValues());
    }
  }, [formData, form]);

  // Handle incoming WebSocket messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const msg: WebSocketMessage = JSON.parse(event.data);
      console.log("[Staff Live View] Received message:", msg.type);

      // Handle full form snapshots
      if (msg.type === "formSnapshot" && msg.payload) {
        const payloadData = msg.payload as Partial<PatientFormValues>;
        console.log("[Staff Live View] Received form data:", payloadData);

        // Update state - the useEffect above will handle form update
        setFormData(payloadData);
        setLastUpdate(new Date());
      }
      // Handle status updates
      else if (msg.type === "status" && msg.state) {
        setCurrentStatus(msg.state as ActivePatientStatus);
      }
      // UPDATED: Handle submission from patient
      else if (msg.type === "submit") {
        const payload = msg.payload as Partial<PatientFormValues>;
        const patientName = payload.firstName && payload.lastName
          ? `${payload.firstName} ${payload.lastName}`
          : patientId.substring(0, 8);
        
        console.log("[Staff Live View] Patient submitted form");
        
        // Show success toast
        toast.success("Form Submitted!", {
          description: `Patient ${patientName} has successfully submitted their form.`,
          duration: 5000,
        });

        // Redirect to dashboard after a brief delay
        setTimeout(() => {
          router.push("/staff");
        }, 1000);
      }
    } catch (err) {
      console.warn("[Staff] Invalid message:", err);
    }
  }, [router, patientId]);

  // Connect to patient's WebSocket room with message handler
  const { isConnected } = usePatientWebSocket(patientId, {
    onMessage: handleMessage,
  });

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
      idle: {
        bg: "bg-yellow-100",
        text: "text-yellow-800",
        label: "💤 Idle",
      },
    };
    return styles[status];
  };

  const statusStyle = getStatusStyle(currentStatus);

  return (
    <div className="max-w-lg mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-semibold">Staff Live View</h1>
          <Button onClick={() => router.back()} variant="outline" size="sm">
            ← Back to Dashboard
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-sm text-gray-500">Patient ID: {patientId}</p>
          <Badge
            className={`${statusStyle.bg} ${statusStyle.text} border-0 text-xs`}
          >
            {statusStyle.label}
          </Badge>
          {isConnected() && (
            <Badge className="bg-green-100 text-green-800 border-0 text-xs">
              🔗 Connected
            </Badge>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Last update: {lastUpdate.toLocaleTimeString()}
        </p>
      </div>

      {/* Form - Read-only */}
      <PatientForm
        form={form}
        onSubmit={() => {}} // No-op - staff cannot submit
        isViewMode={true} // Read-only mode
        submitButtonText="Form Preview (Read-only)"
      />

      <div className="text-xs text-gray-400 text-center">
        Viewing patient form in real-time (read-only mode)
      </div>
    </div>
  );
}