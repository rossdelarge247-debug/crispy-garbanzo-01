"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getAlerts, markAlertRead, markAllRead, type Alert } from "@/lib/alerts";

const TYPE_LABELS: Record<string, string> = {
  regime_shift: "Regime",
  setup_formed: "Setup",
  event_imminent: "Event",
  risk: "Risk",
};

const TYPE_COLORS: Record<string, string> = {
  regime_shift: "text-[--accent]",
  setup_formed: "text-[--green]",
  event_imminent: "text-[--amber]",
  risk: "text-[--red]",
};

function AlertCard({ alert, onRead }: { alert: Alert; onRead: () => void }) {
  return (
    <div
      className={`rounded-lg p-3 transition-colors ${alert.read ? "bg-[--surface-raised]" : "bg-[--surface-raised]"}`}
      onClick={() => { if (!alert.read) { markAlertRead(alert.id); onRead(); } }}
    >
      <div className="flex items-center gap-2 mb-0.5">
        <span className={`text-2xs font-bold ${TYPE_COLORS[alert.type] ?? "text-[--text-muted]"}`}>
          {TYPE_LABELS[alert.type] ?? alert.type}
        </span>
        <span className="text-2xs text-[--text-muted]">{alert.instrumentName}</span>
        {!alert.read && <span className="w-1.5 h-1.5 rounded-full bg-[--accent] ml-auto shrink-0" />}
        <span className="text-2xs text-[--text-muted] ml-auto">{timeAgo(alert.createdAt)}</span>
      </div>
      <p className="text-xs font-medium text-[--text-primary]">{alert.title}</p>
      <p className="text-2xs text-[--text-secondary]">{alert.detail}</p>
    </div>
  );
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60000) return "now";
  if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
  if (ms < 86400000) return `${Math.round(ms / 3600000)}h`;
  return `${Math.round(ms / 86400000)}d`;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  function refresh() { setAlerts(getAlerts()); }
  useEffect(() => { refresh(); }, []);

  const unread = alerts.filter(a => !a.read).length;

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-light text-[--text-primary] tracking-tight">Alerts</h1>
          {unread > 0 && <span className="text-2xs font-bold bg-[--accent] text-white px-1.5 py-0.5 rounded">{unread}</span>}
        </div>
        <div className="flex gap-3">
          {unread > 0 && <button onClick={() => { markAllRead(); refresh(); }} className="text-2xs text-[--text-muted]">Mark all read</button>}
          <Link href="/dashboard" className="text-xs text-[--text-muted]">&larr; Dashboard</Link>
        </div>
      </div>

      {alerts.length > 0 ? (
        <div className="space-y-1.5">
          {alerts.map(a => <AlertCard key={a.id} alert={a} onRead={refresh} />)}
        </div>
      ) : (
        <div className="rounded-lg bg-[--surface-raised] p-5 text-center">
          <p className="text-sm text-[--text-secondary]">No alerts yet.</p>
          <p className="text-xs text-[--text-muted] mt-1">Alerts are generated when regimes shift, setups form, or events approach.</p>
        </div>
      )}
    </div>
  );
}
