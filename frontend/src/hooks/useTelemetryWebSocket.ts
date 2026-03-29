import { useEffect, useRef, useCallback } from 'react';
import { ConnectionStatus, WsFrame, useTelemetryStore } from '../store/useTelemetryStore';

const getWsBase = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.trim() !== '') {
    return envUrl.replace(/^http/, 'ws');
  }
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}`;
  }
  return 'ws://localhost:7860';
};
const WS_BASE = getWsBase();

export function useTelemetryWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryDelayMs = useRef(1_000);
  const mountedRef = useRef(true);

  const { setStatus, ingest, reset } = useTelemetryStore.getState();

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    setStatus('CONNECTING');
    const ws = new WebSocket(`${WS_BASE}/ws/telemetry`);
    wsRef.current = ws;

    ws.onopen = () => {
      retryDelayMs.current = 1_000;
      setStatus('CALIBRATING');
    };

    ws.onmessage = (evt) => {
      try {
        ingest(JSON.parse(evt.data) as WsFrame);
      } catch {}
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      setStatus('LOST');
      retryRef.current = setTimeout(() => {
        retryDelayMs.current = Math.min(retryDelayMs.current * 2, 30_000);
        connect();
      }, retryDelayMs.current);
    };

    ws.onerror = () => ws.close();
  }, [setStatus, ingest]);

  useEffect(() => {
    mountedRef.current = true;
    reset();
    connect();
    return () => {
      mountedRef.current = false;
      wsRef.current?.close();
      if (retryRef.current) clearTimeout(retryRef.current);
    };
  }, [connect, reset]);
}
