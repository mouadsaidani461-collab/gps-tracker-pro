import { useState, useEffect, useCallback } from 'react';
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
import { useAuth, ROLE_LABELS } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNotificationContext } from '../context/NotificationContext';
import { LOCALE, COLORS } from '../utils/constants';
import { NUMERIC_DISPLAY_CLASS, toWesternNumerals } from '../utils/formatters';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

const SETTINGS_KEY = 'capture_settings';

const TABS = [
  { id: 'profile', label: 'الملف الشخصي', icon: User },
  { id: 'notifications', label: 'الإشعارات', icon: Bell },
  { id: 'security', label: 'الأمان', icon: Shield },
  { id: 'appearance', label: 'المظهر', icon: Palette },
  { id: 'language', label: 'اللغة', icon: Globe },
];

const NOTIFICATION_META = [
  { id: 'email', label: 'إشعارات البريد', description: 'إرسال نسخة عبر البريد الإلكتروني', icon: Mail, severity: 'info', defaultEnabled: false },
  { id: 'critical', label: 'تنبيهات حرجة', description: 'إشعارات فورية للحالات الحرجة', icon: BellRing, severity: 'danger', defaultEnabled: true },
];

const NOTIFICATION_CATEGORIES = [
  {
    id: 'battery',
    title: 'تنبيهات البطارية',
    items: [
      { id: 'battery_low', label: 'بطارية منخفضة', description: 'عند انخفاض مستوى البطارية عن 20%', icon: BatteryLow, severity: 'warning', defaultEnabled: true, defaultSound: true },
      { id: 'battery_critical', label: 'بطارية حرجة', description: 'عند انخفاض مستوى البطارية عن 10%', icon: BatteryWarning, severity: 'danger', defaultEnabled: true, defaultSound: true },
      { id: 'battery_not_charging', label: 'الجهاز غير مشحون', description: 'عند توقف الشحن رغم انخفاض البطارية', icon: PlugZap, severity: 'warning', defaultEnabled: true, defaultSound: false },
    ],
  },
  {
    id: 'offline',
    title: 'الجهاز غير متصل',
    items: [
      { id: 'offline_30m', label: 'غير متصل > 30 دقيقة', description: 'تنبيه عند انقطاع الاتصال لأكثر من 30 دقيقة', icon: WifiOff, severity: 'warning', defaultEnabled: true, defaultSound: false },
      { id: 'offline_2h', label: 'غير متصل > ساعتين', description: 'تنبيه عند انقطاع الاتصال لأكثر من ساعتين', icon: Timer, severity: 'warning', defaultEnabled: true, defaultSound: true },
      { id: 'offline_24h', label: 'غير متصل > 24 ساعة', description: 'تنبيه عند انقطاع الاتصال لأكثر من 24 ساعة', icon: Clock, severity: 'danger', defaultEnabled: true, defaultSound: true },
    ],
  },
  {
    id: 'speed',
    title: 'تنبيهات السرعة',
    items: [
      { id: 'speed_limit_80', label: 'تجاوز 80 كم/س', description: 'تنبيه عند تجاوز حد السرعة 80 كم/س', icon: Gauge, severity: 'warning', defaultEnabled: true, defaultSound: true },
      { id: 'speed_limit_120', label: 'تجاوز 120 كم/س', description: 'تنبيه عند تجاوز حد السرعة 120 كم/س', icon: AlertTriangle, severity: 'danger', defaultEnabled: true, defaultSound: true },
      { id: 'speed_dangerous_150', label: 'سرعة خطرة > 150 كم/س', description: 'تنبيه فوري للسرعات الخطرة فوق 150 كم/س', icon: Zap, severity: 'danger', defaultEnabled: true, defaultSound: true },
    ],
  },
  {
    id: 'geofence',
    title: 'تنبيهات المناطق الجغرافية',
    items: [
      { id: 'geofence_enter_restricted', label: 'دخول منطقة محظورة', description: 'عند دخول مركبة إلى منطقة جغرافية محظورة', icon: MapPin, severity: 'danger', defaultEnabled: true, defaultSound: true },
      { id: 'geofence_exit_allowed', label: 'خروج من منطقة مسموحة', description: 'عند خروج المركبة من المنطقة المسموح بها', icon: LogOut, severity: 'warning', defaultEnabled: true, defaultSound: true },
      { id: 'geofence_enter_after_22', label: 'دخول بعد 22:00', description: 'دخول منطقة جغرافية بعد الساعة 22:00', icon: MoonStar, severity: 'warning', defaultEnabled: true, defaultSound: false },
    ],
  },
  {
    id: 'maintenance',
    title: 'تذكيرات الصيانة',
    items: [
      { id: 'maintenance_oil', label: 'تغيير الزيت', description: 'تذكير كل 5000 كم', icon: Wrench, severity: 'info', defaultEnabled: true, defaultSound: false },
      { id: 'maintenance_brakes', label: 'فحص الفرامل', description: 'تذكير بفحص نظام الفرامل', icon: CircleDot, severity: 'warning', defaultEnabled: true, defaultSound: false },
      { id: 'maintenance_inspection', label: 'فحص عام', description: 'تذكير بالفحص الدوري للمركبة', icon: ClipboardCheck, severity: 'info', defaultEnabled: true, defaultSound: false },
      { id: 'maintenance_insurance', label: 'انتهاء التأمين', description: 'تذكير قبل انتهاء صلاحية التأمين', icon: ShieldCheck, severity: 'warning', defaultEnabled: true, defaultSound: true },
    ],
  },
  {
    id: 'driver',
    title: 'سلوك السائق',
    items: [
      { id: 'driver_hard_brake', label: 'فرملة قوية', description: 'كشف فرملة مفاجئة أو قوية', icon: TrendingDown, severity: 'warning', defaultEnabled: true, defaultSound: true },
      { id: 'driver_rapid_accel', label: 'تسارع مفاجئ', description: 'كشف تسارع سريع أو غير طبيعي', icon: TrendingUp, severity: 'warning', defaultEnabled: true, defaultSound: true },
      { id: 'driver_sharp_turn', label: 'انعطاف حاد', description: 'كشف انعطاف حاد بسرعة مرتفعة', icon: RotateCcw, severity: 'warning', defaultEnabled: true, defaultSound: false },
      { id: 'driver_night_driving', label: 'قيادة ليلية', description: 'تنبيه عند القيادة في ساعات متأخرة من الليل', icon: Car, severity: 'info', defaultEnabled: false, defaultSound: false },
    ],
  },
  {
    id: 'weather',
    title: 'تنبيهات الطقس',
    items: [
      { id: 'weather_storm', label: 'عاصفة', description: 'تنبيه بعاصفة في منطقة المركبة', icon: CloudLightning, severity: 'danger', defaultEnabled: true, defaultSound: true },
      { id: 'weather_heavy_rain', label: 'أمطار غزيرة', description: 'تنبيه بأمطار غزيرة قد تؤثر على القيادة', icon: CloudRain, severity: 'warning', defaultEnabled: true, defaultSound: false },
      { id: 'weather_fog', label: 'ضباب', description: 'تنبيه بانخفاض الرؤية بسبب الضباب', icon: CloudFog, severity: 'warning', defaultEnabled: true, defaultSound: false },
      { id: 'weather_extreme_heat', label: 'حرارة شديدة', description: 'تنبيه بدرجات حرارة مرتفعة جداً', icon: ThermometerSun, severity: 'info', defaultEnabled: true, defaultSound: false },
    ],
  },
  {
    id: 'fuel',
    title: 'تنبيهات الوقود',
    items: [
      { id: 'fuel_low', label: 'مستوى وقود منخفض', description: 'عند انخفاض مستوى الوقود عن الحد المحدد', icon: Fuel, severity: 'warning', defaultEnabled: true, defaultSound: true },
      { id: 'fuel_abnormal', label: 'استهلاك غير طبيعي', description: 'كشف استهلاك وقود أعلى من المعدل المعتاد', icon: TrendingDown, severity: 'warning', defaultEnabled: true, defaultSound: false },
      { id: 'fuel_theft', label: 'سرقة وقود', description: 'انخفاض مفاجئ في مستوى الوقود (احتمال سرقة)', icon: Droplets, severity: 'danger', defaultEnabled: true, defaultSound: true },
    ],
  },
];

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

