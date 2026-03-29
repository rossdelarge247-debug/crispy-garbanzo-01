"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { RiskSettings } from "@/types";
import SectionHeader from "@/components/SectionHeader";

// ---------------------------------------------------------------------------
// API Connectivity Panel
// ---------------------------------------------------------------------------
interface ProviderStatus {
  name: string;
  provider: string;
  status: "live" | "mock" | "error";
  description: string;
  docsUrl: string;
  envVar: string;
}

function ApiConnectivityPanel() {
  const [providers, setProviders] = useState<ProviderStatus[] | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchStatus() {
    setLoading(true);
    try {
      const res = await fetch("/api/status");
      const data = await res.json();
      setProviders(data.providers);
      setCheckedAt(data.checkedAt);
    } catch {
      setProviders(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchStatus();
  }, []);

  const statusIcon = (status: ProviderStatus["status"]) => {
    switch (status) {
      case "live": return "●";
      case "mock": return "○";
      case "error": return "✕";
    }
  };

  const statusColor = (status: ProviderStatus["status"]) => {
    switch (status) {
      case "live": return "text-conviction-high";
      case "mock": return "text-text-muted";
      case "error": return "text-conviction-danger";
    }
  };

  const statusLabel = (status: ProviderStatus["status"]) => {
    switch (status) {
      case "live": return "Live";
      case "mock": return "Demo";
      case "error": return "Error";
    }
  };

  const liveCount = providers?.filter(p => p.status === "live").length ?? 0;
  const totalCount = providers?.length ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          {providers && (
            <p className="text-xs font-bold text-text-muted">
              {liveCount}/{totalCount} providers connected
            </p>
          )}
        </div>
        <button
          onClick={fetchStatus}
          disabled={loading}
          className="text-xs font-bold text-text-muted hover:text-text-primary transition-colors duration-300 disabled:opacity-50"
        >
          {loading ? "Checking..." : "Recheck"}
        </button>
      </div>

      {providers ? (
        <div className="space-y-0">
          {providers.map((p) => (
            <div key={p.name} className="flex items-center gap-3 border-b border-surface-border py-3">
              <span className={`text-lg shrink-0 ${statusColor(p.status)}`}>
                {statusIcon(p.status)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-text-primary">{p.name}</span>
                  <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                    p.status === "live"
                      ? "bg-conviction-high/10 text-conviction-high"
                      : p.status === "error"
                        ? "bg-conviction-danger/10 text-conviction-danger"
                        : "bg-surface-overlay text-text-muted"
                  }`}>
                    {statusLabel(p.status)}
                  </span>
                  <span className="text-xs font-bold text-text-muted">
                    {p.provider}
                  </span>
                </div>
                <p className="text-xs text-text-secondary mt-0.5">{p.description}</p>
              </div>
              <a
                href={p.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-xs font-bold text-text-muted hover:text-text-primary transition-colors duration-300"
              >
                Docs →
              </a>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-text-muted">Unable to check provider status.</p>
      )}

      {checkedAt && (
        <p className="text-xs text-text-muted mt-3">
          Last checked: {new Date(checkedAt).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}

const defaultSettings: RiskSettings = {
  minConvictionThreshold: 60,
  minTestPassThreshold: 50,
  perTradeRiskPercent: 2.0,
  maxDailyLossPercent: 5.0,
  maxWeeklyLossPercent: 10.0,
  maxConcurrentPositions: 5,
  autonomousModeEnabled: false,
  manualApprovalRequired: true,
  eventBlackoutEnabled: true,
  killSwitchActive: false,
  staleDataProtectionMinutes: 30,
  alertsEnabled: true,
};

function SliderInput({
  label,
  description,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3">
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-text-primary">{label}</span>
        <p className="text-xs text-text-muted mt-0.5">{description}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-32 accent-accent"
        />
        <span className="text-sm font-mono text-text-primary w-14 text-right">
          {value}{suffix}
        </span>
      </div>
    </div>
  );
}

function NumberInput({
  label,
  description,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3">
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-text-primary">{label}</span>
        <p className="text-xs text-text-muted mt-0.5">{description}</p>
      </div>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-20 rounded-lg border border-surface-border bg-surface-raised px-3 py-1.5 text-sm font-mono text-text-primary text-right focus:border-accent focus:outline-none transition-colors"
      />
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  variant,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  variant?: "danger";
  onChange: (v: boolean) => void;
}) {
  const activeColor = variant === "danger" ? "bg-conviction-danger" : "bg-accent";

  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-text-primary">{label}</span>
        <p className="text-xs text-text-muted mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-300",
          checked ? activeColor : "bg-surface-border"
        )}
      >
        <span
          className={cn(
            "inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-300 mt-0.5",
            checked ? "translate-x-5 ml-0.5" : "translate-x-0.5"
          )}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<RiskSettings>(defaultSettings);
  const [saved, setSaved] = useState(false);

  function update<K extends keyof RiskSettings>(key: K, value: RiskSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    // In production: persist to backend
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="animate-fade-in">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm font-bold text-text-muted hover:text-text-primary transition-colors duration-300 mb-6"
      >
        ← Dashboard
      </Link>

      <header className="mb-8 pb-4 border-b border-surface-border">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary mb-2">
          Settings
        </h1>
        <p className="text-sm text-text-secondary max-w-2xl">
          API connections, risk limits, and execution controls.
        </p>
      </header>

      <div className="space-y-8">
        {/* API Connectivity */}
        <section className="rounded-2xl shadow-card bg-surface-raised p-5">
          <SectionHeader
            title="API Connectivity"
            subtitle="Live status of data providers and execution services"
          />
          <ApiConnectivityPanel />
        </section>

        {/* Conviction Thresholds */}
        <section className="rounded-2xl shadow-card bg-surface-raised p-5">
          <SectionHeader
            title="Conviction Thresholds"
            subtitle="Minimum scores required before the system suggests action"
          />
          <div className="divide-y divide-surface-border">
            <SliderInput
              label="Minimum conviction score"
              description="Flags below this score will not suggest trade plans"
              value={settings.minConvictionThreshold}
              min={0}
              max={100}
              step={5}
              suffix="%"
              onChange={(v) => update("minConvictionThreshold", v)}
            />
            <SliderInput
              label="Minimum test pass rate"
              description="Hypotheses must pass this % of tests before trade plan generation"
              value={settings.minTestPassThreshold}
              min={0}
              max={100}
              step={5}
              suffix="%"
              onChange={(v) => update("minTestPassThreshold", v)}
            />
          </div>
        </section>

        {/* Risk Limits */}
        <section className="rounded-2xl shadow-card bg-surface-raised p-5">
          <SectionHeader
            title="Risk Limits"
            subtitle="Maximum exposure and drawdown limits"
          />
          <div className="divide-y divide-surface-border">
            <SliderInput
              label="Per-trade risk"
              description="Maximum capital at risk for any single trade"
              value={settings.perTradeRiskPercent}
              min={0.5}
              max={10}
              step={0.5}
              suffix="%"
              onChange={(v) => update("perTradeRiskPercent", v)}
            />
            <SliderInput
              label="Max daily loss"
              description="Trading pauses if daily loss exceeds this threshold"
              value={settings.maxDailyLossPercent}
              min={1}
              max={20}
              step={1}
              suffix="%"
              onChange={(v) => update("maxDailyLossPercent", v)}
            />
            <SliderInput
              label="Max weekly loss"
              description="Trading pauses if weekly loss exceeds this threshold"
              value={settings.maxWeeklyLossPercent}
              min={2}
              max={30}
              step={1}
              suffix="%"
              onChange={(v) => update("maxWeeklyLossPercent", v)}
            />
            <NumberInput
              label="Max concurrent positions"
              description="Maximum number of open trades at once"
              value={settings.maxConcurrentPositions}
              min={1}
              max={20}
              onChange={(v) => update("maxConcurrentPositions", v)}
            />
          </div>
        </section>

        {/* Execution Controls */}
        <section className="rounded-2xl shadow-card bg-surface-raised p-5">
          <SectionHeader
            title="Execution Controls"
            subtitle="How trades are approved and executed"
          />
          <div className="divide-y divide-surface-border">
            <Toggle
              label="Manual approval required"
              description="Every trade must be explicitly approved before execution"
              checked={settings.manualApprovalRequired}
              onChange={(v) => update("manualApprovalRequired", v)}
            />
            <Toggle
              label="Autonomous mode"
              description="Allow the system to execute trades automatically within risk limits"
              checked={settings.autonomousModeEnabled}
              onChange={(v) => update("autonomousModeEnabled", v)}
            />
            <Toggle
              label="Event blackout"
              description="Pause trading around major scheduled economic events"
              checked={settings.eventBlackoutEnabled}
              onChange={(v) => update("eventBlackoutEnabled", v)}
            />
          </div>
        </section>

        {/* Safety */}
        <section className="rounded-2xl shadow-card bg-surface-raised p-5">
          <SectionHeader
            title="Safety"
            subtitle="Emergency controls and data protection"
          />
          <div className="divide-y divide-surface-border">
            <Toggle
              label="Kill switch"
              description="Immediately halt all trading activity and close open positions"
              checked={settings.killSwitchActive}
              variant="danger"
              onChange={(v) => update("killSwitchActive", v)}
            />
            <NumberInput
              label="Stale data protection (minutes)"
              description="Pause trading if market data is older than this threshold"
              value={settings.staleDataProtectionMinutes}
              min={5}
              max={120}
              onChange={(v) => update("staleDataProtectionMinutes", v)}
            />
            <Toggle
              label="Alerts enabled"
              description="Receive notifications for flag changes, trade executions, and risk events"
              checked={settings.alertsEnabled}
              onChange={(v) => update("alertsEnabled", v)}
            />
          </div>
        </section>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3 mt-8 mb-4">
        <button
          onClick={handleSave}
          className="inline-flex items-center px-6 py-2.5 bg-accent text-accent-dark text-sm font-bold rounded-full hover:shadow-lift transition-all duration-300"
        >
          Save settings
        </button>
        {saved && (
          <span className="text-sm text-conviction-high animate-fade-in">
            Settings saved
          </span>
        )}
      </div>
    </div>
  );
}
