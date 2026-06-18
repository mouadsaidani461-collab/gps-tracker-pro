import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Check, Truck, Zap, Building2, MessageCircle, Mail, ArrowRight,
  Gauge, Fuel, Route, Wrench,
} from 'lucide-react';
import { APP_NAME } from '../utils/constants';
import { formatNumber, NUMERIC_DISPLAY_CLASS } from '../utils/formatters';
import { useLocale } from '../context/LocaleContext';
import Button from '../components/ui/Button';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

const CONTACT = {
  whatsapp: '212600000000',
  whatsappDisplay: '+212 6 00 00 00 00',
  email: 'contact@capture-gps.ma',
};

const TIER_META = [
  { id: 'starter', icon: Truck, price: 60, featureCount: 5 },
  { id: 'pro', icon: Zap, price: 85, featured: true, featureCount: 6 },
  { id: 'enterprise', icon: Building2, price: null, featureCount: 6 },
];

const ADDON_META = [
  { id: 'driver', price: 15, icon: Gauge },
  { id: 'fuel', price: 20, icon: Fuel },
  { id: 'route', price: 25, icon: Route },
  { id: 'maintenance', price: 15, icon: Wrench },
];

function Numeric({ value, options, className }) {
  return (
    <span className={cn(NUMERIC_DISPLAY_CLASS, className)} dir="ltr">
      {formatNumber(value, options)}
    </span>
  );
}

