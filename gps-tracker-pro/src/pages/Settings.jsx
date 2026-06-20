import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  User, Bell, Shield, Palette, Globe, Camera, Save,
  CheckCircle, Moon, Sun, Volume2, VolumeX, Mail, Lock,
  BatteryLow, BatteryWarning, PlugZap,
  WifiOff, Timer, Clock,
  Gauge, AlertTriangle, Zap,
  MapPin, LogOut, MoonStar,
  Wrench, CircleDot, ClipboardCheck, ShieldCheck,
  TrendingDown, TrendingUp, RotateCcw, Car,
  CloudLightning, CloudRain, CloudFog, ThermometerSun,
  Fuel, Droplets, BellRing,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNotificationContext } from '../context/NotificationContext';
import { useLocale } from '../context/LocaleContext';
import { SETTINGS_KEY } from '../i18n';
import { COLORS } from '../utils/constants';
import { NUMERIC_DISPLAY_CLASS, toWesternNumerals } from '../utils/formatters';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import TotpEnrollmentPanel from '../components/settings/TotpEnrollmentPanel';
import NotificationDeviceFilter from '../components/settings/NotificationDeviceFilter';
import { getRoleLabel } from '../utils/authRoles';
import { AVATAR_ACCEPT, processAvatarFile } from '../utils/avatarUtils';
import { USER_ATTR_CAPTURE_AVATAR } from '../utils/userAttributes';
import { validateProfile, validateSecurity } from './settings/validation';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

const TAB_DEFS = [
  { id: 'profile', labelKey: 'settings.tabs.profile', icon: User },
  { id: 'notifications', labelKey: 'settings.tabs.notifications', icon: Bell },
  { id: 'security', labelKey: 'settings.tabs.security', icon: Shield },
  { id: 'appearance', labelKey: 'settings.tabs.appearance', icon: Palette },
  { id: 'language', labelKey: 'settings.tabs.language', icon: Globe },
];

const NOTIFICATION_META = [
  { id: 'email', icon: Mail, severity: 'info', defaultEnabled: false },
  { id: 'critical', icon: BellRing, severity: 'danger', defaultEnabled: true },
];

const NOTIFICATION_CATEGORIES = [
  {
    id: 'battery',
    items: [
      { id: 'battery_low', icon: BatteryLow, severity: 'warning', defaultEnabled: true, defaultSound: true },
      { id: 'battery_critical', icon: BatteryWarning, severity: 'danger', defaultEnabled: true, defaultSound: true },
      { id: 'battery_not_charging', icon: PlugZap, severity: 'warning', defaultEnabled: true, defaultSound: false },
    ],
  },
  {
    id: 'offline',
    items: [
      { id: 'offline_30m', icon: WifiOff, severity: 'warning', defaultEnabled: true, defaultSound: false },
      { id: 'offline_2h', icon: Timer, severity: 'warning', defaultEnabled: true, defaultSound: true },
      { id: 'offline_24h', icon: Clock, severity: 'danger', defaultEnabled: true, defaultSound: true },
    ],
  },
  {
    id: 'speed',
    items: [
      { id: 'speed_limit_80', icon: Gauge, severity: 'warning', defaultEnabled: true, defaultSound: true },
      { id: 'speed_limit_120', icon: AlertTriangle, severity: 'danger', defaultEnabled: true, defaultSound: true },
      { id: 'speed_dangerous_150', icon: Zap, severity: 'danger', defaultEnabled: true, defaultSound: true },
    ],
  },
  {
    id: 'geofence',
    items: [
      { id: 'geofence_enter_restricted', icon: MapPin, severity: 'danger', defaultEnabled: true, defaultSound: true },
      { id: 'geofence_exit_allowed', icon: LogOut, severity: 'warning', defaultEnabled: true, defaultSound: true },
      { id: 'geofence_enter_after_22', icon: MoonStar, severity: 'warning', defaultEnabled: true, defaultSound: false },
    ],
  },
  {
    id: 'maintenance',
    items: [
      { id: 'maintenance_oil', icon: Wrench, severity: 'info', defaultEnabled: true, defaultSound: false },
      { id: 'maintenance_brakes', icon: CircleDot, severity: 'warning', defaultEnabled: true, defaultSound: false },
      { id: 'maintenance_inspection', icon: ClipboardCheck, severity: 'info', defaultEnabled: true, defaultSound: false },
      { id: 'maintenance_insurance', icon: ShieldCheck, severity: 'warning', defaultEnabled: true, defaultSound: true },
    ],
  },
  {
    id: 'driver',
    items: [
      { id: 'driver_hard_brake', icon: TrendingDown, severity: 'warning', defaultEnabled: true, defaultSound: true },
      { id: 'driver_rapid_accel', icon: TrendingUp, severity: 'warning', defaultEnabled: true, defaultSound: true },
      { id: 'driver_sharp_turn', icon: RotateCcw, severity: 'warning', defaultEnabled: true, defaultSound: false },
      { id: 'driver_night_driving', icon: Car, severity: 'info', defaultEnabled: false, defaultSound: false },
    ],
  },
  {
    id: 'weather',
    items: [
      { id: 'weather_storm', icon: CloudLightning, severity: 'danger', defaultEnabled: true, defaultSound: true },
      { id: 'weather_heavy_rain', icon: CloudRain, severity: 'warning', defaultEnabled: true, defaultSound: false },
      { id: 'weather_fog', icon: CloudFog, severity: 'warning', defaultEnabled: true, defaultSound: false },
      { id: 'weather_extreme_heat', icon: ThermometerSun, severity: 'info', defaultEnabled: true, defaultSound: false },
    ],
  },
  {
    id: 'fuel',
    items: [
      { id: 'fuel_low', icon: Fuel, severity: 'warning', defaultEnabled: true, defaultSound: true },
      { id: 'fuel_abnormal', icon: TrendingDown, severity: 'warning', defaultEnabled: true, defaultSound: false },
      { id: 'fuel_theft', icon: Droplets, severity: 'danger', defaultEnabled: true, defaultSound: true },
    ],
  },
];

