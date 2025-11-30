"use client";

import { useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  useStaffDashboard,
  usePatientLiveConnections,
  type PatientSummary,
  type PatientStatus,
} from "@/hooks/web-socket";
import { useRouter } from "next/navigation";

function getStatusBadge(status: PatientStatus) {
  const styles = {
    updating: {
      bg: "bg-blue-100",
      text: "text-blue-800",
      dot: "bg-blue-500",
      label: "✏️ Updating",
      animation: "animate-pulse",
    },
    online: {
      bg: "bg-green-100",
      text: "text-green-800",
      dot: "bg-green-500",
      label: "🟢 Online",
      animation: "",
    },
    idle: {
      bg: "bg-yellow-100",
      text: "text-yellow-800",
      dot: "bg-yellow-500",
      label: "💤 Idle",
      animation: "",
    },
    disconnected: {
      bg: "bg-gray-100",
      text: "text-gray-600",
      dot: "bg-gray-400",
      label: "⚫ Offline",
      animation: "",
    },
  };

  return styles[status] || styles.disconnected;
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export default function StaffDashboard() {
  const { patients, setPatients } = useStaffDashboard();
  const router = useRouter();

  const handlePatientUpdate = useCallback(
    (patientId: string, data: PatientSummary, timestamp: number) => {
      setPatients((prev) => ({
        ...prev,
        [patientId]: {
          summary: {
            ...prev[patientId]?.summary,
            ...data,
          },
          ts: timestamp,
          isLiveConnected: true,
          status: prev[patientId]?.status || "online",
          lastActivity: timestamp,
        },
      }));
    },
    [setPatients]
  );

  const { connectToPatient } = usePatientLiveConnections();

  const handleViewLive = useCallback(
    (patientId: string) => {
      // Navigate to the live view page
      router.push(`/staff/${patientId}`);
    },
    [router]
  );

  const patientList = Object.entries(patients).sort(([, a], [, b]) => {
    // Sort by status priority, then by timestamp
    const statusPriority = { updating: 0, online: 1, idle: 2, disconnected: 3 };
    const aPriority = statusPriority[a.status];
    const bPriority = statusPriority[b.status];

    if (aPriority !== bPriority) return aPriority - bPriority;
    return b.lastActivity - a.lastActivity;
  });

  const stats = {
    total: patientList.length,
    updating: patientList.filter(([, p]) => p.status === "updating").length,
    online: patientList.filter(([, p]) => p.status === "online").length,
    idle: patientList.filter(([, p]) => p.status === "idle").length,
    disconnected: patientList.filter(([, p]) => p.status === "disconnected")
      .length,
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header with Stats */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-3">Staff Dashboard</h1>

        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium">Total:</span>
            <Badge variant="outline">{stats.total}</Badge>
          </div>

          {stats.updating > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              <span>Updating: {stats.updating}</span>
            </div>
          )}

          {stats.online > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span>Online: {stats.online}</span>
            </div>
          )}

          {stats.idle > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
              <span>Idle: {stats.idle}</span>
            </div>
          )}

          {stats.disconnected > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gray-400"></span>
              <span>Offline: {stats.disconnected}</span>
            </div>
          )}
        </div>
      </div>

      {/* Patient List */}
      {patientList.length === 0 ? (
        <Card className="p-8 text-center text-gray-500">
          <div className="text-4xl mb-2">👥</div>
          <p className="font-medium">No active patients</p>
          <p className="text-sm mt-1">Waiting for form submissions...</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {patientList.map(([id, patient]) => {
            const statusStyle = getStatusBadge(patient.status);
            const isActive =
              patient.status === "updating" || patient.status === "online";

            return (
              <Card
                key={id}
                className={`p-4 transition-all ${
                  patient.status === "updating"
                    ? "border-blue-300 shadow-md"
                    : ""
                }`}
              >
                <div className="flex justify-between items-start gap-4">
                  {/* Patient Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {/* Animated status dot */}
                      <span
                        className={`inline-block w-3 h-3 rounded-full ${statusStyle.dot} ${statusStyle.animation}`}
                        title={statusStyle.label}
                      />

                      <h3 className="text-lg font-semibold truncate">
                        {patient.summary?.firstName || "Anonymous"}{" "}
                        {patient.summary?.lastName || ""}
                      </h3>

                      {patient.summary?.submitted && (
                        <Badge className="bg-green-600 text-white">
                          ✓ Submitted
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      {/* Status badge */}
                      <Badge
                        variant="outline"
                        className={`${statusStyle.bg} ${statusStyle.text} border-0`}
                      >
                        {statusStyle.label}
                      </Badge>

                      {/* Last activity */}
                      <span className="text-gray-500 text-xs">
                        {patient.status === "disconnected"
                          ? `Left ${formatTimeAgo(patient.ts)}`
                          : `Active ${formatTimeAgo(patient.lastActivity)}`}
                      </span>

                      {/* Live connection indicator */}
                      {patient.isLiveConnected && (
                        <Badge
                          variant="outline"
                          className="text-green-600 border-green-300 text-xs"
                        >
                          📡 Live View
                        </Badge>
                      )}

                      {/* Patient ID (short version) */}
                      <span className="text-gray-400 text-xs font-mono">
                        {id.substring(0, 8)}...
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Progress badge */}
                    <div className="text-center min-w-[70px]">
                      <Badge
                        variant={
                          patient.summary?.submitted ? "default" : "secondary"
                        }
                        className={`w-full justify-center ${
                          patient.summary?.submitted
                            ? "bg-green-600"
                            : (patient.summary?.progress ?? 0) >= 75
                            ? "bg-blue-600 text-white"
                            : ""
                        }`}
                      >
                        {patient.summary?.submitted
                          ? "Done"
                          : `${patient.summary?.progress ?? 0}%`}
                      </Badge>
                    </div>

                    {/* View Live button */}
                    <Button
                      onClick={() => handleViewLive(id)}
                      disabled={
                        patient.isLiveConnected ||
                        patient.status === "disconnected"
                      }
                      variant={patient.isLiveConnected ? "outline" : "default"}
                      size="sm"
                    >
                      {patient.isLiveConnected ? "Connected" : "View Live"}
                    </Button>

                    {/* Detail link */}
                    <Link href={`/staff/${id}`}>
                      <Button variant="ghost" size="sm">
                        Details →
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
