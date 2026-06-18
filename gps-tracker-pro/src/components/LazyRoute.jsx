import { ErrorBoundary } from 'react-error-boundary';
import { translate, getStoredLanguage } from '../i18n';

function ChunkErrorFallback({ resetErrorBoundary }) {
  const lang = getStoredLanguage();
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-8 min-h-[12rem] text-center">
      <p className="text-sm text-capture-danger">{translate(lang, 'error.message')}</p>
      <button
        type="button"
        onClick={resetErrorBoundary}
        className="text-sm text-capture-glow hover:underline"
      >
        {translate(lang, 'error.reload')}
      </button>
    </div>
  );
}

/** Error boundary wrapper for React.lazy() route chunks. */
export default function LazyRoute({ children }) {
  return (
    <ErrorBoundary FallbackComponent={ChunkErrorFallback} onReset={() => window.location.reload()}>
      {children}
    </ErrorBoundary>
  );
}
