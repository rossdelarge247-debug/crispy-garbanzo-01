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
// Step metadata
// ---------------------------------------------------------------------------

const STEP_TITLES = [
  "Let's get you set up",
  "What do you want Trade Daddy to help you trade?",
  "Pick your focus universe",
  "How much detail do you want?",
  "How proactive should Trade Daddy be?",
  "What's your risk comfort?",
  "Stay in the loop",
];

const STEP_SUBTITLES = [
  "Create your account to save your preferences.",
  "Good taste.",
  "Daddy likes your style.",
  "No wrong answers here.",
  "Daddy knows best.",
  "You got this.",
  "Almost done — let's keep you sharp.",
];

const TOTAL_STEPS = STEP_TITLES.length;

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  // Preferences state
  const [categories, setCategories] = useState<string[]>([]);
  const [focusAssets, setFocusAssets] = useState<FocusAsset[]>([]);
  const [experienceLevel, setExperienceLevel] =
    useState<UserPreferences["experienceLevel"]>("balanced");
  const [proactiveLevel, setProactiveLevel] =
    useState<UserPreferences["proactiveLevel"]>("suggest");
  const [riskStyle, setRiskStyle] =
    useState<UserPreferences["riskStyle"]>("balanced");
  const [notifications, setNotifications] = useState(
    DEFAULT_PREFERENCES.notifications
  );

  const [authSkipped, setAuthSkipped] = useState(false);

  // Navigation helpers
  const canGoNext = useCallback(() => {
    switch (step) {
      case 0:
        return authSkipped; // auth step — must sign in or skip
      case 1:
        return categories.length > 0;
      case 2:
        return focusAssets.length > 0;
      default:
        return true;
    }
  }, [step, categories, focusAssets, authSkipped]);

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    } else {
      // Save and redirect
      const prefs: UserPreferences = {
        onboarded: true,
        categories,
        focusAssets,
        experienceLevel,
        proactiveLevel,
        riskStyle,
        notifications,
      };
      savePreferences(prefs);
      router.push("/dashboard");
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  // Toggle helpers
  const toggleCategory = (cat: string) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
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

  // ---------------------------------------------------------------------------
  // Step renderers
  // ---------------------------------------------------------------------------

  const renderStep0 = () => (
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
                : "border-surface-border bg-surface-raised hover:bg-surface-hover"
            }`}
          >
            <span className="text-2xl">{emoji}</span>
            <span className="font-semibold text-text-primary">{label}</span>
            <span className="text-xs text-text-secondary leading-snug">
              {description}
            </span>
          </button>
        );
      })}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      {categories.map((cat) => {
        const assets = ASSET_PRESETS[cat] ?? [];
        const catLabel = CATEGORY_LABELS[cat];
        return (
          <div key={cat}>
            <h3 className="text-sm font-semibold text-text-secondary mb-2">
              {catLabel?.emoji} {catLabel?.label}
            </h3>
            <div className="flex flex-wrap gap-2">
              {assets.map((asset) => {
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
          </div>
        );
      })}
    </div>
  );

  const renderStep2 = () => {
    const options: {
      value: UserPreferences["experienceLevel"];
      title: string;
      desc: string;
    }[] = [
      {
        value: "simple",
        title: "Simple",
        desc: "Just tell me what to do. Keep it short.",
      },
      {
        value: "balanced",
        title: "Balanced",
        desc: "Give me context but don't overwhelm me.",
      },
      {
        value: "advanced",
        title: "Advanced",
        desc: "Show me everything. I can handle it.",
      },
    ];
    return (
      <div className="space-y-3">
        {options.map((opt) => {
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
              <span className="text-sm text-text-secondary">{opt.desc}</span>
            </button>
          );
        })}
      </div>
    );
  };

  const renderStep3 = () => {
    const options: {
      value: UserPreferences["proactiveLevel"];
      title: string;
      desc: string;
    }[] = [
      {
        value: "explain",
        title: "Explain",
        desc: "Just explain what's happening. I'll decide.",
      },
      {
        value: "suggest",
        title: "Suggest",
        desc: "Point out opportunities and let me choose.",
      },
      {
        value: "plan",
        title: "Plan",
        desc: "Build trade plans I can review and approve.",
      },
      {
        value: "paper",
        title: "Paper trade",
        desc: "Simulate trades so I can learn without risk.",
      },
      {
        value: "live",
        title: "Prepare for live",
        desc: "Help me get ready for real execution.",
      },
    ];
    return (
      <div className="space-y-3">
        {options.map((opt) => {
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
              <span className="text-sm text-text-secondary">{opt.desc}</span>
            </button>
          );
        })}
      </div>
    );
  };

  const renderStep4 = () => {
    const options: {
      value: UserPreferences["riskStyle"];
      title: string;
      desc: string;
    }[] = [
      {
        value: "cautious",
        title: "Cautious",
        desc: "Small positions. I'd rather miss a trade than take a bad one.",
      },
      {
        value: "balanced",
        title: "Balanced",
        desc: "Reasonable risk for reasonable reward.",
      },
      {
        value: "aggressive",
        title: "Aggressive",
        desc: "I'm comfortable with bigger swings for bigger potential.",
      },
    ];
    return (
      <div className="space-y-3">
        {options.map((opt) => {
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
              <span className="text-sm text-text-secondary">{opt.desc}</span>
            </button>
          );
        })}
      </div>
    );
  };

  const renderStep5 = () => {
    const toggles: { key: keyof typeof notifications; label: string }[] = [
      { key: "dailyBriefing", label: "Daily briefing" },
      { key: "eventAlerts", label: "Event alerts" },
      { key: "tradeSetupAlerts", label: "Trade setup alerts" },
      { key: "invalidationAlerts", label: "Invalidation alerts" },
    ];
    return (
      <div className="space-y-3">
        {toggles.map(({ key, label }) => (
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
    );
  };

  const renderAuthStep = () => (
    <div className="space-y-4">
      <button
        disabled
        className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-surface-border bg-surface-raised text-text-muted cursor-not-allowed opacity-60"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continue with Google (coming soon)
      </button>
      <div className="flex items-center gap-3 text-xs text-text-muted">
        <div className="flex-1 border-t border-surface-border" />
        or
        <div className="flex-1 border-t border-surface-border" />
      </div>
      <button
        onClick={() => setAuthSkipped(true)}
        className="w-full px-4 py-3 rounded-xl border border-accent bg-accent/10 text-accent font-medium text-sm hover:bg-accent/20 transition-colors"
      >
        Continue without account
      </button>
      <p className="text-xs text-text-muted text-center leading-relaxed">
        You can try Trade Daddy without signing up. Your preferences will be saved locally.
        Sign up later to sync across devices and unlock live trading.
      </p>
    </div>
  );

  const stepRenderers = [
    renderAuthStep,
    renderStep0,
    renderStep1,
    renderStep2,
    renderStep3,
    renderStep4,
    renderStep5,
  ];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col min-h-[80vh]">
      {/* Progress bar */}
      <div className="w-full h-1 bg-surface-overlay rounded-full mb-8 overflow-hidden">
        <div
          className="h-full bg-accent transition-all duration-300 rounded-full"
          style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
        />
      </div>

      {/* Step header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-text-primary mb-2">
          {STEP_TITLES[step]}
        </h1>
        <p className="text-sm text-text-secondary">{STEP_SUBTITLES[step]}</p>
      </div>

      {/* Step content */}
      <div className="flex-1 animate-fade-in">{stepRenderers[step]()}</div>

      {/* Bottom navigation */}
      <div className="mt-8 flex items-center justify-between">
        {/* Back button */}
        <button
          onClick={handleBack}
          disabled={step === 0}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            step === 0
              ? "text-text-muted cursor-not-allowed"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          Back
        </button>

        {/* Step dots */}
        <div className="flex gap-1.5">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <span
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${
                i === step
                  ? "bg-accent w-4"
                  : i < step
                  ? "bg-accent/50"
                  : "bg-surface-overlay"
              }`}
            />
          ))}
        </div>

        {/* Next / Finish button */}
        <button
          onClick={handleNext}
          disabled={!canGoNext()}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
            canGoNext()
              ? "bg-accent text-white hover:bg-accent-dim"
              : "bg-surface-overlay text-text-muted cursor-not-allowed"
          }`}
        >
          {step === TOTAL_STEPS - 1 ? "Let's go" : "Next"}
        </button>
      </div>
    </div>
  );
}
