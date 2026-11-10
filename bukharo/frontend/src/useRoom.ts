import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMsg, StateMsg } from "./types";

/** One socket per room. Reconnects with backoff; the server resends full state on every (re)connect. */
export function useRoom(code: string) {
  const [state, setState] = useState<StateMsg | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(false);
  const [denied, setDenied] = useState(false);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    let closed = false, retry = 0, timer = 0;
    const connect = () => {
      const s = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws/rooms/${code}/`);
      ws.current = s;
      s.onopen = () => { retry = 0; setOnline(true); };
      s.onmessage = (e) => {
        const m = JSON.parse(e.data);
        if (m.type === "STATE") setState(m as StateMsg);
        else if (m.type === "ERROR") setError(m.message as string);
        else if (m.type === "CHAT") setChat(prev => [...prev.slice(-199), { from: m.from, text: m.text, at: Date.now() }]);
      };
      s.onclose = (ev) => {
        setOnline(false);
        if (ev.code === 4401 || ev.code === 4403) { setDenied(true); return; }
        if (!closed) timer = window.setTimeout(connect, Math.min(1000 * 2 ** retry++, 8000));
      };
    };
    connect();
    return () => { closed = true; clearTimeout(timer); ws.current?.close(); };
  }, [code]);

  const send = useCallback((action: object) => {
    if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify(action));
  }, []);

  const sendChat = useCallback((text: string) => {
    const t = text.trim();
    if (t && ws.current?.readyState === WebSocket.OPEN)
      ws.current.send(JSON.stringify({ type: "CHAT", text: t }));
  }, []);

  const clearError = useCallback(() => setError(null), []);
  return { state, error, online, denied, send, clearError, chat, sendChat };
}