const SEVERITY_LABELS = {
  info: 'معلومة',
  warning: 'تحذير',
  danger: 'خطر',
};

function buildDefaultNotifSettings() {
  const settings = {};
  NOTIFICATION_META.forEach(({ id, defaultEnabled }) => {
    settings[id] = defaultEnabled;
  });
  NOTIFICATION_CATEGORIES.forEach((category) => {
    category.items.forEach(({ id, defaultEnabled, defaultSound }) => {
      settings[id] = defaultEnabled;
      settings[`${id}_sound`] = defaultSound;
    });
  });
  return settings;
}

const DEFAULT_NOTIF = buildDefaultNotifSettings();

const LANGUAGES = [
  { id: 'ar', label: 'العربية', flag: '🇲🇦', dir: 'rtl' },
  { id: 'fr', label: 'Français', flag: '🇫🇷', dir: 'ltr' },
  { id: 'en', label: 'English', flag: '🇬🇧', dir: 'ltr' },
];

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
}

function Toggle({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0',
        checked ? 'bg-capture-primary shadow-glow-sm' : 'bg-slate-600/50',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200',
          checked ? 'start-0.5' : 'start-[22px]',
        )}
      />
    </button>
  );
}

function NotificationItemRow({
  item,
  enabled,
  soundOn,
  soundEnabled,
  onToggle,
  onSoundToggle,
  showSound = true,
}) {
  const Icon = item.icon;
  const severityStyle = SEVERITY_STYLES[item.severity];

  return (
    <div className="flex items-start justify-between gap-3 py-3 border-b border-slate-600/10 last:border-0">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <div className={cn('p-2 rounded-lg border shrink-0', severityStyle.badge)}>
          <Icon className={cn('w-4 h-4', severityStyle.icon)} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-slate-200">{item.label}</p>
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded border', severityStyle.badge)}>
              {SEVERITY_LABELS[item.severity]}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {showSound && soundEnabled && (
          <button
            type="button"
            title={soundOn ? 'إيقاف الصوت' : 'تشغيل الصوت'}
            aria-label={soundOn ? 'إيقاف الصوت' : 'تشغيل الصوت'}
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
        <Toggle checked={enabled} onChange={onToggle} />
      </div>
    </div>
  );
}

function validateProfile(profile) {
  const errors = {};
  if (!profile.name?.trim()) errors.name = 'الاسم مطلوب';
  else if (profile.name.trim().length < 2) errors.name = 'الاسم يجب أن يكون حرفين على الأقل';
  if (!profile.email?.trim()) errors.email = 'البريد الإلكتروني مطلوب';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim())) {
    errors.email = 'البريد الإلكتروني غير صالح';
  }
  if (profile.phone?.trim() && !/^\+?[\d\s-]{8,}$/.test(profile.phone.trim())) {
    errors.phone = 'رقم الهاتف غير صالح';
  }
  return errors;
}

