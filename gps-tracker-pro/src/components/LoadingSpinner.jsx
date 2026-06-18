/** Lightweight chunk-loading fallback — no heavy deps. */
export default function LoadingSpinner({ className = '' }) {
  return (
    <div
      className={`flex items-center justify-center min-h-[12rem] ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="w-8 h-8 rounded-full border-2 border-slate-600/40 border-t-capture-glow animate-spin" />
    </div>
  );
}
