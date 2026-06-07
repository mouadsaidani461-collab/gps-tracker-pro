import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Check, Truck, Zap, Building2, MessageCircle, Mail, ArrowRight,
  Gauge, Fuel, Route, Wrench,
} from 'lucide-react';
import { APP_NAME_AR } from '../utils/constants';
import { formatNumber, NUMERIC_DISPLAY_CLASS } from '../utils/formatters';
import Button from '../components/ui/Button';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

const CONTACT = {
  whatsapp: '212600000000',
  whatsappDisplay: '+212 6 00 00 00 00',
  email: 'contact@capture-gps.ma',
};

const TIERS = [
  {
    id: 'starter',
    label: 'Starter',
    labelAr: 'أساسي',
    price: 60,
    description: 'للأساطيل الصغيرة والشركات الناشئة',
    icon: Truck,
    features: [
      'خريطة حية وقائمة المركبات',
      'مناطق جغرافية (Geofences)',
      'تقارير أساسية (رحلات، أحداث، ملخص)',
      'حتى 3 مستخدمين',
      'واجهة عربية RTL',
    ],
    cta: 'ابدأ الآن',
  },
  {
    id: 'pro',
    label: 'Pro',
    labelAr: 'احترافي',
    price: 85,
    featured: true,
    description: 'الأكثر اختياراً للشركات اللوجستية',
    icon: Zap,
    features: [
      'كل ميزات Starter',
      'إعادة تشغيل المسار (Trip replay)',
      'تنبيهات WhatsApp للحالات الحرجة',
      'تقارير مجدولة بالبريد',
      'تصدير Excel و PDF',
      'حتى 10 مستخدمين',
    ],
    cta: 'ترقية إلى Pro',
  },
  {
    id: 'enterprise',
    label: 'Enterprise',
    labelAr: 'مؤسسات',
    price: null,
    description: '100+ مركبة · multi-site · white-label',
    icon: Building2,
    features: [
      'كل ميزات Pro',
      'SSO + سجل تدقيق (Audit log)',
      'أدوار وصلاحيات متقدمة (RBAC)',
      'API للربط مع ERP',
      'SLA 99.5% + دعم أولوية',
      'White-label (شعاركم + نطاقكم)',
    ],
    cta: 'تواصل مع المبيعات',
  },
];

const ADDONS = [
  { id: 'driver', label: 'تقييم السائق', description: 'فرملة، تسارع، انعطاف', price: 15, icon: Gauge },
  { id: 'fuel', label: 'تحليل الوقود', description: 'استهلاك، سرقة، انخفاض مفاجئ', price: 20, icon: Fuel },
  { id: 'route', label: 'تحسين المسارات', description: 'اقتراحات مسار وتقليل الكيلومترات', price: 25, icon: Route },
  { id: 'maintenance', label: 'صيانة وامتثال', description: 'زيت، فرامل، تأمين، فحص دوري', price: 15, icon: Wrench },
];

function Numeric({ value, options, className }) {
  return (
    <span className={cn(NUMERIC_DISPLAY_CLASS, className)} dir="ltr">
      {formatNumber(value, options)}
    </span>
  );
}

function PriceTag({ amount, suffix = 'MAD / مركبة / شهر' }) {
  return (
    <div className="flex flex-wrap items-baseline gap-1.5">
      <Numeric
        value={amount}
        options={{ maximumFractionDigits: 0 }}
        className="text-3xl md:text-4xl font-bold text-blue-900"
      />
      <span className="text-sm text-slate-500">{suffix}</span>
    </div>
  );
}

