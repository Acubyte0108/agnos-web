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

// Active patient statuses (what the patient can be while connected)
type ActivePatientStatus = "online" | "updating" | "idle";

// All patient statuses (includes disconnected for staff view)
type PatientStatus = ActivePatientStatus | "disconnected";

type PatientInfo = {
  summary: PatientSummary;
  ts: number;
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

  useEffect(() => {
    if (!clientId) return;

    const ws = connectWS(room, clientId);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log(`[${logPrefix}] Connected to room: ${room}`);
      onOpen?.(ws);
    };

    ws.onerror = (error) => {
      console.error(`[${logPrefix}] Error:`, error);
      onError?.(error);
    };

    ws.onclose = () => {
      console.log(`[${logPrefix}] Disconnected`);
      onClose?.();
    };

    if (onMessage) {
      ws.onmessage = onMessage;
    }

    return () => {
      ws.close();
    };
  }, [room, clientId, onOpen, onMessage, onError, onClose, logPrefix]);

  const send = useCallback(
    (message: string) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(message);
      } else {
        console.warn(`[${logPrefix}] Cannot send - WebSocket not open`);
      }
    },
    [logPrefix]
  );

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

  // Memoize the onOpen callback so it doesn't change on every render
  const handleOpen = useCallback(
    (ws: WebSocket) => {
      // Send initial presence when connected
      ws.send(createWSMessage("status", patientId, undefined, "online"));
    },
    [patientId]
  ); // Only recreate if patientId changes

  const { send: sendImmediate, ...rest } = useWebSocket({
    room: "dashboard",
    clientId: patientId,
    logPrefix: "Dashboard WS",
    onOpen: handleOpen, // Use the memoized callback
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

  // Cleanup timer on unmount
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

  // Generate staff ID synchronously
  const staffId = useMemo(() => {
    if (typeof window === "undefined") return "staff-ssr";
    
    const storedId = sessionStorage.getItem("staffId");
    if (storedId) {
      console.log("[Staff Dashboard] Using stored staff ID:", storedId);
      return storedId;
    }
    
    const newId =
      crypto && typeof crypto.randomUUID === "function"
        ? `staff-${crypto.randomUUID()}`
        : `staff-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    
    sessionStorage.setItem("staffId", newId);
    console.log("[Staff Dashboard] Generated new staff ID:", newId);
    return newId;
  }, []);

  const handleDashboardMessage = useCallback((event: MessageEvent) => {
    try {
      const msg: WebSocketMessage = JSON.parse(event.data);
      console.log("[Staff Dashboard] Received message:", msg.type, msg);

      // Handle initial state (list of patients in dashboard snapshot)
      if (msg.type === "initialState" && Array.isArray(msg.payload)) {
        const initialPatients: Record<string, PatientInfo> = {};

        msg.payload.forEach((patient: any) => {
          initialPatients[patient.clientId] = {
            summary: patient.summary || {},
            ts: patient.lastActivity || Date.now(),
            isLiveConnected: false,
            status: patient.status || "online",
            lastActivity: patient.lastActivity || Date.now(),
          };
        });

        setPatients(initialPatients);
        console.log(
          `[Staff Dashboard] Loaded ${msg.payload.length} active patients`,
          initialPatients
        );
        return;
      }

      // Handle summary updates (form data)
      if (msg.type === "summary" && msg.clientId) {
        console.log(
          "[Staff Dashboard] Summary update for:",
          msg.clientId,
          msg.payload
        );

        setPatients((prev) => ({
          ...prev,
          [msg.clientId]: {
            summary: msg.payload as PatientSummary,
            ts: msg.timestamp || Date.now(),
            isLiveConnected: prev[msg.clientId]?.isLiveConnected,
            status: prev[msg.clientId]?.status || "online",
            lastActivity: Date.now(),
          },
        }));
      }

      // Handle status updates
      if (msg.type === "status" && msg.clientId && msg.state) {
        console.log(
          "[Staff Dashboard] Status update:",
          msg.clientId,
          msg.state
        );
        const validStatuses = ["online", "updating", "idle", "disconnected"];
        if (validStatuses.includes(msg.state)) {
          setPatients((prev) => ({
            ...prev,
            [msg.clientId]: {
              summary: prev[msg.clientId]?.summary || {},
              ts: msg.timestamp || Date.now(),
              isLiveConnected: prev[msg.clientId]?.isLiveConnected,
              status: msg.state as PatientStatus,
              lastActivity: Date.now(),
            },
          }));
        }
      }

      // Handle patient connected
      if (msg.type === "patientConnected" && msg.clientId) {
        console.log("[Staff Dashboard] Patient connected:", msg.clientId);

        setPatients((prev) => ({
          ...prev,
          [msg.clientId]: {
            summary: prev[msg.clientId]?.summary || {},
            ts: msg.timestamp || Date.now(),
            isLiveConnected: prev[msg.clientId]?.isLiveConnected,
            status: "online",
            lastActivity: Date.now(),
          },
        }));
      }

      // Handle patient disconnected
      if (msg.type === "patientDisconnected" && msg.clientId) {
        console.log("[Staff Dashboard] Patient disconnected:", msg.clientId);

        setPatients((prev) => ({
          ...prev,
          [msg.clientId]: {
            ...prev[msg.clientId],
            ts: msg.timestamp || Date.now(),
            status: "disconnected",
            lastActivity: prev[msg.clientId]?.lastActivity || Date.now(),
          },
        }));
      }

      // NEW: Handle patient removed (server tells us to remove it)
      if (msg.type === "patientRemoved" && msg.clientId) {
        console.log("[Staff Dashboard] Patient removed:", msg.clientId);

        setPatients((prev) => {
          const updated = { ...prev };
          delete updated[msg.clientId];
          return updated;
        });
      }
    } catch (err) {
      console.warn("[Staff Dashboard] Invalid message:", err);
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
      // Don't reconnect if already connected
      if (socketsRef.current[patientId]) {
        console.log(`[Patient Live] Already connected to ${patientId}`);
        return;
      }

      const ws = connectWS(patientId);
      socketsRef.current[patientId] = ws;

      ws.onopen = () => {
        console.log(`[Patient Live] Connected to ${patientId}`);
      };

      ws.onmessage = (e) => {
        try {
          const msg: WebSocketMessage = JSON.parse(e.data);

          // Handle full snapshots and updates
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
          console.warn(
            `[Patient Live] Invalid message from ${patientId}:`,
            err
          );
        }
      };

      ws.onerror = (error) => {
        console.error(`[Patient Live] Error with ${patientId}:`, error);
      };

      ws.onclose = () => {
        console.log(`[Patient Live] Disconnected from ${patientId}`);
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

  // Cleanup all connections on unmount
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
