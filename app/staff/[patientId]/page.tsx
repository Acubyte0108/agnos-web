"use client";

import { useEffect, useState } from "react";
import { connectWS } from "@/lib/ws";

export default function StaffPatientView({ params }: { params: { patientId: string } }) {
  const { patientId } = params;

  const [data, setData] = useState({});

  useEffect(() => {
    const ws = connectWS(patientId);

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "formUpdate") {
        setData(msg.payload);
      }
    };

    return () => ws.close();
  }, [patientId]);

  return (
    <div>
      <h1 className="text-2xl mb-4 font-semibold">Live View: {patientId}</h1>

      <pre className="p-4 bg-gray-100 rounded text-sm">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}