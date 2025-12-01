"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { connectWS } from "@/lib";

const DASHBOARD_SUMMARY_DEBOUNCE = 600;

type WebSocketMessage = {
  type: string;
  clientId: string;
  payload?: unknown;
  state?: string;
  timestamp: number;
};

type UseWebSocketOptions = {
  room: string;
  clientId: string;
  onOpen?: (ws: WebSocket) => void;
  onMessage?: (event: MessageEvent) => void;
  onError?: (error: Event) => void;
  onClose?: () => void;
  logPrefix?: string;
};

type PatientSummary = {
  firstName?: string | null;
  lastName?: string | null;
  progress?: number;
  submitted?: boolean;
};

type ActivePatientStatus = "online" | "updating" | "idle";
type PatientStatus = ActivePatientStatus | "disconnected";

type PatientInfo = {
  summary: PatientSummary;
  isLiveConnected?: boolean;
  status: PatientStatus;
  lastActivity: number;
};

function createWSMessage(
  type: string,
  clientId: string,
  payload?: unknown,
  state?: string
): string {
  const message: WebSocketMessage = {
    type,
    clientId,
    timestamp: Date.now(),
  };

  if (payload !== undefined) message.payload = payload;
  if (state !== undefined) message.state = state;

  return JSON.stringify(message);
}

function useWebSocket({
  room,
  clientId,
  onOpen,
  onMessage,
  onError,
  onClose,
  logPrefix = "WS",
}: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const isUnmountingRef = useRef(false);

  useEffect(() => {
    if (!clientId) return;

    isUnmountingRef.current = false;
    const ws = connectWS(room, clientId);
    wsRef.current = ws;

    ws.onopen = () => {
      onOpen?.(ws);
    };

    ws.onerror = (error) => {
      if (isUnmountingRef.current) return;

      if (
        ws.readyState !== WebSocket.CLOSING &&
        ws.readyState !== WebSocket.CLOSED
      ) {
        onError?.(error);
      }
    };

    ws.onclose = () => {
      onClose?.();
    };

    if (onMessage) {
      ws.onmessage = onMessage;
    }

    return () => {
      isUnmountingRef.current = true;
      if (
        ws.readyState === WebSocket.OPEN ||
        ws.readyState === WebSocket.CONNECTING
      ) {
        ws.close(1000, "Navigation");
      }
    };
  }, [room, clientId, onOpen, onMessage, onError, onClose, logPrefix]);

  const send = useCallback((message: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(message);
    }
  }, []);

  const isConnected = useCallback(() => {
    return wsRef.current?.readyState === WebSocket.OPEN;
  }, []);

  return { send, isConnected, wsRef };
}

function usePatientWebSocket(
  patientId: string,
  options?: {
    onMessage?: (event: MessageEvent) => void;
    onOpen?: (ws: WebSocket) => void;
    onError?: (error: Event) => void;
    onClose?: () => void;
  }
) {
  return useWebSocket({
    room: patientId,
    clientId: patientId,
    logPrefix: "Patient WS",
    onMessage: options?.onMessage,
    onOpen: options?.onOpen,
    onError: options?.onError,
    onClose: options?.onClose,
  });
}

function useDashboardWebSocket(patientId: string) {
  const debounceTimer = useRef<number | null>(null);

  const handleOpen = useCallback(
    (ws: WebSocket) => {
      ws.send(createWSMessage("status", patientId, undefined, "online"));
    },
    [patientId]
  );

  const { send: sendImmediate, ...rest } = useWebSocket({
    room: "dashboard",
    clientId: patientId,
    logPrefix: "Dashboard WS",
    onOpen: handleOpen,
  });

  const sendDebounced = useCallback(
    (message: string) => {
      if (debounceTimer.current) {
        window.clearTimeout(debounceTimer.current);
      }

      debounceTimer.current = window.setTimeout(() => {
        sendImmediate(message);
        debounceTimer.current = null;
      }, DASHBOARD_SUMMARY_DEBOUNCE);
    },
    [sendImmediate]
  );

  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        window.clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return { sendImmediate, sendDebounced, ...rest };
}

