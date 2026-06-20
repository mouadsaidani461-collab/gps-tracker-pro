import { Truck, Activity, AlertTriangle, Users, CircleDot } from 'lucide-react';

export function buildDashboardStatCards({
  t,
  formatNumber,
  stats,
  activeNow,
  isConnected,
  isAdmin,
  userCount,
  usersLoading,
  geofencesCount,
  notAvailable,
  loading,
}) {
  const formatStat = (value) => (
    loading ? notAvailable : formatNumber(value, { maximumFractionDigits: 0 })
  );

  const cards = [
    {
      id: 'total',
      icon: Truck,
      title: t('dashboard.totalVehicles'),
      value: formatStat(stats.total),
      trend: {
        direction: 'up',
        numeric: loading ? null : formatNumber(stats.moving, { maximumFractionDigits: 0 }),
        suffix: t('dashboard.moving'),
      },
      trendLabel: t('dashboard.onRoad'),
      color: 'cyan',
    },
    {
      id: 'active',
      icon: Activity,
      title: t('dashboard.activeNow'),
      value: formatStat(activeNow),
      trend: {
        direction: 'neutral',
        text: loading ? notAvailable : (isConnected ? t('dashboard.live') : t('dashboard.disconnected')),
      },
      trendLabel: t('dashboard.wsStatus'),
      color: 'green',
    },
    {
      id: 'alerts',
      icon: AlertTriangle,
      title: t('dashboard.alerts'),
      value: formatStat(stats.activeAlerts),
      trend: {
        direction: stats.alert > 0 ? 'down' : 'neutral',
        numeric: loading ? null : formatNumber(stats.alert, { maximumFractionDigits: 0 }),
      },
      trendLabel: t('dashboard.alertVehicles'),
      color: 'red',
    },
  ];

  if (isAdmin) {
    const usersValue = usersLoading || loading
      ? notAvailable
      : (userCount != null
        ? formatNumber(userCount, { maximumFractionDigits: 0 })
        : notAvailable);

    cards.push({
      id: 'users',
      icon: Users,
      title: t('dashboard.users'),
      value: usersValue,
      trend: { direction: 'neutral', text: notAvailable },
      trendLabel: t('dashboard.traccarAccounts'),
      color: 'violet',
    });
  } else {
    cards.push({
      id: 'geofences',
      icon: CircleDot,
      title: t('dashboard.geofences'),
      value: formatStat(geofencesCount),
      trend: {
        direction: 'neutral',
        text: loading ? notAvailable : t('dashboard.geofenceHint'),
      },
      trendLabel: t('dashboard.geofenceSubtitle'),
      color: 'violet',
    });
  }

  return cards;
}