const VISIBLE_NOTIFICATION_META = NOTIFICATION_META.filter((item) => item.id !== 'email');

const VISIBLE_NOTIFICATION_CATEGORIES = NOTIFICATION_CATEGORIES;

const SEVERITY_STYLES = {
  info: {
    badge: 'bg-capture-primary/15 text-capture-glow border-capture-primary/30',
    icon: 'text-capture-glow',
  },
  warning: {
    badge: 'bg-capture-warning/15 text-capture-warning border-capture-warning/30',
    icon: 'text-capture-warning',
  },
  danger: {
    badge: 'bg-capture-danger/15 text-capture-danger border-capture-danger/30',
    icon: 'text-capture-danger',
  },
};

function buildDefaultNotifSettings() {
  const settings = {};
  VISIBLE_NOTIFICATION_META.forEach(({ id, defaultEnabled }) => {
    settings[id] = defaultEnabled;
  });
  VISIBLE_NOTIFICATION_CATEGORIES.forEach((category) => {
    category.items.forEach(({ id, defaultEnabled, defaultSound }) => {
      settings[id] = defaultEnabled;
      settings[`${id}_sound`] = defaultSound;
    });
  });
  return settings;
}

const DEFAULT_NOTIF = buildDefaultNotifSettings();

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persistSettings(data) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...loadSettings(), ...data }));
  if (data.notifications != null) {
    window.dispatchEvent(new CustomEvent('capture:notification-prefs'));
  }
}

function Toggle({ checked, onChange, disabled = false, ariaLabel }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => { if (!disabled) onChange(!checked); }}
      className={cn(
        'relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0',
        checked ? 'bg-capture-primary shadow-glow-sm' : 'bg-slate-600/50',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200',
          checked ? 'end-0.5' : 'start-0.5',
        )}
      />
    </button>
  );
}

