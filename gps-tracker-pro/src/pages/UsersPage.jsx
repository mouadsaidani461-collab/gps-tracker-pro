import { useCallback, useEffect, useMemo, useState } from 'react';
import { User, Shield, Mail, Plus, Pencil, Trash2, RefreshCw } from 'lucide-react';
import { userApi } from '../services/traccarApi';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { getRoleLabel } from '../utils/authRoles';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import { formatNumber, NUMERIC_DISPLAY_CLASS } from '../utils/formatters';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

const EMPTY_FORM = {
  name: '',
  email: '',
  password: '',
  administrator: false,
  readonly: false,
  disabled: false,
};

function mapUserRow(user, language) {
  const roleKey = user.administrator ? 'admin' : user.readonly ? 'viewer' : 'operator';
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: getRoleLabel(roleKey, language),
    status: user.disabled ? 'inactive' : 'active',
    raw: user,
  };
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { dir, t, language } = useLocale();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await userApi.list();
      setUsers((data ?? []).map((u) => mapUserRow(u, language)));
    } catch (err) {
      setError(err.message || t('users.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [language, t]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      name: row.raw.name ?? '',
      email: row.raw.email ?? '',
      password: '',
      administrator: Boolean(row.raw.administrator),
      readonly: Boolean(row.raw.readonly),
      disabled: Boolean(row.raw.disabled),
    });
    setFormError('');
    setModalOpen(true);
  };

  const validateForm = () => {
    if (!form.name.trim()) return t('users.validation.nameRequired');
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      return t('users.validation.emailInvalid');
    }
    if (!editing && (!form.password || form.password.length < 6)) {
      return t('users.validation.passwordRequired');
    }
    if (form.password && form.password.length < 6) {
      return t('users.validation.passwordShort');
    }
    return '';
  };

  const handleSave = async () => {
    const validation = validateForm();
    if (validation) {
      setFormError(validation);
      return;
    }

    setSaving(true);
    setFormError('');

    try {
      const payload = {
        ...(editing?.raw ?? {}),
        name: form.name.trim(),
        email: form.email.trim(),
        administrator: form.administrator,
        readonly: form.readonly,
        disabled: form.disabled,
      };
      if (form.password) payload.password = form.password;

      if (editing) {
        await userApi.update(editing.id, payload);
      } else {
        await userApi.create(payload);
      }

      setModalOpen(false);
      await loadUsers();
    } catch (err) {
      setFormError(err.message || t('users.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (String(row.id) === String(currentUser?.id)) {
      setError(t('users.cannotDeleteSelf'));
      return;
    }
    if (!window.confirm(t('users.deleteConfirm', { name: row.name }))) return;

    setSaving(true);
    setError(null);
    try {
      await userApi.remove(row.id);
      await loadUsers();
    } catch (err) {
      setError(err.message || t('users.deleteFailed'));
    } finally {
      setSaving(false);
    }
  };

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter((u) => u.status === 'active').length,
    admins: users.filter((u) => u.raw.administrator).length,
  }), [users]);

  return (
    <div dir={dir} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">{t('users.pageTitle')}</h1>
          <p className="text-capture-metallic text-sm mt-1">{t('users.pageSubtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={loadUsers} loading={loading}>
            {t('common.refresh')}
          </Button>
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>
            {t('users.newUser')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="capture-card p-4">
          <p className="text-[10px] text-capture-metallic">{t('users.total')}</p>
          <p className="text-2xl font-bold text-slate-100">
            <span className={NUMERIC_DISPLAY_CLASS} dir="ltr">{formatNumber(stats.total, { maximumFractionDigits: 0 })}</span>
          </p>
        </div>
        <div className="capture-card p-4">
          <p className="text-[10px] text-capture-metallic">{t('users.active')}</p>
          <p className="text-2xl font-bold text-capture-glow">
            <span className={NUMERIC_DISPLAY_CLASS} dir="ltr">{formatNumber(stats.active, { maximumFractionDigits: 0 })}</span>
          </p>
        </div>
        <div className="capture-card p-4">
          <p className="text-[10px] text-capture-metallic">{t('users.admins')}</p>
          <p className="text-2xl font-bold text-slate-100">
            <span className={NUMERIC_DISPLAY_CLASS} dir="ltr">{formatNumber(stats.admins, { maximumFractionDigits: 0 })}</span>
          </p>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-sm text-rose-300">
          {error}
        </div>
      )}

      <div className="capture-card overflow-hidden border border-slate-600/25">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-capture-surface/60 border-b border-slate-600/25">
                <th className="text-start px-4 py-3 font-semibold text-slate-300">{t('users.columnUser')}</th>
                <th className="text-start px-4 py-3 font-semibold text-slate-300">{t('users.columnEmail')}</th>
                <th className="text-start px-4 py-3 font-semibold text-slate-300">{t('users.columnRole')}</th>
                <th className="text-start px-4 py-3 font-semibold text-slate-300">{t('users.columnStatus')}</th>
                <th className="text-start px-4 py-3 font-semibold text-slate-300">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-capture-metallic">{t('common.loading')}</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500">{t('users.noUsers')}</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b border-slate-600/15 hover:bg-capture-card/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-capture-primary/15 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-capture-glow" />
                        </div>
                        <span className="font-medium text-slate-100">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-capture-metallic" />
                        {user.email}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Shield className="w-3.5 h-3.5 text-capture-metallic" />
                        {user.role}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={user.status === 'active' ? 'online' : 'offline'} dot>
                        {user.status === 'active' ? t('users.statusActive') : t('users.statusDisabled')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(user)}
                          className="p-2 rounded-lg text-slate-400 hover:text-capture-glow hover:bg-capture-primary/10"
                          title={t('common.edit')}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(user)}
                          disabled={String(user.id) === String(currentUser?.id)}
                          className={cn(
                            'p-2 rounded-lg',
                            String(user.id) === String(currentUser?.id)
                              ? 'text-slate-600 cursor-not-allowed'
                              : 'text-rose-400 hover:bg-rose-500/10',
                          )}
                          title={t('common.delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? t('users.editUser') : t('users.newUser')}
        description={t('users.modalDescription')}
        footer={(
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>{t('common.saveShort')}</Button>
          </>
        )}
      >
        <div className="space-y-4">
          {formError && (
            <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">{formError}</p>
          )}
          <Input
            label={t('users.nameLabel')}
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          />
          <Input
            label={t('users.emailLabel')}
            type="email"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
          />
          <Input
            label={editing ? t('users.passwordNew') : t('users.passwordLabel')}
            type="password"
            value={form.password}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
          />
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={form.administrator}
              onChange={(e) => setForm((p) => ({ ...p, administrator: e.target.checked }))}
              className="accent-capture-primary"
            />
            {t('users.adminRole')} ({getRoleLabel('admin', language)})
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={form.readonly}
              onChange={(e) => setForm((p) => ({ ...p, readonly: e.target.checked }))}
              className="accent-capture-primary"
            />
            {t('users.readonly')}
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={form.disabled}
              onChange={(e) => setForm((p) => ({ ...p, disabled: e.target.checked }))}
              className="accent-capture-primary"
            />
            {t('users.disabled')}
          </label>
        </div>
      </Modal>
    </div>
  );
}
