import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center animate-fade-in">
      <div className="text-6xl font-extrabold text-text-primary mb-4">404</div>
      <h1 className="text-xl font-extrabold text-text-primary mb-2">
        This page doesn&apos;t exist.
      </h1>
      <p className="text-sm text-text-muted max-w-md mb-8">
        Either you followed a bad link, or this market situation has been
        invalidated — which, honestly, happens more than you&apos;d think.
      </p>
      <Link
        href="/"
        className="inline-flex items-center px-6 py-2.5 bg-accent text-accent-dark text-sm font-bold rounded-full hover:shadow-lift transition-all duration-300"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
