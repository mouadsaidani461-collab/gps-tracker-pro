import { Component } from 'react';
import { translate, getStoredLanguage, getDirectionForLanguage } from '../i18n';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const lang = getStoredLanguage();
    const dir = getDirectionForLanguage(lang);
    return (
      <div dir={dir} className="min-h-screen bg-capture-bg flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-xl font-bold text-slate-100">
            {translate(lang, 'error.title')}
          </h1>
          <p className="text-sm text-capture-metallic">
            {translate(lang, 'error.message')}
          </p>
          {import.meta.env.DEV && (
            <pre className="text-xs text-left text-capture-danger bg-capture-surface/60 p-3 rounded-lg overflow-auto max-h-40">
              {error.message}
            </pre>
          )}
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-capture-primary text-capture-bg font-semibold"
            >
              {translate(lang, 'error.reload')}
            </button>
            <a
              href="/dashboard"
              className="px-4 py-2 rounded-lg border border-slate-600/40 text-slate-200"
            >
              {translate(lang, 'error.goDashboard')}
            </a>
          </div>
        </div>
      </div>
    );
  }
}
