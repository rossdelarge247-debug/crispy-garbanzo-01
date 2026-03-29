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
  "What do you want Trade Daddy to help you trade?",
  "Pick your focus universe",
  "How much detail do you want?",
  "How proactive should Trade Daddy be?",
  "What's your risk comfort?",
  "Stay in the loop",
];

const STEP_SUBTITLES = [
  "Good taste.",
  "Daddy likes your style.",
  "No wrong answers here.",
  "Daddy knows best.",
  "You got this.",
  "Almost done -- let's keep you sharp.",
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

  // Navigation helpers
  const canGoNext = useCallback(() => {
    switch (step) {
      case 0:
        return categories.length > 0;
      case 1:
        return focusAssets.length > 0;
      default:
        return true;
    }
  }, [step, categories, focusAssets]);

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
      router.push("/");
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

  const stepRenderers = [
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
