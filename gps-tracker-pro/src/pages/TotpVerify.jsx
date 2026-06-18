import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { APP_NAME } from '../utils/constants';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const MAX_ATTEMPTS = 3;

export default function TotpVerify() {
  const {
    verifyTotp,
    cancelTotpVerification,
    needsTotpVerification,
    isAuthenticated,
    loading: authLoading,
  } = useAuth();
  const { dir, t } = useLocale();
  const navigate = useNavigate();

  const [code, setCode] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!needsTotpVerification && !authLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [needsTotpVerification, authLoading, isAuthenticated, navigate]);

  if (!authLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!authLoading && !needsTotpVerification) {
    return <Navigate to="/login" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!/^\d{6}$/.test(code.trim())) {
      setError(t('login.totpInvalidFormat'));
      return;
    }

    setSubmitting(true);
    const result = await verifyTotp(code.trim());
    setSubmitting(false);

    if (result.success) {
      navigate('/dashboard', { replace: true });
      return;
    }

    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    setCode('');

    if (nextAttempts >= MAX_ATTEMPTS) {
      cancelTotpVerification();
      navigate('/login', { replace: true, state: { totpLocked: true } });
      return;
    }

    setError(result.error ?? t('login.totpInvalidCode'));
  };

  const handleCancel = () => {
    cancelTotpVerification();
    navigate('/login', { replace: true });
  };

  return (
    <div dir={dir} className="min-h-screen flex items-center justify-center p-4 bg-capture-bg capture-grid-bg">
      <div className="w-full max-w-md rounded-2xl p-8 bg-capture-card/60 backdrop-blur-xl border border-slate-600/25 shadow-glow-md">
        <div className="text-center mb-6">
          <ShieldCheck className="w-10 h-10 text-capture-glow mx-auto mb-3" />
          <h1 className="text-lg font-bold text-slate-100">{t('login.totpTitle')}</h1>
          <p className="text-sm text-slate-400 mt-1">{t('login.totpSubtitle')}</p>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 mb-4 px-4 py-3 rounded-lg text-sm bg-capture-danger/10 text-capture-danger border border-capture-danger/30"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            id="totp-code"
            label={t('login.totp')}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\s/g, ''))}
            placeholder="000000"
            disabled={submitting}
          />

          <p className="text-xs text-slate-500 text-center">
            {t('login.totpAttemptsLeft', { left: MAX_ATTEMPTS - attempts })}
          </p>

          <Button type="submit" variant="primary" size="lg" fullWidth loading={submitting}>
            {t('login.totpVerify')}
          </Button>

          <Button type="button" variant="secondary" size="sm" fullWidth onClick={handleCancel}>
            {t('common.cancel')}
          </Button>
        </form>

        <p className="text-[10px] text-slate-600 text-center mt-6">{APP_NAME}</p>
      </div>
    </div>
  );
}
