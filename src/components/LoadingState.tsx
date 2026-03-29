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
      {/* Animated bars */}
      <div className="flex items-end gap-1 mb-6 h-8">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="w-1.5 bg-black animate-pulse"
            style={{
              height: `${12 + Math.random() * 20}px`,
              animationDelay: `${i * 150}ms`,
              animationDuration: "1s",
            }}
          />
        ))}
      </div>
      <h3 className="text-sm font-black uppercase tracking-widest text-black mb-1">
        {title || getQuip()}
      </h3>
      {subtitle && (
        <p className="text-xs text-text-muted">{subtitle}</p>
      )}
    </div>
  );
}
