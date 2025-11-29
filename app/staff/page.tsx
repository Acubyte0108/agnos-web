"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useStaffDashboard, usePatientLiveConnections, PatientSummary } from "@/hooks/";

export default function StaffDashboard() {
  const { patients, setPatients } = useStaffDashboard();

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
        },
      }));
    },
    [setPatients]
  );

  const { connectToPatient } = usePatientLiveConnections();

  const handleViewLive = useCallback(
    (patientId: string) => {
      connectToPatient(patientId, handlePatientUpdate);
      
      // Update UI to show connected state
      setPatients((prev) => ({
        ...prev,
        [patientId]: {
          ...prev[patientId],
          isLiveConnected: true,
        },
      }));
    },
    [connectToPatient, handlePatientUpdate, setPatients]
  );

  const patientList = Object.entries(patients).sort(
    ([, a], [, b]) => b.ts - a.ts // Sort by most recent first
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Staff Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Active patients: {patientList.length}
        </p>
      </div>

      {patientList.length === 0 ? (
        <Card className="p-8 text-center text-gray-500">
          No active patients. Waiting for form submissions...
        </Card>
      ) : (
        <div className="space-y-3">
          {patientList.map(([id, patient]) => (
            <Card key={id} className="p-4 flex justify-between items-center">
              <div className="flex-1">
                <div className="text-lg font-semibold">
                  {patient.summary?.firstName || "Anonymous"}{" "}
                  {patient.summary?.lastName || ""}
                </div>
                <div className="text-sm text-gray-500 flex items-center gap-2">
                  <span>Last update: {new Date(patient.ts).toLocaleTimeString()}</span>
                  {patient.isLiveConnected && (
                    <Badge variant="outline" className="text-green-600">
                      Live
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Badge variant={patient.summary?.submitted ? "default" : "secondary"}>
                  {patient.summary?.submitted
                    ? "Submitted"
                    : `${patient.summary?.progress ?? 0}%`}
                </Badge>
                
                <Button
                  onClick={() => handleViewLive(id)}
                  disabled={patient.isLiveConnected}
                  variant={patient.isLiveConnected ? "outline" : "default"}
                >
                  {patient.isLiveConnected ? "Connected" : "View Live"}
                </Button>
                
                <Link href={`/staff/${id}`}>
                  <Button variant="ghost">Detail</Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}