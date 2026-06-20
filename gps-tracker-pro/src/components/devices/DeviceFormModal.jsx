import { useState } from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { useLocale } from '../../context/LocaleContext';
import { NUMERIC_DISPLAY_CLASS, toWesternNumerals } from '../../utils/formatters';
import {
  validateRequiredName,
  validateImei,
  validateMoroccoPhone,
  checkDuplicateUniqueId,
} from '../../utils/validation';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

const EMPTY_FORM = {
  name: '',
  uniqueId: '',
  groupId: '',
  phone: '',
  model: '',
  contact: '',
};

function buildForm(device) {
  if (!device) return EMPTY_FORM;
  return {
    name: device.name ?? '',
    uniqueId: device.uniqueId ?? '',
    groupId: device.groupId != null ? String(device.groupId) : '',
    phone: device.phone ?? '',
    model: device.model ?? '',
    contact: device.contact ?? '',
  };
}

function validateForm(form, isEdit, existingDevices, editingId, language) {
  const errors = {};
  const nameErr = validateRequiredName(form.name, 'devices.form.deviceName', language);
  if (nameErr) errors.name = nameErr;

  if (!isEdit) {
    const imeiErr = validateImei(form.uniqueId);
    if (imeiErr) errors.uniqueId = imeiErr;
  }

  const dupErr = checkDuplicateUniqueId(form.uniqueId, existingDevices, editingId, language);
  if (dupErr) errors.uniqueId = dupErr;

  const phoneErr = validateMoroccoPhone(form.phone, { language });
  if (phoneErr) errors.phone = phoneErr;

  return errors;
}

function DeviceFormBody({
  device,
  groups,
  existingDevices = [],
  onSubmit,
  saving,
  onClose,
  submitError = '',
}) {
  const { t, language } = useLocale();
  const isEdit = Boolean(device);
  const [form, setForm] = useState(() => buildForm(device));
  const [errors, setErrors] = useState({});

  const handleSubmit = async () => {
    const nextErrors = validateForm(form, isEdit, existingDevices, device?.id, language);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = {
      ...(device?.raw ?? {}),
      name: form.name.trim(),
      uniqueId: toWesternNumerals(form.uniqueId).trim(),
      phone: form.phone.trim() || undefined,
      model: form.model.trim() || undefined,
      contact: form.contact.trim() || undefined,
    };

    if (form.groupId) {
      payload.groupId = Number(form.groupId);
    } else {
      payload.groupId = 0;
    }

    await onSubmit(payload);
  };

  return (
    <>
      {submitError && (
        <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2 mb-4">{submitError}</p>
      )}
      <div className="grid sm:grid-cols-2 gap-4">
        <Input
          id="device-name"
          label={t('devices.form.deviceName')}
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          error={errors.name}
        />
        <Input
          id="device-unique-id"
          label={t('devices.form.uniqueId')}
          value={form.uniqueId}
          onChange={(e) => setForm((p) => ({ ...p, uniqueId: toWesternNumerals(e.target.value) }))}
          error={errors.uniqueId}
          disabled={isEdit}
          inputClassName={NUMERIC_DISPLAY_CLASS}
          dir="ltr"
          placeholder="123456789012345"
        />
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-sm font-medium text-slate-300">{t('devices.form.group')}</span>
          <select
            value={form.groupId}
            onChange={(e) => setForm((p) => ({ ...p, groupId: e.target.value }))}
            className={cn(
              'w-full px-3 py-2.5 rounded-lg text-sm',
              'bg-capture-surface/80 border border-slate-600/30 text-slate-200',
              'focus:outline-none focus:border-capture-primary/50 focus:shadow-glow-sm',
            )}
          >
            <option value="">{t('devices.form.noGroup')}</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>{group.name}</option>
            ))}
          </select>
        </label>
        <Input
          id="device-phone"
          label={t('devices.form.phone')}
          value={form.phone}
          onChange={(e) => setForm((p) => ({ ...p, phone: toWesternNumerals(e.target.value) }))}
          error={errors.phone}
          placeholder="+212612345678"
          inputClassName={NUMERIC_DISPLAY_CLASS}
          dir="ltr"
        />
        <Input
          id="device-model"
          label={t('devices.form.model')}
          value={form.model}
          onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))}
        />
        <Input
          id="device-contact"
          label={t('devices.form.contact')}
          value={form.contact}
          onChange={(e) => setForm((p) => ({ ...p, contact: e.target.value }))}
          className="sm:col-span-2"
        />
      </div>
      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-600/20">
        <Button variant="secondary" onClick={onClose} disabled={saving}>{t('common.cancel')}</Button>
        <Button variant="primary" onClick={handleSubmit} loading={saving}>
          {isEdit ? t('devices.form.saveEdit') : t('devices.form.saveAdd')}
        </Button>
      </div>
    </>
  );
}

export default function DeviceFormModal({
  open,
  onClose,
  device,
  groups = [],
  existingDevices = [],
  onSubmit,
  saving = false,
  submitError = '',
}) {
  const { t } = useLocale();
  const isEdit = Boolean(device);
  const formKey = `${device?.id ?? 'new'}-${open ? 'open' : 'closed'}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? t('devices.form.titleEdit') : t('devices.form.titleAdd')}
      description={t('devices.form.description')}
      size="lg"
    >
      {open && (
        <DeviceFormBody
          key={formKey}
          device={device}
          groups={groups}
          existingDevices={existingDevices}
          onSubmit={onSubmit}
          saving={saving}
          onClose={onClose}
          submitError={submitError}
        />
      )}
    </Modal>
  );
}
