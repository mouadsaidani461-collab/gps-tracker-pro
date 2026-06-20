import { AlertTriangle } from 'lucide-react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { useLocale } from '../../context/LocaleContext';

export default function UserDeleteConfirm({
  open,
  onClose,
  userName,
  onConfirm,
  loading = false,
}) {
  const { t } = useLocale();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('users.delete.titleSingle')}
      size="sm"
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>{t('common.cancel')}</Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>
            {t('users.delete.confirm')}
          </Button>
        </>
      )}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-capture-danger/15 text-capture-danger shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="space-y-2">
          <p className="text-sm text-slate-300">
            {t('users.delete.singleMessage', { name: userName ?? '—' })}
          </p>
          <p className="text-xs text-slate-500">
            {t('users.delete.warning')}
          </p>
        </div>
      </div>
    </Modal>
  );
}
