"use client";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

const failWhales = [
  { title: "Well, that didn't work.", description: "The data gremlins got loose again. Give it another shot." },
  { title: "Markets are open. We are not.", description: "Something went sideways. The good news? Your money is still yours." },
  { title: "Even algorithms have bad days.", description: "Our data pipeline tripped over its own shoelaces. Try again?" },
  { title: "Houston, we have a problem.", description: "Somewhere between here and the market data, things went wrong." },
  { title: "Plot twist: the data didn't show up.", description: "Like a trader on holiday. It happens. Let's try again." },
  { title: "404: Alpha not found.", description: "The signal got lost in the noise. One more try might do it." },
  { title: "This is not financial advice.", description: "And apparently not financial data either. Something broke — retry below." },
  { title: "The market waits for no one.", description: "But our servers apparently do. Let's shake things loose." },
];

function getFailWhale() {
  return failWhales[Math.floor(Math.random() * failWhales.length)];
}

export default function ErrorState({ title, description, onRetry, retryLabel }: ErrorStateProps) {
  const whale = getFailWhale();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center rounded-xl border border-conviction-danger/20 bg-conviction-danger/5">
      <h3 className="text-sm font-semibold text-text-primary mb-2">
        {title || whale.title}
      </h3>
      <p className="text-sm text-text-muted max-w-md mb-6">
        {description || whale.description}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center px-5 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:shadow-card transition-all duration-200"
        >
          {retryLabel || "Try again"}
        </button>
      )}
    </div>
  );
}
