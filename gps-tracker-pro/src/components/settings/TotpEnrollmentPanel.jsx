import { useState, useCallback, useEffect } from 'react';
import { ShieldCheck, Smartphone, Loader2, ShieldOff, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';
import { totpApi, serverApi } from '../../services/traccarApi';
import { buildTotpAuthUrl, verifyTotpCode, generateQrDataUrl } from '../../utils/totp';
import { isTwoFactorLocked } from '../../utils/userAttributes';
import { parseTotpServerEnabled } from '../../utils/serverAttributes';
import { ROLES } from '../../utils/authRoles';
import Input from '../ui/Input';
import Button from '../ui/Button';

const ENROLL_ROLES = new Set([ROLES.ADMIN, ROLES.OPERATOR]);

export default function TotpEnrollmentPanel() {
  const { user, refreshUser, updateProfile } = useAuth();
  const { t } = useLocale();

  const [step, setStep] = useState('idle');
  const [pendingSecret, setPendingSecret] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverTotpEnabled, setServerTotpEnabled] = useState(null);

  const canEnroll = ENROLL_ROLES.has(user?.role);
  const locked = isTwoFactorLocked(user);
  const isAdmin = user?.role === ROLES.ADMIN;

  useEffect(() => {
    let cancelled = false;
    serverApi.get()
      .then((server) => {
        if (!cancelled) setServerTotpEnabled(parseTotpServerEnabled(server));
      })
      .catch(() => {
        if (!cancelled) setServerTotpEnabled(false);
      });
    return () => { cancelled = true; };
  }, []);

  const startEnrollment = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const secret = await totpApi.generateSecret();
      const authUrl = buildTotpAuthUrl(user?.email ?? 'user', secret);
      const dataUrl = await generateQrDataUrl(authUrl);
      setPendingSecret(secret);
      setQrDataUrl(dataUrl);
      setVerifyCode('');
      setStep('scan');
    } catch (err) {
      setError(err.message || t('settings.security.totpGenerateFailed'));
    } finally {
      setLoading(false);
    }
  }, [user?.email, t]);

  const confirmEnrollment = useCallback(async () => {
    setError('');
    if (!verifyTotpCode(pendingSecret, verifyCode)) {
      setError(t('settings.security.totpInvalidCode'));
      return;
    }

    setLoading(true);
    try {
      await updateProfile({ totpKey: pendingSecret, totpEnabled: true });
      await refreshUser();
      setStep('enabled');
      setPendingSecret('');
      setQrDataUrl('');
      setVerifyCode('');
    } catch (err) {
      setError(err.message || t('settings.security.totpSaveFailed'));
    } finally {
      setLoading(false);
    }
  }, [pendingSecret, verifyCode, updateProfile, refreshUser, t]);

  const disableTotp = useCallback(async () => {
    if (!user?.id) return;
    setError('');
    setLoading(true);
    try {
      await totpApi.disable(Number(user.id));
      await refreshUser();
      setStep('idle');
    } catch (err) {
      setError(err.message || t('settings.security.totpDisableFailed'));
    } finally {
      setLoading(false);
    }
  }, [user?.id, refreshUser, t]);

  if (!canEnroll) {
    return null;
  }

  if (serverTotpEnabled === null) {
    return (
      <div className="rounded-xl bg-capture-bg/40 border border-slate-600/20 p-4">
        <p className="text-xs text-slate-500 flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          {t('common.loading')}
        </p>
      </div>
    );
  }

  if (!serverTotpEnabled) {
    return (
      <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 space-y-2">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-slate-200">{t('settings.security.twoFA')}</p>
            <p className="text-xs text-slate-400 mt-1">{t('settings.security.totpServerDisabled')}</p>
            {isAdmin && (
              <p className="text-xs text-amber-300/90 mt-2 font-mono" dir="ltr">
                {t('settings.security.totpServerDisabledAdmin')}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (locked || step === 'enabled') {
    return (
      <div className="rounded-xl bg-capture-success/10 border border-capture-success/30 p-4 space-y-3">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-capture-success shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-200">{t('settings.security.twoFA')}</p>
            <p className="text-xs text-slate-400 mt-1">{t('settings.security.twoFAActiveDesc')}</p>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={disableTotp} loading={loading}>
          <ShieldOff className="w-4 h-4" />
          {t('settings.security.totpDisable')}
        </Button>
        {error && <p className="text-xs text-capture-danger" role="alert">{error}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-capture-bg/40 border border-slate-600/20 p-4 space-y-4">
      <div className="flex items-start gap-3">
        <Smartphone className="w-5 h-5 text-capture-glow shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-slate-200">{t('settings.security.twoFA')}</p>
          <p className="text-xs text-slate-500 mt-0.5">{t('settings.security.twoFAEnrollDesc')}</p>
        </div>
      </div>

      {error && (
        <p className="text-xs text-capture-danger" role="alert">{error}</p>
      )}

      {step === 'idle' && (
        <Button variant="primary" size="sm" onClick={startEnrollment} loading={loading}>
          {t('settings.security.totpStart')}
        </Button>
      )}

      {step === 'scan' && (
        <div className="space-y-4 animate-[fade-in_0.2s_ease-out]">
          <p className="text-xs text-slate-400">{t('settings.security.totpScanHint')}</p>
          {qrDataUrl && (
            <img
              src={qrDataUrl}
              alt={t('settings.security.totpQrAlt')}
              className="mx-auto rounded-lg border border-slate-600/30 bg-white p-2"
              width={200}
              height={200}
            />
          )}
          <Input
            id="totp-verify-enroll"
            label={t('settings.security.totpVerifyLabel')}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={verifyCode}
            onChange={(e) => setVerifyCode(e.target.value.replace(/\s/g, ''))}
            placeholder="000000"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => { setStep('idle'); setPendingSecret(''); setQrDataUrl(''); }}
            >
              {t('common.cancel')}
            </Button>
            <Button variant="primary" size="sm" onClick={confirmEnrollment} loading={loading}>
              {t('settings.security.totpConfirm')}
            </Button>
          </div>
        </div>
      )}

      {loading && step === 'scan' && (
        <p className="text-xs text-slate-500 flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          {t('common.loading')}
        </p>
      )}
    </div>
  );
}