function NotificationItemRow({
  item,
  t,
  enabled,
  soundOn,
  soundEnabled,
  onToggle,
  onSoundToggle,
  showSound = true,
}) {
  const Icon = item.icon;
  const severityStyle = SEVERITY_STYLES[item.severity];
  const label = t(`settings.notifications.items.${item.id}.label`);
  const description = t(`settings.notifications.items.${item.id}.description`);

  return (
    <div className="flex items-start justify-between gap-3 py-3 border-b border-slate-600/10 last:border-0">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <div className={cn('p-2 rounded-lg border shrink-0', severityStyle.badge)}>
          <Icon className={cn('w-4 h-4', severityStyle.icon)} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-slate-200">{label}</p>
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded border', severityStyle.badge)}>
              {t(`settings.notifications.severity.${item.severity}`)}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {showSound && soundEnabled && (
          <button
            type="button"
            title={soundOn ? t('settings.notifications.muteSound') : t('settings.notifications.unmuteSound')}
            aria-label={soundOn ? t('settings.notifications.muteSound') : t('settings.notifications.unmuteSound')}
            onClick={() => onSoundToggle(!soundOn)}
            className={cn(
              'p-1.5 rounded-lg border transition-colors',
              soundOn
                ? 'border-capture-primary/40 bg-capture-primary/10 text-capture-glow'
                : 'border-slate-600/30 text-slate-500 hover:text-slate-300',
            )}
          >
            {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        )}
        <Toggle checked={enabled} onChange={onToggle} ariaLabel={label} />
      </div>
    </div>
  );
}

export default function Settings() {
  const { user, role, updateProfile, verifyCurrentPassword, updateUserAttribute } = useAuth();
  const { mode, accentColor, presets, setAccentColor, setThemeMode } = useTheme();
  const { isConnected, pushNotification } = useNotificationContext();
  const { language, setLanguage, t, languages, dir } = useLocale();

  const stored = loadSettings();

  const tabs = useMemo(
    () => TAB_DEFS.map(({ id, labelKey, icon }) => ({
      id,
      icon,
      label: t(labelKey),
    })),
    [t],
  );

  const [searchParams] = useSearchParams();
  const initialTab = TAB_DEFS.some(({ id }) => id === searchParams.get('tab'))
    ? searchParams.get('tab')
    : 'profile';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [profile, setProfile] = useState({
    name: stored.profile?.name ?? user?.name ?? '',
    email: stored.profile?.email ?? user?.email ?? '',
    phone: stored.profile?.phone ?? user?.phone ?? '',
    company: stored.profile?.company ?? '',
    avatar: stored.profile?.avatar ?? user?.avatar ?? '',
  });
  const [notifSettings, setNotifSettings] = useState({
    ...DEFAULT_NOTIF,
    deviceFilterMode: 'all',
    deviceFilterIds: [],
    ...stored.notifications,
  });
  const [soundEnabled, setSoundEnabled] = useState(stored.soundEnabled ?? true);
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [customAccent, setCustomAccent] = useState(accentColor);

  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef(null);

  useEffect(() => {
    setCustomAccent(accentColor);
  }, [accentColor]);

  useEffect(() => {
    if (!user) return;
    setProfile((prev) => ({
      ...prev,
      name: user.name ?? prev.name,
      email: user.email ?? prev.email,
      phone: user.phone ?? prev.phone,
      avatar: user.avatar ?? prev.avatar,
    }));
  }, [user]);

  const changingPassword = passwords.current || passwords.next || passwords.confirm;
  const tabBaselines = useRef(null);

  const getTabSnapshot = useCallback((tab) => {
    switch (tab) {
      case 'profile':
        return JSON.stringify(profile);
      case 'notifications':
        return JSON.stringify({ notifSettings, soundEnabled });
      case 'security':
        return JSON.stringify(passwords);
      case 'appearance':
        return JSON.stringify({ customAccent, mode });
      case 'language':
        return language;
      default:
        return '';
    }
  }, [profile, notifSettings, soundEnabled, passwords, customAccent, mode, language]);

  const syncTabBaseline = useCallback((tab) => {
    if (!tabBaselines.current) tabBaselines.current = {};
    tabBaselines.current[tab] = getTabSnapshot(tab);
  }, [getTabSnapshot]);

  const isTabDirty = useCallback((tab) => {
    if (!tabBaselines.current?.[tab]) return false;
    return getTabSnapshot(tab) !== tabBaselines.current[tab];
  }, [getTabSnapshot]);

  useEffect(() => {
    if (tabBaselines.current) return;
    tabBaselines.current = Object.fromEntries(
      TAB_DEFS.map(({ id }) => [id, getTabSnapshot(id)]),
    );
  }, [getTabSnapshot]);

  const requestTab = (id) => {
    if (id === activeTab) return;
    if (isTabDirty(activeTab) && !window.confirm(t('settings.unsavedConfirm'))) return;
    setActiveTab(id);
    setFieldErrors({});
  };

  const handleAvatarSelect = useCallback(async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setAvatarUploading(true);
    setFieldErrors((prev) => ({ ...prev, avatar: undefined, form: undefined }));
    try {
      const dataUrl = await processAvatarFile(file, t);
      await updateUserAttribute(USER_ATTR_CAPTURE_AVATAR, dataUrl);
      setProfile((prev) => {
        const next = { ...prev, avatar: dataUrl };
        persistSettings({ profile: next });
        return next;
      });
      pushNotification?.({
        type: 'success',
        title: t('settings.saveSuccessTitle'),
        message: t('settings.profile.photoUploaded'),
      });
    } catch (err) {
      setFieldErrors((prev) => ({ ...prev, avatar: err.message || t('settings.saveFailed') }));
    } finally {
      setAvatarUploading(false);
    }
  }, [t, updateUserAttribute, pushNotification]);

  const handleAvatarRemove = useCallback(async () => {
    setAvatarUploading(true);
    setFieldErrors((prev) => ({ ...prev, avatar: undefined, form: undefined }));
    try {
      await updateUserAttribute(USER_ATTR_CAPTURE_AVATAR, null);
      setProfile((prev) => {
        const next = { ...prev, avatar: '' };
        persistSettings({ profile: next });
        return next;
      });
      pushNotification?.({
        type: 'success',
        title: t('settings.saveSuccessTitle'),
        message: t('settings.profile.removePhoto'),
      });
    } catch (err) {
      setFieldErrors((prev) => ({ ...prev, avatar: err.message || t('settings.saveFailed') }));
    } finally {
      setAvatarUploading(false);
    }
  }, [t, updateUserAttribute, pushNotification]);

  const handleSave = useCallback(async () => {
    setFieldErrors({});
    setSaveSuccess(false);

    let errors = {};
    if (activeTab === 'profile') {
      errors = validateProfile(profile, t);
    } else if (activeTab === 'security' && changingPassword) {
      errors = validateSecurity(passwords, true, t, language);
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSaving(true);
    setSaveSuccess(false);

    try {
      if (activeTab === 'profile') {
        await updateProfile({
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
        });
        persistSettings({ profile });
      } else if (activeTab === 'notifications') {
        persistSettings({ notifications: notifSettings, soundEnabled });
      } else if (activeTab === 'security') {
        if (changingPassword) {
          await verifyCurrentPassword(passwords.current);
          await updateProfile({ password: passwords.next });
          setPasswords({ current: '', next: '', confirm: '' });
        }
      } else if (activeTab === 'appearance') {
        setAccentColor(customAccent);
        persistSettings({ accent: customAccent, mode });
      } else if (activeTab === 'language') {
        persistSettings({ language });
      }

      syncTabBaseline(activeTab);

      const activeTabLabel = tabs.find((tab) => tab.id === activeTab)?.label ?? activeTab;
      pushNotification?.({
        type: 'success',
        title: t('settings.saveSuccessTitle'),
        message: t('settings.saveSuccessMessage', { tab: activeTabLabel }),
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      setFieldErrors({ form: err.message || t('settings.saveFailed') });
    } finally {
      setSaving(false);
    }
  }, [
    activeTab, profile, notifSettings, soundEnabled, passwords,
    changingPassword, customAccent, mode, language, setAccentColor, pushNotification,
    updateProfile, verifyCurrentPassword, syncTabBaseline, t, tabs,
  ]);

  return (
    <div dir={dir} className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">{t('settings.title')}</h1>
        <p className="text-sm text-capture-metallic mt-1">{t('settings.subtitle')}</p>
        {fieldErrors.form && (
          <p className="mt-2 text-sm text-rose-400">{fieldErrors.form}</p>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tab navigation */}
        <nav className="lg:w-56 shrink-0 capture-card p-2 space-y-1 h-fit">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => requestTab(id)}
              aria-current={activeTab === id ? 'page' : undefined}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                activeTab === id
                  ? 'bg-capture-primary/20 text-capture-glow border border-capture-primary/30 shadow-glow-sm'
                  : 'text-capture-metallic hover:bg-capture-surface/60 hover:text-slate-200 border border-transparent',
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </button>
          ))}

          {/* Connection status */}
          <div className="mt-3 pt-3 border-t border-slate-600/20 px-3">
            <p className="text-[10px] text-slate-500 mb-1">{t('settings.connection.title')}</p>
            <div className="flex items-center gap-1.5">
              <span className={cn(
                'w-2 h-2 rounded-full',
                isConnected ? 'bg-capture-success shadow-[0_0_6px_rgba(16,185,129,0.6)]' : 'bg-slate-500',
              )}
              />
              <span className="text-xs text-slate-400">
                {isConnected ? t('settings.connection.connected') : t('settings.connection.disconnected')}
              </span>
            </div>
          </div>
        </nav>

        {/* Tab content */}
        <div className="flex-1 capture-card p-6 min-h-[480px] flex flex-col">
          {/* ── Profile ── */}
          {activeTab === 'profile' && (
            <div className="space-y-6 flex-1" role="region" aria-labelledby="settings-profile-title">
              <div>
                <h2 id="settings-profile-title" className="font-semibold text-slate-100 text-lg">
                  {t('settings.profile.title')}
                </h2>
                {role && (
                  <span className="inline-block mt-2 px-2.5 py-0.5 text-[10px] font-medium rounded-full bg-capture-primary/15 text-capture-glow border border-capture-primary/25">
                    {getRoleLabel(role, language)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-capture-primary to-cyan-700 flex items-center justify-center shadow-glow-sm overflow-hidden">
                    {profile.avatar ? (
                      <img
                        src={profile.avatar}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-8 h-8 text-slate-950" />
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={avatarUploading}
                    onClick={() => avatarInputRef.current?.click()}
                    title={t('settings.profile.changePhoto')}
                    className={cn(
                      'absolute -bottom-1 -start-1 p-1.5 bg-capture-card rounded-full border border-slate-600/30 transition-colors',
                      avatarUploading
                        ? 'opacity-50 cursor-wait'
                        : 'hover:border-capture-primary/40 hover:text-capture-glow',
                    )}
                    aria-label={t('settings.profile.changePhoto')}
                  >
                    <Camera className="w-3.5 h-3.5 text-capture-metallic" />
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept={AVATAR_ACCEPT}
                    className="sr-only"
                    aria-hidden="true"
                    tabIndex={-1}
                    onChange={handleAvatarSelect}
                  />
                </div>
                <div>
                  <p className="font-medium text-slate-100">{profile.name || t('common.notAvailable')}</p>
                  <p className="text-sm text-slate-400" dir="ltr">{profile.email}</p>
                  {avatarUploading && (
                    <p className="text-xs text-capture-glow mt-1">{t('settings.profile.photoUploading')}</p>
                  )}
                  {fieldErrors.avatar && (
                    <p className="text-xs text-rose-400 mt-1">{fieldErrors.avatar}</p>
                  )}
                  {profile.avatar && !avatarUploading && (
                    <button
                      type="button"
                      onClick={handleAvatarRemove}
                      className="text-xs text-slate-500 hover:text-rose-400 mt-1 transition-colors"
                    >
                      {t('settings.profile.removePhoto')}
                    </button>
                  )}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  id="profile-name"
                  label={t('settings.profile.name')}
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  error={fieldErrors.name}
                  leftIcon={<User className="w-4 h-4" />}
                />
                <Input
                  id="profile-email"
                  label={t('settings.profile.email')}
                  type="email"
                  dir="ltr"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  error={fieldErrors.email}
                  leftIcon={<Mail className="w-4 h-4" />}
                />
                <Input
                  id="profile-phone"
                  label={t('settings.profile.phone')}
                  dir="ltr"
                  inputMode="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: toWesternNumerals(e.target.value) })}
                  error={fieldErrors.phone}
                  placeholder="+212 6 12 34 56 78"
                  inputClassName={NUMERIC_DISPLAY_CLASS}
                />
                <Input
                  id="profile-company"
                  label={t('settings.profile.company')}
                  value={profile.company}
                  onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                  hint={t('settings.profile.companyLocalHint')}
                />
              </div>
            </div>
          )}

          {/* ── Notifications ── */}
          {activeTab === 'notifications' && (
            <div className="space-y-4 flex-1">
              <h2 className="font-semibold text-slate-100 text-lg">{t('settings.notifications.title')}</h2>

              {/* Sound toggle */}
              <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-capture-bg/40 border border-slate-600/20">
                <div className="flex items-center gap-3">
                  {soundEnabled
                    ? <Volume2 className="w-5 h-5 text-capture-glow" />
                    : <VolumeX className="w-5 h-5 text-slate-500" />}
                  <div>
                    <p className="text-sm font-medium text-slate-200">{t('settings.notifications.sound')}</p>
                    <p className="text-xs text-slate-500">{t('settings.notifications.soundDesc')}</p>
                  </div>
                </div>
                <Toggle
                  checked={soundEnabled}
                  onChange={setSoundEnabled}
                  ariaLabel={t('settings.notifications.sound')}
                />
              </div>

              <div className="rounded-xl bg-capture-bg/40 border border-slate-600/20 px-4">
                <h3 className="text-sm font-semibold text-slate-300 pt-4 pb-1">{t('settings.notifications.general')}</h3>
                {VISIBLE_NOTIFICATION_META.map((item) => (
                  <NotificationItemRow
                    key={item.id}
                    item={item}
                    t={t}
                    enabled={notifSettings[item.id] ?? item.defaultEnabled}
                    soundOn={false}
                    soundEnabled={soundEnabled}
                    showSound={false}
                    onToggle={(val) => setNotifSettings({ ...notifSettings, [item.id]: val })}
                    onSoundToggle={() => {}}
                  />
                ))}
              </div>

              <NotificationDeviceFilter
                mode={notifSettings.deviceFilterMode ?? 'all'}
                deviceIds={notifSettings.deviceFilterIds ?? []}
                onModeChange={(deviceFilterMode) => setNotifSettings({ ...notifSettings, deviceFilterMode })}
                onDeviceIdsChange={(deviceFilterIds) => setNotifSettings({ ...notifSettings, deviceFilterIds })}
              />

              {VISIBLE_NOTIFICATION_CATEGORIES.map((category) => (
                <div
                  key={category.id}
                  className="rounded-xl bg-capture-bg/40 border border-slate-600/20 px-4"
                >
                  <h3 className="text-sm font-semibold text-slate-300 pt-4 pb-1">{t(`settings.notifications.categories.${category.id}`)}</h3>
                  {category.items.map((item) => (
                    <NotificationItemRow
                      key={item.id}
                      item={item}
                      t={t}
                      enabled={notifSettings[item.id] ?? item.defaultEnabled}
                      soundOn={notifSettings[`${item.id}_sound`] ?? item.defaultSound}
                      soundEnabled={soundEnabled}
                      onToggle={(val) => setNotifSettings({ ...notifSettings, [item.id]: val })}
                      onSoundToggle={(val) => setNotifSettings({ ...notifSettings, [`${item.id}_sound`]: val })}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* ── Security ── */}
          {activeTab === 'security' && (
            <div className="space-y-6 flex-1">
              <h2 className="font-semibold text-slate-100 text-lg">{t('settings.security.title')}</h2>

              <TotpEnrollmentPanel />

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-capture-metallic" />
                  {t('settings.security.changePassword')}
                </h3>
                <Input
                  id="pwd-current"
                  label={t('settings.security.currentPassword')}
                  type="password"
                  value={passwords.current}
                  onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                  error={fieldErrors.current}
                  autoComplete="current-password"
                />
                <Input
                  id="pwd-next"
                  label={t('settings.security.newPassword')}
                  type="password"
                  value={passwords.next}
                  onChange={(e) => setPasswords({ ...passwords, next: e.target.value })}
                  error={fieldErrors.next}
                  hint={t('settings.security.passwordHint')}
                  autoComplete="new-password"
                />
                <Input
                  id="pwd-confirm"
                  label={t('settings.security.confirmPassword')}
                  type="password"
                  value={passwords.confirm}
                  onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                  error={fieldErrors.confirm}
                  autoComplete="new-password"
                />
              </div>
            </div>
          )}

          {/* ── Appearance ── */}
          {activeTab === 'appearance' && (
            <div className="space-y-6 flex-1">
              <h2 className="font-semibold text-slate-100 text-lg">{t('settings.appearance.title')}</h2>

              <div>
                <p className="text-sm font-medium text-slate-300 mb-3">{t('settings.appearance.themeMode')}</p>
                <div className="flex gap-3">
                  {[
                    { id: 'dark', labelKey: 'settings.appearance.dark', icon: Moon },
                    { id: 'light', labelKey: 'settings.appearance.light', icon: Sun },
                  ].map(({ id, labelKey, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setThemeMode(id)}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all',
                        mode === id
                          ? 'border-capture-primary/40 bg-capture-primary/15 text-capture-glow shadow-glow-sm'
                          : 'border-slate-600/30 text-slate-400 hover:border-slate-500/40',
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {t(labelKey)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-300 mb-3">{t('settings.appearance.presets')}</p>
                <div className="flex flex-wrap gap-2">
                  {presets.map(({ id, value }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setCustomAccent(value)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-lg text-xs border transition-all',
                        customAccent === value
                          ? 'border-capture-primary/50 bg-capture-primary/10 text-capture-glow'
                          : 'border-slate-600/30 text-slate-400 hover:border-slate-500/40',
                      )}
                    >
                      <span
                        className="w-4 h-4 rounded-full border border-white/20"
                        style={{ background: value }}
                      />
                      {t(`settings.appearance.presetColors.${id}`)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-300 mb-3">{t('settings.appearance.customColor')}</p>
                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    value={customAccent}
                    onChange={(e) => setCustomAccent(e.target.value)}
                    className="w-14 h-14 rounded-xl border border-slate-600/30 cursor-pointer bg-transparent"
                  />
                  <div>
                    <p className="text-sm font-mono text-slate-300">{customAccent}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {t('settings.appearance.defaultColor')}: {COLORS.primary}
                    </p>
                  </div>
                  {/* Preview swatch */}
                  <div
                    className="ms-auto w-24 h-10 rounded-lg border border-slate-600/30 shadow-glow-sm"
                    style={{ background: `linear-gradient(135deg, ${customAccent}, ${customAccent}88)` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Language ── */}
          {activeTab === 'language' && (
            <div className="space-y-4 flex-1">
              <h2 className="font-semibold text-slate-100 text-lg">{t('settings.language.title')}</h2>
              <p className="text-xs text-slate-500 mb-2">{t('settings.language.subtitle')}</p>

              {languages.map(({ id, label, flag }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setLanguage(id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all duration-200',
                    language === id
                      ? 'border-capture-primary/40 bg-capture-primary/10 shadow-glow-sm'
                      : 'border-slate-600/25 hover:border-slate-500/40 hover:bg-capture-surface/40',
                  )}
                >
                  <span className="text-2xl">{flag}</span>
                  <span className={cn(
                    'text-sm font-medium',
                    language === id ? 'text-capture-glow' : 'text-slate-300',
                  )}
                  >
                    {label}
                  </span>
                  {language === id && (
                    <CheckCircle className="w-4 h-4 text-capture-glow ms-auto" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Save footer */}
          <div className="mt-8 pt-6 border-t border-slate-600/20 flex items-center gap-4">
            <Button
              variant="primary"
              size="md"
              loading={saving}
              onClick={handleSave}
              leftIcon={saveSuccess ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              className={cn(
                saveSuccess && '!bg-capture-success !border-capture-success/50 shadow-[0_0_20px_rgba(16,185,129,0.4)]',
              )}
            >
              {saving ? t('common.saving') : saveSuccess ? t('common.saved') : t('common.save')}
            </Button>

            {saveSuccess && (
              <span className="text-sm text-capture-success animate-[fade-in_0.3s_ease-out] flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" />
                {t('settings.saveSuccessTitle')}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
