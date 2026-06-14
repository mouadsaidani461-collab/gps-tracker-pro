import { useNavigate } from 'react-router-dom';
import { Home, ArrowRight } from 'lucide-react';
import Button from '../components/ui/Button';
import { useLocale } from '../context/LocaleContext';
import { NUMERIC_DISPLAY_CLASS } from '../utils/formatters';

export default function NotFound() {
  const navigate = useNavigate();
  const { dir, t } = useLocale();

  return (
    <div
      dir={dir}
      className="min-h-screen bg-capture-bg capture-grid-bg flex items-center justify-center p-6"
    >
      <div className="text-center max-w-md animate-fade-in">
        <p className="text-[8rem] font-black leading-none capture-text-gradient select-none">
          <span className={NUMERIC_DISPLAY_CLASS} dir="ltr">404</span>
        </p>

        <h1 className="text-2xl font-bold text-slate-100 mt-2">{t('notFound.title')}</h1>
        <p className="text-sm text-capture-metallic mt-3 leading-relaxed">
          {t('notFound.message')}
          <br />
          {t('notFound.hint')}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
          <Button
            variant="primary"
            leftIcon={<Home className="w-4 h-4" />}
            onClick={() => navigate('/dashboard')}
          >
            {t('notFound.goDashboard')}
          </Button>
          <Button
            variant="secondary"
            leftIcon={<ArrowRight className="w-4 h-4" />}
            onClick={() => navigate(-1)}
          >
            {t('common.back')}
          </Button>
        </div>
      </div>
    </div>
  );
}