export default function PricingPage() {
  const [vehicleCount, setVehicleCount] = useState(10);
  const [selectedTier, setSelectedTier] = useState('pro');
  const [selectedAddons, setSelectedAddons] = useState(() => new Set());

  const tier = TIERS.find((t) => t.id === selectedTier) ?? TIERS[1];
  const addonsTotal = useMemo(
    () => ADDONS.filter((a) => selectedAddons.has(a.id)).reduce((sum, a) => sum + a.price, 0),
    [selectedAddons],
  );

  const unitPrice = tier.price != null ? tier.price + addonsTotal : null;
  const monthlyTotal = unitPrice != null ? unitPrice * vehicleCount : null;

  const toggleAddon = (id) => {
    setSelectedAddons((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const whatsappMessage = encodeURIComponent(
    `مرحباً، أود عرضاً لـ Capture GPS — ${tier.labelAr} — ${formatNumber(vehicleCount, { maximumFractionDigits: 0 })} مركبة`,
  );
  const whatsappHref = `https://wa.me/${CONTACT.whatsapp}?text=${whatsappMessage}`;
  const mailSubject = encodeURIComponent(`طلب عرض Capture GPS — ${tier.labelAr}`);
  const mailBody = encodeURIComponent(
    `السلام عليكم،\n\nأرغب في عرض سعر لـ ${formatNumber(vehicleCount, { maximumFractionDigits: 0 })} مركبة — باقة ${tier.labelAr}.\n\n`,
  );
  const mailHref = `mailto:${CONTACT.email}?subject=${mailSubject}&body=${mailBody}`;

  return (
    <div dir="rtl" className="min-h-screen bg-capture-bg capture-grid-bg text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-600/20 bg-capture-surface/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-slate-100">
              {APP_NAME_AR}
            </p>
            <p className="text-xs text-capture-metallic">أسعار B2B · المغرب · MAD</p>
          </div>
          <Link
            to="/login"
            className="text-sm text-capture-glow hover:text-capture-primary transition-colors flex items-center gap-1"
          >
            تسجيل الدخول
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 md:py-12 space-y-10 md:space-y-14">
        {/* Hero */}
        <section className="text-center space-y-3">
          <h1 className="text-2xl md:text-4xl font-bold text-slate-100">
            خطط أسعار مرنة لأسطولكم
          </h1>
          <p className="text-sm md:text-base text-capture-metallic max-w-2xl mx-auto">
            منصة تتبع GPS للشركات في المغرب — واجهة عربية، أرقام western (
            <Numeric value={0} options={{ maximumFractionDigits: 0 }} className="inline" />
            –
            <Numeric value={9} options={{ maximumFractionDigits: 0 }} className="inline" />
            )، وفوترة بالدرهم (MAD).
          </p>
        </section>

        {/* Calculator */}
        <section className="bg-white rounded-2xl shadow-md border border-slate-200/80 p-5 md:p-8 text-slate-900">
          <h2 className="text-lg font-bold text-blue-900 mb-1">حاسبة التكلفة الشهرية</h2>
          <p className="text-sm text-slate-500 mb-6">اختر عدد المركبات والباقة لمعرفة التكلفة التقديرية</p>

          <div className="grid md:grid-cols-2 gap-6 md:gap-8">
            <div>
              <label className="flex items-center justify-between text-sm font-medium text-slate-700 mb-3">
                <span>عدد المركبات</span>
                <Numeric value={vehicleCount} options={{ maximumFractionDigits: 0 }} className="text-blue-900 font-bold" />
              </label>
              <input
                type="range"
                min={1}
                max={200}
                value={vehicleCount}
                onChange={(e) => setVehicleCount(Number(e.target.value))}
                className={cn('w-full accent-blue-900', NUMERIC_DISPLAY_CLASS)}
                dir="ltr"
                aria-valuemin={1}
                aria-valuemax={200}
                aria-valuenow={vehicleCount}
                aria-label="عدد المركبات"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1.5" dir="ltr">
                <Numeric value={1} options={{ maximumFractionDigits: 0 }} />
                <Numeric value={200} options={{ maximumFractionDigits: 0 }} />
              </div>
            </div>

            <div className="rounded-xl bg-blue-900/5 border border-blue-900/10 p-4 md:p-5">
              {monthlyTotal != null ? (
                <>
                  <p className="text-xs text-slate-500 mb-1">الإجمالي الشهري التقديري</p>
                  <div className="flex flex-wrap items-baseline gap-2">
                    <Numeric
                      value={monthlyTotal}
                      options={{ maximumFractionDigits: 0 }}
                      className="text-3xl md:text-4xl font-bold text-blue-900"
                    />
                    <span className="text-sm text-slate-600">MAD / شهر</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-3">
                    <Numeric value={vehicleCount} options={{ maximumFractionDigits: 0 }} />
                    {' '}مركبة × (
                    <Numeric value={tier.price} options={{ maximumFractionDigits: 0 }} />
                    {addonsTotal > 0 && (
                      <>
                        {' '}+{' '}
                        <Numeric value={addonsTotal} options={{ maximumFractionDigits: 0 }} />
                        {' '}إضافات
                      </>
                    )}
                    ) MAD
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs text-slate-500 mb-1">Enterprise</p>
                  <p className="text-xl font-bold text-blue-900">حسب الطلب</p>
                  <p className="text-xs text-slate-500 mt-2">سعر مخصص لأساطيل +100 مركبة</p>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Tiers */}
        <section className="grid md:grid-cols-3 gap-4 md:gap-6">
          {TIERS.map((t) => {
            const Icon = t.icon;
            const isSelected = selectedTier === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTier(t.id)}
                className={cn(
                  'text-start rounded-2xl p-5 md:p-6 transition-all duration-200',
                  'bg-white shadow-md border-2',
                  isSelected ? 'border-blue-900 ring-2 ring-blue-900/20' : 'border-slate-200/80 hover:border-blue-900/40',
                  t.featured && 'md:-translate-y-1',
                )}
              >
                {t.featured && (
                  <span className="inline-block mb-3 px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-blue-900 text-white">
                    الأكثر اختياراً
                  </span>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-blue-900/10 text-blue-900">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-blue-900">{t.labelAr}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">{t.label}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mb-4">{t.description}</p>
                {t.price != null ? (
                  <PriceTag amount={t.price} />
                ) : (
                  <p className="text-2xl font-bold text-blue-900">حسب الطلب</p>
                )}
                <ul className="mt-5 space-y-2">
                  {t.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-xs text-slate-600">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </section>

        {/* Add-ons */}
        <section>
          <h2 className="text-lg font-bold text-slate-100 mb-1">إضافات اختيارية</h2>
          <p className="text-sm text-capture-metallic mb-5">تُضاف إلى سعر المركبة شهرياً (MAD)</p>
          <div className="grid sm:grid-cols-2 gap-3 md:gap-4">
            {ADDONS.map((addon) => {
              const Icon = addon.icon;
              const checked = selectedAddons.has(addon.id);
              return (
                <label
                  key={addon.id}
                  className={cn(
                    'flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-all',
                    'bg-white shadow-md border-2 text-slate-900',
                    checked ? 'border-blue-900 bg-blue-900/5' : 'border-slate-200/80 hover:border-blue-900/30',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleAddon(addon.id)}
                    className="mt-1 accent-blue-900 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-blue-900 shrink-0" />
                        <span className="font-semibold text-sm text-blue-900">{addon.label}</span>
                      </div>
                      <span className="text-sm font-bold text-slate-700">
                        +
                        <Numeric value={addon.price} options={{ maximumFractionDigits: 0 }} className="inline" />
                        {' '}MAD
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{addon.description}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </section>

        {/* Footer CTA */}
        <section className="rounded-2xl bg-blue-900 text-white shadow-md p-6 md:p-10 text-center">
          <h2 className="text-xl md:text-2xl font-bold mb-2">جاهز لت moderniser أسطولكم؟</h2>
          <p className="text-sm text-blue-100/90 mb-6 max-w-xl mx-auto">
            عرض تجريبي 14 يوماً — بدون بطاقة بنكية. فريقنا يرد خلال 24 ساعة.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
              <Button
                variant="secondary"
                size="lg"
                fullWidth
                leftIcon={<MessageCircle className="w-5 h-5" />}
                className="!bg-white !text-blue-900 !border-white hover:!bg-blue-50"
              >
                WhatsApp
              </Button>
            </a>
            <a href={mailHref} className="w-full sm:w-auto">
              <Button
                variant="ghost"
                size="lg"
                fullWidth
                leftIcon={<Mail className="w-5 h-5" />}
                className="!text-white hover:!bg-white/10 border border-white/30"
              >
                {CONTACT.email}
              </Button>
            </a>
          </div>
          <p className="text-xs text-blue-200/80 mt-4" dir="ltr">
            <span className={NUMERIC_DISPLAY_CLASS}>{CONTACT.whatsappDisplay}</span>
          </p>
        </section>
      </main>

      <footer className="border-t border-slate-600/20 py-6 text-center text-xs text-capture-metallic">
        ©{' '}
        <Numeric value={2026} options={{ maximumFractionDigits: 0 }} className="inline" />
        {' '}
        {APP_NAME_AR} · جميع الأسعار بالدرهم المغربي (MAD) · HT
      </footer>
    </div>
  );
}
