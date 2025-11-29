export function connectWS(room: string) {
  const url = `${process.env.NEXT_PUBLIC_WS_URL}?room=${room}`;
  const ws = new WebSocket(url);
  return ws;
}
