export function connectWS(room: string, clientId?: string) {
  const base =
    process.env.NEXT_PUBLIC_WS_URL ||
    (typeof window !== "undefined"
      ? `${window.location.protocol === "https:" ? "wss" : "ws"}://${
          window.location.host
        }`
      : "ws://localhost:4000");
  // ensure no trailing slash
  const url = new URL(base.replace(/\/$/, ""));
  // some hosts (like Render) already include host+port; ensure we pass room as query param
  url.searchParams.set("room", room);
  if (clientId) url.searchParams.set("clientId", clientId);
  const ws = new WebSocket(url.toString());
  console.log(`WS open ${url.toString()}`);
  return ws;
}
