import { LocaleProvider } from '../../src/context/LocaleContext';

export function renderWithLocale(ui) {
  return (
    <LocaleProvider>
      {ui}
    </LocaleProvider>
  );
}
