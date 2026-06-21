import { useCallback, useEffect, useMemo, useState } from 'react';
import { User, Shield, Mail, Plus, Pencil, Trash2, RefreshCw, Search } from 'lucide-react';
import { userApi } from '../services/traccarApi';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { getRoleLabel } from '../utils/authRoles';
import { validatePassword } from '../utils/validation';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import UserDeleteConfirm from '../components/users/UserDeleteConfirm';
import { formatNumber, NUMERIC_DISPLAY_CLASS } from '../utils/formatters';
import { MIN_USER_PASSWORD_LENGTH } from './users/constants';

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

function matchesSearch(row, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    String(row.name ?? '').toLowerCase().includes(q)
    || String(row.email ?? '').toLowerCase().includes(q)
  );
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { dir, t, language } = useLocale();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const isEditingSelf = Boolean(
    editing && String(editing.id) === String(currentUser?.id),
  );

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await userApi.list();
      setUsers((data ?? []).map((u) => mapUserRow(u, language)));
    } catch (err) {
      setLoadError(err.message || t('users.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [language, t]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(
    () => users.filter((user) => matchesSearch(user, search)),
    [users, search],
  );

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
    if (!editing) {
      const passwordError = validatePassword(form.password, {
        language,
        min: MIN_USER_PASSWORD_LENGTH,
      });
      if (passwordError) return passwordError;
    } else if (form.password) {
      const passwordError = validatePassword(form.password, {
        language,
        min: MIN_USER_PASSWORD_LENGTH,
      });
      if (passwordError) return passwordError;
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
        disabled: isEditingSelf ? false : form.disabled,
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

  const openDeleteConfirm = (row) => {
    if (String(row.id) === String(currentUser?.id)) {
      setActionError(t('users.cannotDeleteSelf'));
      return;
    }
    setDeleteTarget(row);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    setSaving(true);
    setActionError(null);
    try {
      await userApi.remove(deleteTarget.id);
      setDeleteTarget(null);
      await loadUsers();
    } catch (err) {
      setActionError(err.message || t('users.deleteFailed'));
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
    <div dir={dir} className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100">{t('users.pageTitle')}</h1>
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

      {loadError && (
        <div className="px-4 py-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-sm text-rose-300 flex items-center justify-between gap-3">
          <span>{loadError}</span>
          <Button variant="secondary" size="sm" onClick={loadUsers}>{t('common.retry')}</Button>
        </div>
      )}

      {actionError && (
        <div className="px-4 py-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-sm text-rose-300">
          {actionError}
        </div>
      )}

      <div className="capture-card p-4">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('users.searchPlaceholder')}
            className="w-full ps-10 pe-4 py-2.5 rounded-lg text-sm bg-capture-bg/60 border border-slate-600/30 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:shadow-glow-sm focus:border-capture-primary/50"
          />
        </div>
      </div>

      <div className="hidden md:block capture-card overflow-hidden border border-slate-600/25">
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
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                    {users.length === 0 ? t('users.noUsers') : t('users.searchEmpty')}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
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
                      <div className="flex items-center gap-1.5" dir="ltr">
                        <Mail className="w-3.5 h-3.5 text-capture-metallic shrink-0" />
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
                          aria-label={t('common.edit')}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openDeleteConfirm(user)}
                          disabled={String(user.id) === String(currentUser?.id)}
                          className={cn(
                            'p-2 rounded-lg',
                            String(user.id) === String(currentUser?.id)
                              ? 'text-slate-600 cursor-not-allowed'
                              : 'text-rose-400 hover:bg-rose-500/10',
                          )}
                          title={t('common.delete')}
                          aria-label={t('common.delete')}
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

      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="capture-card p-8 text-center text-capture-metallic">{t('common.loading')}</div>
        ) : filteredUsers.length === 0 ? (
          <div className="capture-card p-8 text-center text-slate-500">
            {users.length === 0 ? t('users.noUsers') : t('users.searchEmpty')}
          </div>
        ) : (
          filteredUsers.map((user) => (
            <div key={user.id} className="capture-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-capture-primary/15 rounded-full flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-capture-glow" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-100 truncate">{user.name}</p>
                    <p className="text-xs text-slate-400 truncate mt-0.5" dir="ltr">{user.email}</p>
                  </div>
                </div>
                <Badge variant={user.status === 'active' ? 'online' : 'offline'} dot>
                  {user.status === 'active' ? t('users.statusActive') : t('users.statusDisabled')}
                </Badge>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Shield className="w-3.5 h-3.5 text-capture-metallic shrink-0" />
                {user.role}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" leftIcon={<Pencil className="w-4 h-4" />} onClick={() => openEdit(user)}>
                  {t('common.edit')}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  leftIcon={<Trash2 className="w-4 h-4" />}
                  onClick={() => openDeleteConfirm(user)}
                  disabled={String(user.id) === String(currentUser?.id)}
                >
                  {t('common.delete')}
                </Button>
              </div>
            </div>
          ))
        )}
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
              onChange={(e) => setForm((p) => ({
                ...p,
                administrator: e.target.checked,
                readonly: e.target.checked ? false : p.readonly,
              }))}
              className="accent-capture-primary"
            />
            {t('users.adminRole')} ({getRoleLabel('admin', language)})
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={form.readonly}
              onChange={(e) => setForm((p) => ({
                ...p,
                readonly: e.target.checked,
                administrator: e.target.checked ? false : p.administrator,
              }))}
              className="accent-capture-primary"
            />
            {t('users.readonly')}
          </label>
          <label className={cn(
            'flex items-center gap-2 text-sm text-slate-300',
            isEditingSelf && 'opacity-60 cursor-not-allowed',
          )}
          >
            <input
              type="checkbox"
              checked={form.disabled}
              disabled={isEditingSelf}
              onChange={(e) => setForm((p) => ({ ...p, disabled: e.target.checked }))}
              className="accent-capture-primary"
            />
            {t('users.disabled')}
          </label>
          {isEditingSelf && (
            <p className="text-xs text-slate-500">{t('users.cannotDisableSelf')}</p>
          )}
        </div>
      </Modal>

      <UserDeleteConfirm
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        userName={deleteTarget?.name}
        onConfirm={handleDeleteConfirm}
        loading={saving}
      />
    </div>
  );
}
