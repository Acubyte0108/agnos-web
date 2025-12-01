"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useStaffDashboard } from "@/hooks/use-web-socket";
import { getStatusStyle, StatusDot } from "@/components/status-badge";

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
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      {/* Header with Stats */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold mb-3">
          Staff Dashboard
        </h1>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm">
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
        <Card className="p-6 sm:p-8 text-center text-gray-500">
          <div className="text-3xl sm:text-4xl mb-2">👥</div>
          <p className="font-medium">No active patients</p>
          <p className="text-sm mt-1">Waiting for form submissions...</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {patientList.map(([id, patient]) => {
            const statusStyle = getStatusStyle(patient.status);
            const isSubmitted = patient.summary?.submitted === true;
            const isDisconnected = patient.status === "disconnected";
            const isFadingOut = isSubmitted || isDisconnected;
            const canViewLive = !isDisconnected && !isSubmitted;

            return (
              <Card
                key={id}
                className={`p-3 sm:p-4 transition-all duration-300 ${
                  patient.status === "updating"
                    ? "border-blue-300 shadow-md"
                    : isSubmitted
                    ? "border-green-400 shadow-lg bg-green-50"
                    : isDisconnected
                    ? "opacity-60 border-gray-300 bg-gray-50"
                    : ""
                } ${isFadingOut ? "animate-fade-out" : ""}`}
              >
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4">
                  {/* Patient Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {/* Animated status dot */}
                      <StatusDot status={patient.status} />

                      <h3 className="text-base sm:text-lg font-semibold truncate">
                        {patient.summary?.firstName || "Anonymous"}{" "}
                        {patient.summary?.lastName || ""}
                      </h3>

                      {/* Submitted badge */}
                      {isSubmitted && (
                        <Badge className="bg-green-600 text-white animate-pulse text-xs">
                          ✓ Submitted
                        </Badge>
                      )}

                      {/* Disconnected indicator */}
                      {isDisconnected && !isSubmitted && (
                        <Badge className="bg-gray-500 text-white text-xs">
                          Disconnected
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                      {/* Status badge */}
                      <Badge
                        variant="outline"
                        className={`${statusStyle.bg} ${statusStyle.text} border-0 text-xs`}
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
                  <div className="flex items-center gap-2 sm:gap-2 shrink-0 justify-between sm:justify-start">
                    {/* Progress badge */}
                    <div className="text-center min-w-[60px] sm:min-w-[70px]">
                      <Badge
                        variant={isSubmitted ? "default" : "secondary"}
                        className={`w-full justify-center text-xs ${
                          isSubmitted
                            ? "bg-green-600"
                            : (patient.summary?.progress ?? 0) >= 75
                            ? "bg-blue-600 text-white"
                            : ""
                        }`}
                      >
                        {isSubmitted
                          ? "Done"
                          : `${patient.summary?.progress ?? 0}%`}
                      </Badge>
                    </div>

                    {/* View Live button - UPDATED */}
                    {canViewLive ? (
                      <Link href={`/staff/${id}`}>
                        <Button
                          variant="default"
                          size="sm"
                          className="cursor-pointer text-xs sm:text-sm"
                        >
                          <span className="hidden sm:inline">View Live</span>
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                        className="text-xs sm:text-sm cursor-not-allowed"
                      >
                        <span className="hidden sm:inline">View Live</span>
                      </Button>
                    )}
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
