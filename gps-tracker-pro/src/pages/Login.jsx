import { useState, useEffect } from 'react';
import { useNavigate, Navigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { APP_NAME } from '../utils/constants';
import { validatePassword } from '../utils/validation';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { formatNumber, NUMERIC_DISPLAY_CLASS } from '../utils/formatters';

const REMEMBER_KEY = 'capture_remember_email';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function Login() {
  const { login, isAuthenticated, loading: authLoading, sessionExpired, clearSessionExpired, error: authError } = useAuth();
  const { dir, t, language } = useLocale();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState(() => localStorage.getItem(REMEMBER_KEY) ?? '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(!!localStorage.getItem(REMEMBER_KEY));
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (location.state?.totpLocked) {
      setFormError(t('login.totpMaxAttempts'));
      navigate('/login', { replace: true, state: {} });
    }
  }, [location.state, navigate, t]);

  useEffect(() => {
    if (sessionExpired) {
      setFormError(t('login.sessionExpired'));
      clearSessionExpired();
    }
  }, [sessionExpired, clearSessionExpired, t]);

  if (!authLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const validate = () => {
    const errors = {};
    if (!email.trim()) {
      errors.email = t('common.validation.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = t('common.validation.emailInvalid');
    }
    if (!password) {
      errors.password = t('common.validation.passwordRequired');
    } else {
      const passwordError = validatePassword(password, { language });
      if (passwordError) errors.password = passwordError;
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

    const result = await login(email.trim(), password);
    setSubmitting(false);

    if (result.totpRequired) {
      navigate('/login/totp', { replace: true });
      return;
    }

    if (result.success) {
      navigate('/dashboard', { replace: true });
    } else {
      setFormError(result.error ?? authError ?? t('login.failed'));
    }
  };

  const displayError = formError || authError;

  return (
    <div
      dir={dir}
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
              {t('app.subtitleLong')}
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
              label={t('login.email')}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: '' }));
              }}
              placeholder={t('login.emailPlaceholder')}
              error={fieldErrors.email}
              leftIcon={<Mail className="w-4 h-4" />}
              disabled={submitting}
              className={fieldErrors.email ? '[&>div]:shadow-[0_0_16px_rgba(244,63,94,0.2)]' : ''}
            />

            <Input
              id="password"
              label={t('login.password')}
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
                  aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              disabled={submitting}
              className={fieldErrors.password ? '[&>div]:shadow-[0_0_16px_rgba(244,63,94,0.2)]' : ''}
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
                  {t('login.rememberMe')}
                </span>
              </label>

              <button
                type="button"
                onClick={() => setFormError(t('login.forgotPasswordMsg'))}
                className="text-sm text-capture-glow hover:text-capture-primary transition-colors hover:underline underline-offset-2"
              >
                {t('login.forgotPassword')}
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
              {submitting ? t('login.submitting') : t('login.submit')}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-600/20 text-center">
            <p className="text-[11px] text-slate-500 mb-1">
              {t('login.footerPort')}{' '}
              <span className={NUMERIC_DISPLAY_CLASS} dir="ltr">{formatNumber(8082, { maximumFractionDigits: 0 })}</span>
            </p>
            <p className="text-xs text-capture-metallic">
              {t('login.footerSession')} <span dir="ltr" className="text-capture-glow">/api</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
