import Badge from '../ui/Badge';
import { useLocale } from '../../context/LocaleContext';

const STATUS_VARIANTS = {
  online: 'online',
  offline: 'offline',
  unknown: 'idle',
};

export default function DeviceStatusBadge({ status = 'unknown', size = 'sm', className = '' }) {
  const { t } = useLocale();
  const key = STATUS_VARIANTS[status] ? status : 'unknown';
  const label = t(`devices.status.${key}`);

  return (
    <Badge variant={STATUS_VARIANTS[key]} size={size} dot className={className}>
      {label}
    </Badge>
  );
}
