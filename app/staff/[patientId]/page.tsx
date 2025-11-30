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

  // Initialize form with received data
  const form = usePatientForm(formData);

  // Handle incoming WebSocket messages
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const msg: WebSocketMessage = JSON.parse(event.data);
        console.log("[Staff Live View] Received message:", msg.type, msg);

        // Handle full form snapshots
        if (msg.type === "formSnapshot" && msg.payload) {
          console.log("[Staff Live View] Setting form data:", msg.payload);
          const payloadData = msg.payload as Partial<PatientFormValues>;
          setFormData(payloadData);
          form.reset(payloadData);
          setLastUpdate(new Date());
        }
        // Handle status updates
        else if (msg.type === "status" && msg.state) {
          console.log("[Staff Live View] Status update:", msg.state);
          setCurrentStatus(msg.state as ActivePatientStatus);
        }
        // Handle connected message
        else if (msg.type === "connected") {
          console.log("[Staff Live View] Connected to patient room");
        }
      } catch (err) {
        console.warn("[Staff] Invalid message:", err);
      }
    },
    [form]
  );
  
  // Connect to patient's WebSocket room with message handler
  const { isConnected, send } = usePatientWebSocket(patientId, {
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
        onSubmit={() => {}} // No-op for staff view
        disabled={true} // Read-only for staff
        submitButtonText="Form Preview (Read-only)"
      />

      <div className="text-xs text-gray-400 text-center">
        Viewing patient form in real-time (read-only mode)
      </div>
    </div>
  );
}