function PriceTag({ amount, suffix }) {
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

function usePricingData() {
  const { t } = useLocale();

  const tiers = useMemo(
    () => TIER_META.map((meta) => ({
      ...meta,
      label: t(`pricing.tiers.${meta.id}.label`),
      labelEn: t(`pricing.tiers.${meta.id}.labelEn`),
      description: t(`pricing.tiers.${meta.id}.description`),
      features: Array.from({ length: meta.featureCount }, (_, i) => (
        t(`pricing.tiers.${meta.id}.f${i + 1}`)
      )),
    })),
    [t],
  );

  const addons = useMemo(
    () => ADDON_META.map((meta) => ({
      ...meta,
      label: t(`pricing.addons.${meta.id}.label`),
      description: t(`pricing.addons.${meta.id}.description`),
    })),
    [t],
  );

  return { tiers, addons };
}

export default function PricingPage() {
  const { dir, t } = useLocale();
  const { tiers, addons } = usePricingData();
  const [vehicleCount, setVehicleCount] = useState(10);
  const [selectedTier, setSelectedTier] = useState('pro');
  const [selectedAddons, setSelectedAddons] = useState(() => new Set());

  const tier = tiers.find((item) => item.id === selectedTier) ?? tiers[1];
  const addonsTotal = useMemo(
    () => addons.filter((a) => selectedAddons.has(a.id)).reduce((sum, a) => sum + a.price, 0),
    [addons, selectedAddons],
  );

  const unitPrice = tier.price != null ? tier.price + addonsTotal : null;
  const monthlyTotal = unitPrice != null ? unitPrice * vehicleCount : null;
  const countFormatted = formatNumber(vehicleCount, { maximumFractionDigits: 0 });

  const toggleAddon = (id) => {
    setSelectedAddons((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const whatsappMessage = encodeURIComponent(
    t('pricing.mail.whatsapp', { tier: tier.label, count: countFormatted }),
  );
  const whatsappHref = `https://wa.me/${CONTACT.whatsapp}?text=${whatsappMessage}`;
  const mailSubject = encodeURIComponent(t('pricing.mail.subject', { tier: tier.label }));
  const mailBody = encodeURIComponent(
    t('pricing.mail.body', { tier: tier.label, count: countFormatted }),
  );
  const mailHref = `mailto:${CONTACT.email}?subject=${mailSubject}&body=${mailBody}`;

  return (
    <div dir={dir} className="min-h-screen bg-capture-bg capture-grid-bg text-slate-100">
      <header className="border-b border-slate-600/20 bg-capture-surface/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-slate-100">{APP_NAME}</p>
            <p className="text-xs text-capture-metallic">{t('pricing.subtitle')}</p>
          </div>
          <Link
            to="/login"
            className="text-sm text-capture-glow hover:text-capture-primary transition-colors flex items-center gap-1"
          >
            {t('pricing.login')}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 md:py-12 space-y-10 md:space-y-14">
        <section className="text-center space-y-3">
          <h1 className="text-2xl md:text-4xl font-bold text-slate-100">
            {t('pricing.hero.title')}
          </h1>
          <p className="text-sm md:text-base text-capture-metallic max-w-2xl mx-auto">
            {t('pricing.hero.description')}
          </p>
        </section>

        <section className="bg-white rounded-2xl shadow-md border border-slate-200/80 p-5 md:p-8 text-slate-900">
          <h2 className="text-lg font-bold text-blue-900 mb-1">{t('pricing.calculator.title')}</h2>
          <p className="text-sm text-slate-500 mb-6">{t('pricing.calculator.hint')}</p>

          <div className="grid md:grid-cols-2 gap-6 md:gap-8">
            <div>
              <label className="flex items-center justify-between text-sm font-medium text-slate-700 mb-3">
                <span>{t('pricing.calculator.vehicleCount')}</span>
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
                aria-label={t('pricing.calculator.vehicleCountAria')}
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1.5" dir="ltr">
                <Numeric value={1} options={{ maximumFractionDigits: 0 }} />
                <Numeric value={200} options={{ maximumFractionDigits: 0 }} />
              </div>
            </div>

            <div className="rounded-xl bg-blue-900/5 border border-blue-900/10 p-4 md:p-5">
              {monthlyTotal != null ? (
                <>
                  <p className="text-xs text-slate-500 mb-1">{t('pricing.calculator.estimatedMonthly')}</p>
                  <div className="flex flex-wrap items-baseline gap-2">
                    <Numeric
                      value={monthlyTotal}
                      options={{ maximumFractionDigits: 0 }}
                      className="text-3xl md:text-4xl font-bold text-blue-900"
                    />
                    <span className="text-sm text-slate-600">{t('pricing.calculator.perMonth')}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-3">
                    <Numeric value={vehicleCount} options={{ maximumFractionDigits: 0 }} />
                    {' '}
                    {t('pricing.calculator.vehicles')}
                    {' '}
                    × (
                    <Numeric value={tier.price} options={{ maximumFractionDigits: 0 }} />
                    {addonsTotal > 0 && (
                      <>
                        {' '}
                        +
                        {' '}
                        <Numeric value={addonsTotal} options={{ maximumFractionDigits: 0 }} />
                        {' '}
                        {t('pricing.calculator.addons')}
                      </>
                    )}
                    ) MAD
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs text-slate-500 mb-1">{t('pricing.calculator.enterprise')}</p>
                  <p className="text-xl font-bold text-blue-900">{t('pricing.calculator.customPrice')}</p>
                  <p className="text-xs text-slate-500 mt-2">{t('pricing.calculator.customHint')}</p>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="grid md:grid-cols-3 gap-4 md:gap-6">
          {tiers.map((item) => {
            const Icon = item.icon;
            const isSelected = selectedTier === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedTier(item.id)}
                className={cn(
                  'text-start rounded-2xl p-5 md:p-6 transition-all duration-200',
                  'bg-white shadow-md border-2',
                  isSelected ? 'border-blue-900 ring-2 ring-blue-900/20' : 'border-slate-200/80 hover:border-blue-900/40',
                  item.featured && 'md:-translate-y-1',
                )}
              >
                {item.featured && (
                  <span className="inline-block mb-3 px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-blue-900 text-white">
                    {t('pricing.featured')}
                  </span>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-blue-900/10 text-blue-900">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-blue-900">{item.label}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">{item.labelEn}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mb-4">{item.description}</p>
                {item.price != null ? (
                  <PriceTag amount={item.price} suffix={t('pricing.priceSuffix')} />
                ) : (
                  <p className="text-2xl font-bold text-blue-900">{t('pricing.calculator.customPrice')}</p>
                )}
                <ul className="mt-5 space-y-2">
                  {item.features.map((feature) => (
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

        <section>
          <h2 className="text-lg font-bold text-slate-100 mb-1">{t('pricing.addonsSection.title')}</h2>
          <p className="text-sm text-capture-metallic mb-5">{t('pricing.addonsSection.hint')}</p>
          <div className="grid sm:grid-cols-2 gap-3 md:gap-4">
            {addons.map((addon) => {
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
                        {' '}
                        MAD
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{addon.description}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl bg-blue-900 text-white shadow-md p-6 md:p-10 text-center">
          <h2 className="text-xl md:text-2xl font-bold mb-2">{t('pricing.cta.title')}</h2>
          <p className="text-sm text-blue-100/90 mb-6 max-w-xl mx-auto">
            {t('pricing.cta.description')}
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
                {t('pricing.cta.whatsapp')}
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
        {APP_NAME}
        {' '}
        ·
        {' '}
        {t('pricing.footer')}
      </footer>
    </div>
  );
}
