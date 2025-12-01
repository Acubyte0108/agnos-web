"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PatientForm } from "@/components/form/patient-form";
import { usePatientForm, PatientFormValues } from "@/hooks/use-patient-form";
import {
  usePatientWebSocket,
  PatientStatus,
  WebSocketMessage,
} from "@/hooks/use-web-socket";
import { toast } from "sonner";
import { StatusBadge } from "@/components/status-badge";

export default function StaffPatientView({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const resolvedParams = use(params);
  const { patientId } = resolvedParams;
  const router = useRouter();

  const [formData, setFormData] = useState<Partial<PatientFormValues>>({});
  const [currentStatus, setCurrentStatus] = useState<PatientStatus>("online");
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const form = usePatientForm();

  // Update form whenever formData changes
  useEffect(() => {
    if (Object.keys(formData).length > 0) {
      console.log("[Staff Live View] Updating form with:", formData);
      form.reset(formData, {
        keepErrors: false,
        keepDirty: false,
        keepIsSubmitted: false,
        keepTouched: false,
        keepIsValid: false,
        keepSubmitCount: false,
      });
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
        setFormData(payloadData);
        setLastUpdate(new Date());
      }
      // Handle status updates (including disconnected!)
      else if (msg.type === "status" && msg.state) {
        const newStatus = msg.state as PatientStatus;
        console.log("[Staff Live View] Status update:", newStatus);
        setCurrentStatus(newStatus);
        
        // Show toast for disconnection
        if (newStatus === "disconnected") {
          toast.warning("Patient Disconnected", {
            description: "The patient has left the session or refreshed the page.",
            duration: 5000,
          });
        }
      }
      // Handle submission from patient
      else if (msg.type === "submit") {
        const payload = msg.payload as Partial<PatientFormValues>;
        const patientName = payload.firstName && payload.lastName
          ? `${payload.firstName} ${payload.lastName}`
          : patientId.substring(0, 8);
        
        console.log("[Staff Live View] Patient submitted form");
        
        toast.success("Form Submitted!", {
          description: `Patient ${patientName} has successfully submitted their form.`,
          duration: 5000,
        });

        setTimeout(() => {
          router.push("/staff");
        }, 1000);
      }
    } catch (err) {
      console.warn("[Staff Live View] Invalid message:", err);
    }
  }, [router, patientId, form]);

  // Connect to patient's WebSocket room
  const { isConnected } = usePatientWebSocket(patientId, {
    onMessage: handleMessage,
  });

  return (
    <div className="max-w-lg mx-auto p-6 space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-semibold">Staff Live View</h1>
          <Button onClick={() => router.back()} variant="outline" size="sm">
            ← Back to Dashboard
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-sm text-gray-500">Patient ID: {patientId}</p>
          <StatusBadge status={currentStatus} />
          {isConnected() && currentStatus !== "disconnected" && (
            <Badge className="bg-green-100 text-green-800 border-0 text-xs">
              🔗 Connected
            </Badge>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Last update: {lastUpdate.toLocaleTimeString()}
        </p>
      </div>

      <PatientForm
        form={form}
        onSubmit={() => {}}
        isViewMode={true} 
        submitButtonText="Form Preview (Read-only)"
      />

      <div className="text-xs text-gray-400 text-center">
        Viewing patient form in real-time (read-only mode)
      </div>
    </div>
  );
}