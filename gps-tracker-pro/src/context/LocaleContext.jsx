import {
  createContext, useCallback, useContext, useMemo, useState,
} from 'react';
import {
  applyDocumentLanguage,
  getStoredLanguage,
  persistLanguage,
  translate,
  LANGUAGES,
  getLanguageMeta,
} from '../i18n';

const LocaleContext = createContext(null);

export function LocaleProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    const stored = getStoredLanguage();
    persistLanguage(stored);
    applyDocumentLanguage(stored);
    return stored;
  });

  const setLanguage = useCallback((lang) => {
    const normalized = persistLanguage(lang);
    applyDocumentLanguage(normalized);
    setLanguageState(normalized);
  }, []);

  const t = useCallback(
    (key, params) => translate(language, key, params),
    [language],
  );

  const dir = LANGUAGES.find((l) => l.id === language)?.dir ?? 'rtl';

  const value = useMemo(
    () => ({
      language,
      dir,
      setLanguage,
      t,
      languages: LANGUAGES.map(getLanguageMeta),
    }),
    [language, dir, setLanguage, t],
  );

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error('useLocale must be used within LocaleProvider');
  }
  return ctx;
}
