import { useNavigate } from 'react-router-dom';
import { Home, ArrowRight } from 'lucide-react';
import Button from '../components/ui/Button';
import { NUMERIC_DISPLAY_CLASS } from '../utils/formatters';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-capture-bg capture-grid-bg flex items-center justify-center p-6"
    >
      <div className="text-center max-w-md animate-fade-in">
        {/* Glow 404 */}
        <p className="text-[8rem] font-black leading-none capture-text-gradient select-none">
          <span className={NUMERIC_DISPLAY_CLASS} dir="ltr">404</span>
        </p>

        <h1 className="text-2xl font-bold text-slate-100 mt-2">الصفحة غير موجودة</h1>
        <p className="text-sm text-capture-metallic mt-3 leading-relaxed">
          الصفحة التي تبحث عنها غير موجودة أو تم نقلها.
          <br />
          تحقق من الرابط أو عد إلى لوحة التحكم.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
          <Button
            variant="primary"
            leftIcon={<Home className="w-4 h-4" />}
            onClick={() => navigate('/dashboard')}
          >
            لوحة التحكم
          </Button>
          <Button
            variant="secondary"
            leftIcon={<ArrowRight className="w-4 h-4" />}
            onClick={() => navigate(-1)}
          >
            رجوع
          </Button>
        </div>
      </div>
    </div>
  );
}
