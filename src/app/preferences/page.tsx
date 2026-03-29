"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CATEGORY_LABELS,
  ASSET_PRESETS,
  type FocusAsset,
  type UserPreferences,
  loadPreferences,
  savePreferences,
  clearPreferences,
} from "@/lib/preferences";

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function PreferencesPage() {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);

  // Preferences state
  const [focusAssets, setFocusAssets] = useState<FocusAsset[]>([]);
  const [experienceLevel, setExperienceLevel] =
    useState<UserPreferences["experienceLevel"]>("balanced");
  const [proactiveLevel, setProactiveLevel] =
    useState<UserPreferences["proactiveLevel"]>("suggest");
  const [riskStyle, setRiskStyle] =
    useState<UserPreferences["riskStyle"]>("balanced");
  const [notifications, setNotifications] = useState({
    dailyBriefing: true,
    eventAlerts: true,
    tradeSetupAlerts: true,
    invalidationAlerts: false,
  });

  // Add-assets panel
  const [showAddAssets, setShowAddAssets] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("forex");

  // Toast
  const [showToast, setShowToast] = useState(false);

  // Load preferences on mount
  useEffect(() => {
    const prefs = loadPreferences();
    setFocusAssets(prefs.focusAssets);
    setExperienceLevel(prefs.experienceLevel);
    setProactiveLevel(prefs.proactiveLevel);
    setRiskStyle(prefs.riskStyle);
    setNotifications(prefs.notifications);
    setLoaded(true);
  }, []);

  // Helpers
  const removeAsset = (symbol: string) => {
    setFocusAssets((prev) => prev.filter((a) => a.symbol !== symbol));
  };

  const toggleAsset = (asset: FocusAsset) => {
    setFocusAssets((prev) => {
      const exists = prev.some((a) => a.symbol === asset.symbol);
      return exists
        ? prev.filter((a) => a.symbol !== asset.symbol)
        : [...prev, asset];
    });
  };

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    const prefs = loadPreferences();
    const updated: UserPreferences = {
      ...prefs,
      focusAssets,
      experienceLevel,
      proactiveLevel,
      riskStyle,
      notifications,
    };
    savePreferences(updated);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const handleReset = () => {
    clearPreferences();
    router.push("/onboarding");
  };

  if (!loaded) return null;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-surface-DEFAULT">
      <div className="mx-auto max-w-2xl px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            &larr; Home
          </Link>
          <h1 className="text-2xl font-bold text-text-primary mt-3">
            Your preferences
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Customize what Trade Daddy watches for you
          </p>
        </div>

        <div className="space-y-6">
          {/* ----------------------------------------------------------------- */}
          {/* Section 1: Focus Universe */}
          {/* ----------------------------------------------------------------- */}
          <section className="rounded-xl border border-surface-border bg-surface-raised p-5">
            <h2 className="text-lg font-semibold text-text-primary mb-3">
              Focus Universe
            </h2>

            {/* Current assets as removable chips */}
            <div className="flex flex-wrap gap-2 mb-4">
              {focusAssets.length === 0 && (
                <span className="text-sm text-text-muted">
                  No assets selected yet.
                </span>
              )}
              {focusAssets.map((asset) => (
                <span
                  key={asset.symbol}
                  className="inline-flex items-center gap-1.5 bg-surface-overlay rounded-lg px-3 py-1.5 text-sm text-text-primary"
                >
                  {asset.symbol}
                  <button
                    onClick={() => removeAsset(asset.symbol)}
                    className="text-text-muted hover:text-text-primary transition-colors"
                    aria-label={`Remove ${asset.symbol}`}
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>

            {/* Add assets toggle */}
            {!showAddAssets ? (
              <button
                onClick={() => setShowAddAssets(true)}
                className="text-sm font-medium text-accent hover:text-accent-dim transition-colors"
              >
                + Add assets
              </button>
            ) : (
              <div className="mt-2">
                {/* Category tabs */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {Object.entries(CATEGORY_LABELS).map(([key, { label, emoji }]) => (
                    <button
                      key={key}
                      onClick={() => setActiveCategory(key)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        activeCategory === key
                          ? "bg-accent text-white"
                          : "bg-surface-overlay text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      {emoji} {label}
                    </button>
                  ))}
                </div>

                {/* Asset chips for active category */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {(ASSET_PRESETS[activeCategory] ?? []).map((asset) => {
                    const selected = focusAssets.some(
                      (a) => a.symbol === asset.symbol
                    );
                    return (
                      <button
                        key={asset.symbol}
                        onClick={() => toggleAsset(asset)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                          selected
                            ? "bg-accent text-white"
                            : "bg-surface-overlay text-text-secondary hover:text-text-primary"
                        }`}
                      >
                        {asset.symbol}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setShowAddAssets(false)}
                  className="text-sm text-text-muted hover:text-text-secondary transition-colors"
                >
                  Close
                </button>
              </div>
            )}
          </section>

          {/* ----------------------------------------------------------------- */}
          {/* Section 2: Experience Level */}
          {/* ----------------------------------------------------------------- */}
          <section className="rounded-xl border border-surface-border bg-surface-raised p-5">
            <h2 className="text-lg font-semibold text-text-primary mb-3">
              Experience Level
            </h2>
            <div className="space-y-3">
              {([
                {
                  value: "simple" as const,
                  title: "Simple",
                  desc: "Just tell me what to do. Keep it short.",
                },
                {
                  value: "balanced" as const,
                  title: "Balanced",
                  desc: "Give me context but don't overwhelm me.",
                },
                {
                  value: "advanced" as const,
                  title: "Advanced",
                  desc: "Show me everything. I can handle it.",
                },
              ]).map((opt) => {
                const selected = experienceLevel === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setExperienceLevel(opt.value)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      selected
                        ? "border-accent bg-accent/10"
                        : "border-surface-border bg-surface-raised hover:bg-surface-hover"
                    }`}
                  >
                    <span className="font-semibold text-text-primary block">
                      {opt.title}
                    </span>
                    <span className="text-sm text-text-secondary">
                      {opt.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ----------------------------------------------------------------- */}
          {/* Section 3: Risk Style */}
          {/* ----------------------------------------------------------------- */}
          <section className="rounded-xl border border-surface-border bg-surface-raised p-5">
            <h2 className="text-lg font-semibold text-text-primary mb-3">
              Risk Style
            </h2>
            <div className="space-y-3">
              {([
                {
                  value: "cautious" as const,
                  title: "Cautious",
                  desc: "Small positions. I'd rather miss a trade than take a bad one.",
                },
                {
                  value: "balanced" as const,
                  title: "Balanced",
                  desc: "Reasonable risk for reasonable reward.",
                },
                {
                  value: "aggressive" as const,
                  title: "Aggressive",
                  desc: "I'm comfortable with bigger swings for bigger potential.",
                },
              ]).map((opt) => {
                const selected = riskStyle === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setRiskStyle(opt.value)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      selected
                        ? "border-accent bg-accent/10"
                        : "border-surface-border bg-surface-raised hover:bg-surface-hover"
                    }`}
                  >
                    <span className="font-semibold text-text-primary block">
                      {opt.title}
                    </span>
                    <span className="text-sm text-text-secondary">
                      {opt.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ----------------------------------------------------------------- */}
          {/* Section 4: Notifications */}
          {/* ----------------------------------------------------------------- */}
          <section className="rounded-xl border border-surface-border bg-surface-raised p-5">
            <h2 className="text-lg font-semibold text-text-primary mb-3">
              Notifications
            </h2>
            <div className="space-y-3">
              {([
                { key: "dailyBriefing" as const, label: "Daily briefing" },
                { key: "eventAlerts" as const, label: "Event alerts" },
                { key: "tradeSetupAlerts" as const, label: "Trade setup alerts" },
                { key: "invalidationAlerts" as const, label: "Invalidation alerts" },
              ]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => toggleNotification(key)}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-surface-border bg-surface-raised hover:bg-surface-hover transition-all"
                >
                  <span className="font-medium text-text-primary">{label}</span>
                  <span
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      notifications[key] ? "bg-accent" : "bg-surface-overlay"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                        notifications[key] ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* ----------------------------------------------------------------- */}
          {/* Section 5: Proactive Level */}
          {/* ----------------------------------------------------------------- */}
          <section className="rounded-xl border border-surface-border bg-surface-raised p-5">
            <h2 className="text-lg font-semibold text-text-primary mb-3">
              Proactive Level
            </h2>
            <div className="space-y-3">
              {([
                {
                  value: "explain" as const,
                  title: "Explain",
                  desc: "Just explain what's happening. I'll decide.",
                },
                {
                  value: "suggest" as const,
                  title: "Suggest",
                  desc: "Point out opportunities and let me choose.",
                },
                {
                  value: "plan" as const,
                  title: "Plan",
                  desc: "Build trade plans I can review and approve.",
                },
                {
                  value: "paper" as const,
                  title: "Paper trade",
                  desc: "Simulate trades so I can learn without risk.",
                },
                {
                  value: "live" as const,
                  title: "Prepare for live",
                  desc: "Help me get ready for real execution.",
                },
              ]).map((opt) => {
                const selected = proactiveLevel === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setProactiveLevel(opt.value)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      selected
                        ? "border-accent bg-accent/10"
                        : "border-surface-border bg-surface-raised hover:bg-surface-hover"
                    }`}
                  >
                    <span className="font-semibold text-text-primary block">
                      {opt.title}
                    </span>
                    <span className="text-sm text-text-secondary">
                      {opt.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ----------------------------------------------------------------- */}
          {/* Save button */}
          {/* ----------------------------------------------------------------- */}
          <button
            onClick={handleSave}
            className="w-full py-3 rounded-lg bg-accent text-white font-semibold text-sm hover:bg-accent-dim transition-colors"
          >
            Save changes
          </button>

          {/* ----------------------------------------------------------------- */}
          {/* Reset link */}
          {/* ----------------------------------------------------------------- */}
          <div className="text-center pb-6">
            <button
              onClick={handleReset}
              className="text-sm text-text-muted hover:text-text-secondary transition-colors underline underline-offset-2"
            >
              Reset &amp; redo onboarding
            </button>
          </div>
        </div>
      </div>

      {/* Toast */}
      {showToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-accent text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-lg animate-fade-in">
          Saved!
        </div>
      )}
    </div>
  );
}
