import { useState, useCallback } from 'react';
import { ShieldCheck, Smartphone, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';
import { totpApi } from '../../services/traccarApi';
import { buildTotpAuthUrl, verifyTotpCode, generateQrDataUrl } from '../../utils/totp';
import { isTwoFactorLocked } from '../../utils/userAttributes';
import Input from '../ui/Input';
import Button from '../ui/Button';

export default function TotpEnrollmentPanel() {
  const { user, refreshUser, updateProfile } = useAuth();
  const { t } = useLocale();

  const [step, setStep] = useState('idle');
  const [pendingSecret, setPendingSecret] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const locked = isTwoFactorLocked(user);

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
      await updateProfile({ totpKey: pendingSecret });
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

  if (locked || step === 'enabled') {
    return (
      <div className="rounded-xl bg-capture-success/10 border border-capture-success/30 p-4 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-capture-success shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-slate-200">{t('settings.security.twoFA')}</p>
          <p className="text-xs text-slate-400 mt-1">{t('settings.security.twoFAActiveDesc')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-capture-bg/40 border border-slate-600/20 p-4 space-y-4">
      <div className="flex items-start gap-3">
        <Smartphone className="w-5 h-5 text-capture-glow shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-slate-200">{t('settings.security.twoFA')}</p>
          <p className="text-xs text-slate-500 mt-0.5">{t('settings.security.twoFADesc')}</p>
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
          <p className="text-[10px] text-slate-500 break-all font-mono text-center" dir="ltr">
            {pendingSecret}
          </p>
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
            <Button variant="secondary" size="sm" onClick={() => { setStep('idle'); setPendingSecret(''); }}>
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
