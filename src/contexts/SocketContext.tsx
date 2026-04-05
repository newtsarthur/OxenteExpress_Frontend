import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { io, type Socket } from "socket.io-client";
import { useAuth } from "@/contexts/AuthContext";
import { TOKEN_KEY, API_BASE_URL } from "@/lib/api";
import {
  SOCKET_EVENTS,
  STORE_ORDER_ALIASES,
  RIDER_PACKAGE_ALIASES,
  CUSTOMER_ORDER_ALIASES,
} from "@/lib/socketEvents";

const SocketCtx = createContext<Socket | null>(null);

const DEBUG = import.meta.env.DEV;

export function SocketProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setSocket((prev) => {
        prev?.disconnect();
        return null;
      });
      if (DEBUG) console.info("[socket] skipped: not authenticated");
      return;
    }

    const token = localStorage.getItem(TOKEN_KEY);
    const url = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';
    const path = import.meta.env.VITE_SOCKET_PATH || "/socket.io";

    if (DEBUG) {
      console.info("[socket] connecting", { url, path, hasToken: !!token, tokenLen: token?.length ?? 0, userId: user.id });
    }

    let s: Socket;
    try {
      s = io(url, {
        path,
        auth: { token: token ?? "" },
        transports: ["polling", "websocket"],
        withCredentials: true,
        reconnectionAttempts: 8,
        reconnectionDelay: 1000,
        timeout: 20000,
      });
    } catch (e) {
      console.error("[socket] falha ao criar cliente (síncrono):", e);
      setSocket(null);
      return;
    }

    const logEvent = (name: string, payload?: unknown) => {
      if (DEBUG) console.info(`[socket] ← ${name}`, payload ?? "");
    };

    s.on("connect", () => {
      if (DEBUG) console.info("[socket] connect", { id: s.id, transport: s.io.engine?.transport?.name });
    });
    s.on("connect_error", (err) => {
      console.error("[socket] connect_error", err.message);
      if (DEBUG && token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1] ?? ""));
          const exp = payload.exp as number | undefined;
          if (exp) console.info("[socket] JWT exp (unix):", exp, "válido:", Date.now() / 1000 < exp);
        } catch {
          console.warn("[socket] não foi possível decodificar JWT para debug");
        }
      }
    });
    s.on("disconnect", (reason) => {
      if (DEBUG) console.warn("[socket] disconnect", reason);
    });

    s.on(SOCKET_EVENTS.STORE_NEW_ORDER, (...args) => logEvent(SOCKET_EVENTS.STORE_NEW_ORDER, args));
    STORE_ORDER_ALIASES.forEach((ev) => s.on(ev, (...args) => logEvent(ev, args)));
    s.on(SOCKET_EVENTS.RIDER_PACKAGES_UPDATED, (...args) => logEvent(SOCKET_EVENTS.RIDER_PACKAGES_UPDATED, args));
    RIDER_PACKAGE_ALIASES.forEach((ev) => s.on(ev, (...args) => logEvent(ev, args)));
    s.on(SOCKET_EVENTS.CUSTOMER_ORDER_STATUS, (...args) => logEvent(SOCKET_EVENTS.CUSTOMER_ORDER_STATUS, args));
    CUSTOMER_ORDER_ALIASES.forEach((ev) => s.on(ev, (...args) => logEvent(ev, args)));

    // Real-time Everywhere: Listeners para atualizações de entidades
    s.on(SOCKET_EVENTS.USER_UPDATED, (...args) => logEvent(SOCKET_EVENTS.USER_UPDATED, args));
    s.on(SOCKET_EVENTS.RIDER_UPDATED, (...args) => logEvent(SOCKET_EVENTS.RIDER_UPDATED, args));
    s.on(SOCKET_EVENTS.PRODUCT_UPDATED, (...args) => logEvent(SOCKET_EVENTS.PRODUCT_UPDATED, args));

    // Stock reservation events
    s.on('stock_reservation_success', (...args) => logEvent('stock_reservation_success', args));
    s.on('stock_reservation_error', (...args) => logEvent('stock_reservation_error', args));

    s.onAny((event, ...args) => {
      if (DEBUG) console.debug("[socket] onAny:", event, args);
    });

    setSocket(s);
    return () => {
      if (DEBUG) console.info("[socket] teardown");
      try {
        s.removeAllListeners();
        s.disconnect();
      } catch (e) {
        console.warn("[socket] erro no teardown:", e);
      }
      setSocket(null);
    };
  }, [isAuthenticated, user?.id]);

  return <SocketCtx.Provider value={socket}>{children}</SocketCtx.Provider>;
}

export function useSocket() {
  return useContext(SocketCtx);
}