function useStaffDashboard() {
  const [patients, setPatients] = useState<Record<string, PatientInfo>>({});

  const staffId = useMemo(() => {
    if (typeof window === "undefined") return "staff-ssr";

    const storedId = sessionStorage.getItem("staffId");
    if (storedId) return storedId;

    const newId =
      crypto && typeof crypto.randomUUID === "function"
        ? `staff-${crypto.randomUUID()}`
        : `staff-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    sessionStorage.setItem("staffId", newId);
    return newId;
  }, []);

  const handleDashboardMessage = useCallback((event: MessageEvent) => {
    try {
      const msg: WebSocketMessage = JSON.parse(event.data);

      if (msg.type === "initialState" && Array.isArray(msg.payload)) {
        const initialPatients: Record<string, PatientInfo> = {};

        msg.payload.forEach((patient: any) => {
          initialPatients[patient.clientId] = {
            summary: patient.summary || {},
            isLiveConnected: false,
            status: patient.status || "online",
            lastActivity: patient.lastActivity || Date.now(),
          };
        });

        setPatients(initialPatients);
        return;
      }

      if (msg.type === "summary" && msg.clientId) {
        setPatients((prev) => ({
          ...prev,
          [msg.clientId]: {
            summary: msg.payload as PatientSummary,
            isLiveConnected: prev[msg.clientId]?.isLiveConnected,
            status: prev[msg.clientId]?.status || "online",
            lastActivity: Date.now(),
          },
        }));
      }

      if (msg.type === "status" && msg.clientId && msg.state) {
        const validStatuses = ["online", "updating", "idle", "disconnected"];
        if (validStatuses.includes(msg.state)) {
          setPatients((prev) => ({
            ...prev,
            [msg.clientId]: {
              summary: prev[msg.clientId]?.summary || {},
              isLiveConnected: prev[msg.clientId]?.isLiveConnected,
              status: msg.state as PatientStatus,
              lastActivity: Date.now(),
            },
          }));
        }
      }

      if (msg.type === "patientConnected" && msg.clientId) {
        setPatients((prev) => ({
          ...prev,
          [msg.clientId]: {
            summary: prev[msg.clientId]?.summary || {},
            isLiveConnected: prev[msg.clientId]?.isLiveConnected,
            status: "online",
            lastActivity: Date.now(),
          },
        }));
      }

      if (msg.type === "patientDisconnected" && msg.clientId) {
        setPatients((prev) => ({
          ...prev,
          [msg.clientId]: {
            ...prev[msg.clientId],
            status: "disconnected",
            lastActivity: prev[msg.clientId]?.lastActivity || Date.now(),
          },
        }));
      }

      if (msg.type === "patientRemoved" && msg.clientId) {
        setPatients((prev) => {
          const updated = { ...prev };
          delete updated[msg.clientId];
          return updated;
        });
      }
    } catch (err) {
      console.error(
        "[Staff Dashboard Handler] Error handling dashboard message:",
        err
      );
    }
  }, []);

  useWebSocket({
    room: "dashboard",
    clientId: staffId,
    logPrefix: "Staff Dashboard",
    onMessage: handleDashboardMessage,
  });

  return { patients };
}

function usePatientLiveConnections() {
  const socketsRef = useRef<Record<string, WebSocket>>({});

  const connectToPatient = useCallback(
    (
      patientId: string,
      onUpdate: (
        patientId: string,
        data: PatientSummary,
        timestamp: number
      ) => void
    ) => {
      if (socketsRef.current[patientId]) return;

      const ws = connectWS(patientId);
      socketsRef.current[patientId] = ws;

      ws.onmessage = (e) => {
        try {
          const msg: WebSocketMessage = JSON.parse(e.data);

          if (
            msg.type === "formSnapshot" ||
            msg.type === "submit" ||
            msg.type === "formUpdate"
          ) {
            onUpdate(
              patientId,
              msg.payload as PatientSummary,
              msg.timestamp || Date.now()
            );
          }
        } catch (err) {
          console.error(
            "[Patient Live Connections] Error handling patient live message:",
            err
          );
        }
      };

      ws.onclose = () => {
        delete socketsRef.current[patientId];
      };
    },
    []
  );

  const disconnectFromPatient = useCallback((patientId: string) => {
    const ws = socketsRef.current[patientId];
    if (ws) {
      ws.close();
      delete socketsRef.current[patientId];
    }
  }, []);

  const disconnectAll = useCallback(() => {
    Object.keys(socketsRef.current).forEach((patientId) => {
      socketsRef.current[patientId]?.close();
    });
    socketsRef.current = {};
  }, []);

  useEffect(() => {
    return () => {
      disconnectAll();
    };
  }, [disconnectAll]);

  return { connectToPatient, disconnectFromPatient, disconnectAll };
}

export {
  useWebSocket,
  createWSMessage,
  usePatientWebSocket,
  useDashboardWebSocket,
  useStaffDashboard,
  usePatientLiveConnections,
};

export type {
  PatientSummary,
  PatientInfo,
  WebSocketMessage,
  PatientStatus,
  ActivePatientStatus,
};
