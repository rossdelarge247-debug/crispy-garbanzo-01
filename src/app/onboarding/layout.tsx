export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface-DEFAULT flex items-center justify-center">
      <div className="w-full max-w-lg mx-auto px-4 py-8">{children}</div>
    </div>
  );
}
