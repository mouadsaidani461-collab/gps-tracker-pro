import { useLocale } from '../../context/LocaleContext';

export default function LoadingScreen({ message, showText = true }) {
  const { dir, t } = useLocale();

  return (
    <div dir={dir} className="min-h-screen bg-capture-bg flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-capture-primary border-t-transparent rounded-full animate-spin" />
        {showText && (
          <p className="text-sm text-capture-metallic">{message ?? t('common.loading')}</p>
        )}
      </div>
    </div>
  );
}
