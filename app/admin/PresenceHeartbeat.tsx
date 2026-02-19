"use client";
import { useEffect } from "react";

export default function PresenceHeartbeat() {
  useEffect(() => {
    const ping = () => fetch("/api/presence/heartbeat", { method: "POST" }).catch(() => {});
    ping();

    const t = setInterval(ping, 60_000); // كل 60 ثانية
    const onVis = () => document.visibilityState === "visible" && ping();
    document.addEventListener("visibilitychange", onVis);

    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return null;
}
