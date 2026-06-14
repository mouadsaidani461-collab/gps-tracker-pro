import { AlertTriangle } from 'lucide-react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { useLocale } from '../../context/LocaleContext';
import { formatNumber } from '../../utils/formatters';

export default function DeviceDeleteConfirm({
  open,
  onClose,
  count = 1,
  deviceName,
  onConfirm,
  loading = false,
}) {
  const { t } = useLocale();
  const isBulk = count > 1;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isBulk ? t('devices.delete.titleBulk') : t('devices.delete.titleSingle')}
      size="sm"
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>{t('common.cancel')}</Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>
            {t('devices.delete.confirm')}
          </Button>
        </>
      )}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-capture-danger/15 text-capture-danger shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="space-y-2">
          {isBulk ? (
            <p className="text-sm text-slate-300">
              {t('devices.delete.bulkMessage', {
                count: formatNumber(count, { maximumFractionDigits: 0 }),
              })}
            </p>
          ) : (
            <p className="text-sm text-slate-300">
              {t('devices.delete.singleMessage', { name: deviceName ?? '—' })}
            </p>
          )}
          <p className="text-xs text-slate-500">
            {t('devices.delete.warning')}
          </p>
        </div>
      </div>
    </Modal>
  );
}
