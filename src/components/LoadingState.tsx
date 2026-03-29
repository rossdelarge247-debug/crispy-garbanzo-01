interface LoadingStateProps {
  title?: string;
  subtitle?: string;
}

const quips = [
  "Scanning the markets...",
  "Crunching the numbers...",
  "Reading the room...",
  "Asking the algorithms nicely...",
  "Consulting the vibes...",
  "Hunting for alpha...",
  "Translating Wall Street into English...",
  "Making sense of the chaos...",
  "Checking what the smart money is doing...",
  "Separating signal from noise...",
];

function getQuip(): string {
  return quips[Math.floor(Math.random() * quips.length)];
}

export default function LoadingState({ title, subtitle }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      {/* Animated dots */}
      <div className="flex items-center gap-2 mb-6">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse"
            style={{
              animationDelay: `${i * 200}ms`,
              animationDuration: "1.2s",
            }}
          />
        ))}
      </div>
      <h3 className="text-sm font-bold text-text-primary mb-1">
        {title || getQuip()}
      </h3>
      {subtitle && (
        <p className="text-xs text-text-muted">{subtitle}</p>
      )}
    </div>
  );
}
