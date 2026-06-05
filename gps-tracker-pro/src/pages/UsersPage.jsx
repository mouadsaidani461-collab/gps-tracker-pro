import { useCallback, useEffect, useMemo, useState } from 'react';
import { User, Shield, Mail, Plus, Pencil, Trash2, RefreshCw } from 'lucide-react';
import { userApi } from '../services/traccarApi';
import { useAuth, ROLE_LABELS } from '../context/AuthContext';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';

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

function mapUserRow(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.administrator ? 'مدير' : user.readonly ? 'مشاهد' : 'مشغّل',
    status: user.disabled ? 'inactive' : 'active',
    raw: user,
  };
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
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
      setUsers((data ?? []).map(mapUserRow));
    } catch (err) {
      setError(err.message || 'تعذّر تحميل المستخدمين');
    } finally {
      setLoading(false);
    }
  }, []);

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
    if (!form.name.trim()) return 'الاسم مطلوب';
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      return 'البريد الإلكتروني غير صالح';
    }
    if (!editing && (!form.password || form.password.length < 6)) {
      return 'كلمة المرور مطلوبة (6 أحرف على الأقل)';
    }
    if (form.password && form.password.length < 6) {
      return 'كلمة المرور قصيرة جداً';
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
      setFormError(err.message || 'تعذّر حفظ المستخدم');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (String(row.id) === String(currentUser?.id)) {
      setError('لا يمكنك حذف حسابك الحالي');
      return;
    }
    if (!window.confirm(`حذف المستخدم «${row.name}»؟`)) return;

    setSaving(true);
    setError(null);
    try {
      await userApi.remove(row.id);
      await loadUsers();
    } catch (err) {
      setError(err.message || 'تعذّر حذف المستخدم');
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
    <div dir="rtl" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">المستخدمون</h1>
          <p className="text-capture-metallic text-sm mt-1">إدارة مستخدمي Traccar</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={loadUsers} loading={loading}>
            تحديث
          </Button>
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>
            مستخدم جديد
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="capture-card p-4">
          <p className="text-[10px] text-capture-metallic">الإجمالي</p>
          <p className="text-2xl font-bold text-slate-100">{stats.total}</p>
        </div>
        <div className="capture-card p-4">
          <p className="text-[10px] text-capture-metallic">نشط</p>
          <p className="text-2xl font-bold text-capture-glow">{stats.active}</p>
        </div>
        <div className="capture-card p-4">
          <p className="text-[10px] text-capture-metallic">مديرون</p>
          <p className="text-2xl font-bold text-slate-100">{stats.admins}</p>
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
                <th className="text-right px-4 py-3 font-semibold text-slate-300">المستخدم</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-300">البريد</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-300">الدور</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-300">الحالة</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-300">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-capture-metallic">جاري التحميل...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500">لا يوجد مستخدمون</td>
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
                        {user.status === 'active' ? 'نشط' : 'معطل'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(user)}
                          className="p-2 rounded-lg text-slate-400 hover:text-capture-glow hover:bg-capture-primary/10"
                          title="تعديل"
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
                          title="حذف"
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
        title={editing ? 'تعديل مستخدم' : 'مستخدم جديد'}
        description="بيانات المستخدم متزامنة مع Traccar"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>إلغاء</Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>حفظ</Button>
          </>
        )}
      >
        <div className="space-y-4">
          {formError && (
            <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">{formError}</p>
          )}
          <Input
            label="الاسم"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          />
          <Input
            label="البريد الإلكتروني"
            type="email"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
          />
          <Input
            label={editing ? 'كلمة مرور جديدة (اختياري)' : 'كلمة المرور'}
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
            مدير النظام ({ROLE_LABELS.admin})
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={form.readonly}
              onChange={(e) => setForm((p) => ({ ...p, readonly: e.target.checked }))}
              className="accent-capture-primary"
            />
            للقراءة فقط
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={form.disabled}
              onChange={(e) => setForm((p) => ({ ...p, disabled: e.target.checked }))}
              className="accent-capture-primary"
            />
            حساب معطل
          </label>
        </div>
      </Modal>
    </div>
  );
}