function validateSecurity(passwords, changing) {
  if (!changing) return {};
  const errors = {};
  if (!passwords.current) errors.current = 'كلمة المرور الحالية مطلوبة';
  if (!passwords.next) errors.next = 'كلمة المرور الجديدة مطلوبة';
  else if (passwords.next.length < 6) errors.next = '6 أحرف على الأقل';
  if (passwords.next !== passwords.confirm) errors.confirm = 'كلمات المرور غير متطابقة';
  return errors;
}

export default function Settings() {
  const { user, role, updateProfile } = useAuth();
  const { mode, isDark, accentColor, presets, setAccentColor, setThemeMode } = useTheme();
  const { isConnected, pushNotification } = useNotificationContext();

  const stored = loadSettings();

  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState({
    name: stored.profile?.name ?? user?.name ?? '',
    email: stored.profile?.email ?? user?.email ?? '',
    phone: stored.profile?.phone ?? user?.phone ?? '',
    company: stored.profile?.company ?? user?.company ?? '',
  });
  const [notifSettings, setNotifSettings] = useState({
    ...DEFAULT_NOTIF,
    ...stored.notifications,
  });
  const [soundEnabled, setSoundEnabled] = useState(stored.soundEnabled ?? true);
  const [twoFA, setTwoFA] = useState(stored.twoFA ?? false);
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [language, setLanguage] = useState(stored.language ?? LOCALE.fallback);
  const [customAccent, setCustomAccent] = useState(accentColor);

  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

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
    }));
  }, [user]);

  useEffect(() => {
    const lang = LANGUAGES.find((l) => l.id === language);
    if (lang) {
      document.documentElement.lang = lang.id;
      document.documentElement.dir = lang.dir;
    }
  }, [language]);

  const changingPassword = passwords.current || passwords.next || passwords.confirm;

  const handleSave = useCallback(async () => {
    setFieldErrors({});
    setSaveSuccess(false);

    let errors = {};
    if (activeTab === 'profile') {
      errors = validateProfile(profile);
    } else if (activeTab === 'security' && changingPassword) {
      errors = validateSecurity(passwords, true);
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
        persistSettings({ twoFA });
        if (changingPassword) {
          await updateProfile({ password: passwords.next });
          setPasswords({ current: '', next: '', confirm: '' });
        }
      } else if (activeTab === 'appearance') {
        setAccentColor(customAccent);
        persistSettings({ accent: customAccent, mode });
      } else if (activeTab === 'language') {
        persistSettings({ language });
      }

      pushNotification?.({
        type: 'success',
        title: 'تم حفظ الإعدادات',
        message: `تم تحديث ${TABS.find((t) => t.id === activeTab)?.label} بنجاح`,
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      setFieldErrors({ form: err.message || 'تعذّر حفظ الإعدادات' });
    } finally {
      setSaving(false);
    }
  }, [
    activeTab, profile, notifSettings, soundEnabled, twoFA, passwords,
    changingPassword, customAccent, mode, language, setAccentColor, pushNotification, updateProfile,
  ]);

  return (
    <div dir="rtl" className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">الإعدادات</h1>
        <p className="text-sm text-capture-metallic mt-1">إدارة حسابك وتفضيلات النظام</p>
        {fieldErrors.form && (
          <p className="mt-2 text-sm text-rose-400">{fieldErrors.form}</p>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tab navigation */}
        <nav className="lg:w-56 shrink-0 capture-card p-2 space-y-1 h-fit">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => { setActiveTab(id); setFieldErrors({}); }}
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
            <p className="text-[10px] text-slate-500 mb-1">حالة الاتصال</p>
            <div className="flex items-center gap-1.5">
              <span className={cn(
                'w-2 h-2 rounded-full',
                isConnected ? 'bg-capture-success shadow-[0_0_6px_rgba(16,185,129,0.6)]' : 'bg-slate-500',
              )}
              />
              <span className="text-xs text-slate-400">
                {isConnected ? 'WebSocket متصل' : 'غير متصل'}
              </span>
            </div>
          </div>
        </nav>

        {/* Tab content */}
        <div className="flex-1 capture-card p-6 min-h-[480px] flex flex-col">
          {/* ── Profile ── */}
          {activeTab === 'profile' && (
            <div className="space-y-6 flex-1">
              <div>
                <h2 className="font-semibold text-slate-100 text-lg">الملف الشخصي</h2>
                {role && (
                  <span className="inline-block mt-2 px-2.5 py-0.5 text-[10px] font-medium rounded-full bg-capture-primary/15 text-capture-glow border border-capture-primary/25">
                    {ROLE_LABELS[role] ?? role}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-capture-primary to-cyan-700 flex items-center justify-center shadow-glow-sm">
                    <User className="w-8 h-8 text-slate-950" />
                  </div>
                  <button
                    type="button"
                    className="absolute -bottom-1 -start-1 p-1.5 bg-capture-card rounded-full border border-slate-600/30 hover:shadow-glow-sm transition-all"
                    aria-label="تغيير الصورة"
                  >
                    <Camera className="w-3.5 h-3.5 text-capture-metallic" />
                  </button>
                </div>
                <div>
                  <p className="font-medium text-slate-100">{profile.name || '—'}</p>
                  <p className="text-sm text-slate-400">{profile.email}</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  id="profile-name"
                  label="الاسم"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  error={fieldErrors.name}
                  leftIcon={<User className="w-4 h-4" />}
                />
                <Input
                  id="profile-email"
                  label="البريد الإلكتروني"
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  error={fieldErrors.email}
                  leftIcon={<Mail className="w-4 h-4" />}
                />
                <Input
                  id="profile-phone"
                  label="الهاتف"
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
                  label="الشركة"
                  value={profile.company}
                  onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* ── Notifications ── */}
          {activeTab === 'notifications' && (
            <div className="space-y-4 flex-1">
              <h2 className="font-semibold text-slate-100 text-lg">إعدادات الإشعارات</h2>

              {/* Sound toggle */}
              <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-capture-bg/40 border border-slate-600/20">
                <div className="flex items-center gap-3">
                  {soundEnabled
                    ? <Volume2 className="w-5 h-5 text-capture-glow" />
                    : <VolumeX className="w-5 h-5 text-slate-500" />}
                  <div>
                    <p className="text-sm font-medium text-slate-200">صوت التنبيهات</p>
                    <p className="text-xs text-slate-500">تشغيل صوت للتنبيهات الحرجة</p>
                  </div>
                </div>
                <Toggle checked={soundEnabled} onChange={setSoundEnabled} />
              </div>

              <div className="rounded-xl bg-capture-bg/40 border border-slate-600/20 px-4">
                <h3 className="text-sm font-semibold text-slate-300 pt-4 pb-1">إعدادات عامة</h3>
                {NOTIFICATION_META.map((item) => (
                  <NotificationItemRow
                    key={item.id}
                    item={item}
                    enabled={notifSettings[item.id]}
                    soundOn={false}
                    soundEnabled={soundEnabled}
                    showSound={false}
                    onToggle={(val) => setNotifSettings({ ...notifSettings, [item.id]: val })}
                    onSoundToggle={() => {}}
                  />
                ))}
              </div>

              {NOTIFICATION_CATEGORIES.map((category) => (
                <div
                  key={category.id}
                  className="rounded-xl bg-capture-bg/40 border border-slate-600/20 px-4"
                >
                  <h3 className="text-sm font-semibold text-slate-300 pt-4 pb-1">{category.title}</h3>
                  {category.items.map((item) => (
                    <NotificationItemRow
                      key={item.id}
                      item={item}
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
              <h2 className="font-semibold text-slate-100 text-lg">الأمان</h2>

              <div className="flex items-center justify-between py-4 px-4 rounded-xl bg-capture-bg/40 border border-slate-600/20">
                <div>
                  <p className="text-sm font-medium text-slate-200">المصادقة الثنائية (2FA)</p>
                  <p className="text-xs text-slate-500 mt-0.5">طبقة أمان إضافية عبر SMS أو تطبيق</p>
                </div>
                <Toggle checked={twoFA} onChange={setTwoFA} />
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-capture-metallic" />
                  تغيير كلمة المرور
                </h3>
                <Input
                  id="pwd-current"
                  label="كلمة المرور الحالية"
                  type="password"
                  value={passwords.current}
                  onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                  error={fieldErrors.current}
                  autoComplete="current-password"
                />
                <Input
                  id="pwd-next"
                  label="كلمة المرور الجديدة"
                  type="password"
                  value={passwords.next}
                  onChange={(e) => setPasswords({ ...passwords, next: e.target.value })}
                  error={fieldErrors.next}
                  hint="6 أحرف على الأقل"
                  autoComplete="new-password"
                />
                <Input
                  id="pwd-confirm"
                  label="تأكيد كلمة المرور"
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
              <h2 className="font-semibold text-slate-100 text-lg">المظهر</h2>

              <div>
                <p className="text-sm font-medium text-slate-300 mb-3">وضع العرض</p>
                <div className="flex gap-3">
                  {[
                    { id: 'dark', label: 'داكن', icon: Moon },
                    { id: 'light', label: 'فاتح', icon: Sun },
                  ].map(({ id, label, icon: Icon }) => (
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
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-300 mb-3">ألوان جاهزة</p>
                <div className="flex flex-wrap gap-2">
                  {presets.map(({ id, label, value }) => (
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
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-300 mb-3">لون مخصص</p>
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
                      الافتراضي: {COLORS.primary}
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
              <h2 className="font-semibold text-slate-100 text-lg">اللغة</h2>
              <p className="text-xs text-slate-500 mb-2">اختر لغة واجهة النظام</p>

              {LANGUAGES.map(({ id, label, flag }) => (
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
              {saving ? 'جاري الحفظ...' : saveSuccess ? 'تم الحفظ!' : 'حفظ التغييرات'}
            </Button>

            {saveSuccess && (
              <span className="text-sm text-capture-success animate-[fade-in_0.3s_ease-out] flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" />
                تم حفظ الإعدادات بنجاح
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
