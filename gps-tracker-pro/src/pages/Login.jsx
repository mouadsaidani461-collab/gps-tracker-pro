import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { APP_NAME } from '../utils/constants';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const REMEMBER_KEY = 'capture_remember_email';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function Login() {
  const { login, isAuthenticated, loading: authLoading, sessionExpired, clearSessionExpired, error: authError } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState(() => localStorage.getItem(REMEMBER_KEY) ?? '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(!!localStorage.getItem(REMEMBER_KEY));
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [totpCode, setTotpCode] = useState('');

  useEffect(() => {
    if (sessionExpired) {
      setFormError('انتهت جلستك بسبب عدم النشاط. يرجى تسجيل الدخول مجدداً.');
      clearSessionExpired();
    }
  }, [sessionExpired, clearSessionExpired]);

  if (!authLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const validate = () => {
    const errors = {};
    if (!email.trim()) {
      errors.email = 'البريد الإلكتروني مطلوب';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'البريد الإلكتروني غير صالح';
    }
    if (!password) {
      errors.password = 'كلمة المرور مطلوبة';
    } else if (password.length < 6) {
      errors.password = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!validate()) return;

    setSubmitting(true);

    if (rememberMe) {
      localStorage.setItem(REMEMBER_KEY, email.trim());
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }

    const result = await login(email.trim(), password, totpCode.trim() || undefined);
    setSubmitting(false);

    if (result.success) {
      navigate('/dashboard', { replace: true });
    } else {
      setFormError(result.error ?? authError ?? 'فشل تسجيل الدخول');
    }
  };

  const displayError = formError || authError;

  return (
    <div
      dir="rtl"
      className={cn(
        'relative min-h-screen flex items-center justify-center p-4',
        'bg-capture-bg capture-grid-bg',
        'overflow-hidden',
      )}
    >
      {/* Ambient glow accents */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute top-1/4 start-1/4 w-96 h-96 bg-capture-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 end-1/4 w-80 h-80 bg-capture-glow/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in">
        {/* Glassmorphism card */}
        <div
          className={cn(
            'rounded-2xl p-8',
            'bg-capture-card/60 backdrop-blur-xl',
            'border border-slate-600/25',
            'shadow-glow-md',
            'before:absolute before:inset-x-8 before:top-0 before:h-px',
            'before:bg-gradient-to-r before:from-transparent before:via-capture-primary/40 before:to-transparent',
            'relative overflow-hidden',
          )}
        >
          {/* Logo & branding */}
          <div className="text-center mb-8">
            <img
              src="/logo.svg"
              alt={APP_NAME}
              className="h-14 w-auto mx-auto mb-5 drop-shadow-[0_0_12px_rgba(6,182,212,0.3)]"
            />
            <h1 className="text-xl font-bold text-slate-100 tracking-wide">
              CAPTURE TRACKING{' '}
              <span className="text-capture-glow">GPS</span>
            </h1>
            <p className="text-sm text-capture-metallic mt-1.5">
              نظام تتبع الأسطول الذكي
            </p>
          </div>

          {/* Global error banner */}
          {displayError && (
            <div
              role="alert"
              className={cn(
                'flex items-start gap-2.5 mb-6 px-4 py-3 rounded-lg text-sm',
                'bg-capture-danger/10 text-capture-danger',
                'border border-capture-danger/30',
                'shadow-[0_0_16px_rgba(244,63,94,0.15)]',
              )}
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{displayError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <Input
              id="email"
              label="البريد الإلكتروني"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: '' }));
              }}
              placeholder="mouadsaidani461@gmail.com"
              error={fieldErrors.email}
              leftIcon={<Mail className="w-4 h-4" />}
              disabled={submitting}
              className={fieldErrors.email ? '[&>div]:shadow-[0_0_16px_rgba(244,63,94,0.2)]' : ''}
            />

            <Input
              id="password"
              label="كلمة المرور"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: '' }));
              }}
              placeholder="••••••••"
              error={fieldErrors.password}
              leftIcon={<Lock className="w-4 h-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="text-capture-metallic hover:text-capture-glow transition-colors"
                  aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              disabled={submitting}
              className={fieldErrors.password ? '[&>div]:shadow-[0_0_16px_rgba(244,63,94,0.2)]' : ''}
            />

            <Input
              id="totp"
              label="رمز المصادقة الثنائية (2FA)"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\s/g, ''))}
              placeholder="اختياري — إذا كان مفعّلاً على Traccar"
              disabled={submitting}
            />

            {/* Remember me + Forgot password */}
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={submitting}
                  className={cn(
                    'w-4 h-4 rounded border-slate-600/50',
                    'bg-capture-surface text-capture-primary',
                    'focus:ring-capture-primary/50 focus:ring-offset-0',
                    'accent-capture-primary cursor-pointer',
                  )}
                />
                <span className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                  تذكرني
                </span>
              </label>

              <button
                type="button"
                onClick={() => setFormError('يرجى التواصل مع مدير النظام لاستعادة كلمة المرور.')}
                className="text-sm text-capture-glow hover:text-capture-primary transition-colors hover:underline underline-offset-2"
              >
                نسيت كلمة المرور؟
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={submitting}
              className="mt-2 hover:shadow-glow-lg"
            >
              {submitting ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-600/20 text-center">
            <p className="text-[11px] text-slate-500 mb-1">استخدم حساب Traccar على المنفذ 8082</p>
            <p className="text-xs text-capture-metallic">
              الجلسة عبر cookie — API: <span dir="ltr" className="text-capture-glow">/api</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
