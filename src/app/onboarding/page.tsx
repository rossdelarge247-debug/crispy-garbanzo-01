"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CATEGORY_LABELS,
  ASSET_PRESETS,
  type FocusAsset,
  type UserPreferences,
  DEFAULT_PREFERENCES,
  savePreferences,
} from "@/lib/preferences";

// ---------------------------------------------------------------------------
// Steps: Auth → Categories → Focus Assets → Risk Style
// ---------------------------------------------------------------------------

const STEP_TITLES = [
  "Let's get you set up",
  "What do you want Trade Daddy to watch?",
  "Pick your focus assets",
  "What's your risk style?",
];

const STEP_SUBTITLES = [
  "Sign in to save your setup, or continue as a guest.",
  "Choose one or more markets.",
  "Select the specific assets you care about.",
  "This shapes how Trade Daddy filters ideas for you.",
];

const TOTAL_STEPS = STEP_TITLES.length;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const [authSkipped, setAuthSkipped] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [focusAssets, setFocusAssets] = useState<FocusAsset[]>([]);
  const [riskStyle, setRiskStyle] = useState<UserPreferences["riskStyle"]>("balanced");

  const canGoNext = useCallback(() => {
    switch (step) {
      case 0: return authSkipped;
      case 1: return categories.length > 0;
      case 2: return focusAssets.length > 0;
      default: return true;
    }
  }, [step, authSkipped, categories, focusAssets]);

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    } else {
      const prefs: UserPreferences = {
        ...DEFAULT_PREFERENCES,
        onboarded: true,
        categories,
        focusAssets,
        riskStyle,
      };
      savePreferences(prefs);
      router.push("/dashboard");
    }
  };

  const handleBack = () => { if (step > 0) setStep(step - 1); };

  const toggleCategory = (cat: string) => {
    setCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
    // Remove assets from deselected categories
    if (categories.includes(cat)) {
      const catSymbols = new Set((ASSET_PRESETS[cat] ?? []).map(a => a.symbol));
      setFocusAssets(prev => prev.filter(a => !catSymbols.has(a.symbol)));
    }
  };

  const toggleAsset = (asset: FocusAsset) => {
    setFocusAssets(prev => {
      const exists = prev.some(a => a.symbol === asset.symbol);
      return exists ? prev.filter(a => a.symbol !== asset.symbol) : [...prev, asset];
    });
  };

  // ---------------------------------------------------------------------------
  // Step renderers
  // ---------------------------------------------------------------------------

  const renderStep0 = () => (
    <div className="space-y-3">
      <button
        disabled
        className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl border border-[--border] bg-[--surface-raised] text-[--text-muted] cursor-not-allowed opacity-50 text-sm"
      >
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continue with Google
        <span className="text-xs opacity-60">(coming soon)</span>
      </button>

      <div className="flex items-center gap-3 text-xs text-[--text-muted]">
        <div className="flex-1 border-t border-[--border]" />
        or
        <div className="flex-1 border-t border-[--border]" />
      </div>

      <button
        onClick={() => setAuthSkipped(true)}
        className={`w-full px-4 py-3.5 rounded-xl border text-sm font-medium transition-all ${
          authSkipped
            ? "border-accent bg-accent text-white"
            : "border-accent bg-accent/10 text-accent hover:bg-accent/20"
        }`}
      >
        {authSkipped ? "✓ Continuing as guest" : "Continue without account"}
      </button>

      <p className="text-xs text-[--text-muted] leading-relaxed text-center">
        Your preferences save locally. Sign up later to sync across devices.
      </p>
    </div>
  );

  const renderStep1 = () => (
    <div className="grid grid-cols-2 gap-3">
      {Object.entries(CATEGORY_LABELS).map(([key, { label, emoji, description }]) => {
        const selected = categories.includes(key);
        return (
          <button
            key={key}
            onClick={() => toggleCategory(key)}
            className={`flex flex-col items-start gap-1 p-4 rounded-xl border transition-all text-left ${
              selected
                ? "border-accent bg-accent/10"
                : "border-[--border] bg-[--surface-raised] hover:bg-[--surface-hover]"
            }`}
          >
            <span className="text-xl">{emoji}</span>
            <span className="font-semibold text-sm text-[--text-primary]">{label}</span>
            <span className="text-xs text-[--text-secondary] leading-snug">{description}</span>
          </button>
        );
      })}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-5">
      {categories.map(cat => {
        const assets = ASSET_PRESETS[cat] ?? [];
        const catLabel = CATEGORY_LABELS[cat];
        return (
          <div key={cat}>
            <h3 className="text-xs font-semibold text-[--text-muted] uppercase tracking-wider mb-2">
              {catLabel?.emoji} {catLabel?.label}
            </h3>
            <div className="flex flex-wrap gap-2">
              {assets.map(asset => {
                const selected = focusAssets.some(a => a.symbol === asset.symbol);
                return (
                  <button
                    key={asset.symbol}
                    onClick={() => toggleAsset(asset)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      selected
                        ? "bg-accent text-white"
                        : "bg-[--surface-overlay] text-[--text-secondary] hover:text-[--text-primary]"
                    }`}
                  >
                    {asset.name}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderStep3 = () => {
    const options: { value: UserPreferences["riskStyle"]; title: string; desc: string }[] = [
      { value: "cautious", title: "Cautious", desc: "Only show high-confidence setups. Miss some trades, avoid bad ones." },
      { value: "balanced", title: "Balanced", desc: "Reasonable filter — good opportunities without overtrading." },
      { value: "aggressive", title: "Aggressive", desc: "Show me everything worth considering, even early-stage signals." },
    ];
    return (
      <div className="space-y-3">
        {options.map(opt => {
          const selected = riskStyle === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setRiskStyle(opt.value)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                selected
                  ? "border-accent bg-accent/10"
                  : "border-[--border] bg-[--surface-raised] hover:bg-[--surface-hover]"
              }`}
            >
              <span className="font-semibold text-[--text-primary] block text-sm">{opt.title}</span>
              <span className="text-xs text-[--text-secondary] mt-0.5 block">{opt.desc}</span>
            </button>
          );
        })}
      </div>
    );
  };

  const stepRenderers = [renderStep0, renderStep1, renderStep2, renderStep3];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col min-h-[80vh]">
      {/* Progress */}
      <div className="w-full h-0.5 bg-[--surface-overlay] rounded-full mb-8 overflow-hidden">
        <div
          className="h-full bg-accent transition-all duration-500 rounded-full"
          style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
        />
      </div>

      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-medium text-[--text-muted] uppercase tracking-widest mb-2">
          Step {step + 1} of {TOTAL_STEPS}
        </p>
        <h1 className="text-2xl font-bold text-[--text-primary] mb-1 tracking-tight">
          {STEP_TITLES[step]}
        </h1>
        <p className="text-sm text-[--text-secondary]">{STEP_SUBTITLES[step]}</p>
      </div>

      {/* Content */}
      <div className="flex-1 animate-fade-in">{stepRenderers[step]()}</div>

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between">
        <button
          onClick={handleBack}
          disabled={step === 0}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            step === 0
              ? "text-[--text-muted] cursor-not-allowed"
              : "text-[--text-secondary] hover:text-[--text-primary]"
          }`}
        >
          Back
        </button>

        <div className="flex gap-1.5">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? "bg-accent w-5" : i < step ? "bg-accent/40 w-1.5" : "bg-[--surface-overlay] w-1.5"
              }`}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          disabled={!canGoNext()}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
            canGoNext()
              ? "bg-accent text-white hover:bg-accent/90"
              : "bg-[--surface-overlay] text-[--text-muted] cursor-not-allowed"
          }`}
        >
          {step === TOTAL_STEPS - 1 ? "Go to Dashboard" : "Next"}
        </button>
      </div>
    </div>
  );
}
