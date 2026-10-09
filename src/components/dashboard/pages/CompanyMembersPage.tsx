import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { Loader2, Mail, Plus, RefreshCw, Shield, Trash2, UserPlus, Users } from 'lucide-react';
import Cookies from 'js-cookie';
import {
  PERMISSION_GROUPS,
  emptyPermissions,
  permissionsForPreset,
  type PermissionMap,
  type PresetId,
} from '../../../constants/companyPermissions';
import {
  inviteCompanyMember,
  listCompanyMembers,
  reinviteCompanyMember,
  removeCompanyMember,
  updateCompanyMember,
  type CompanyMember,
} from '../../../services/companyMembersApi';

const PRESETS: { id: Exclude<PresetId, 'owner' | 'custom'>; label: string; hint: string }[] = [
  { id: 'admin', label: 'Admin', hint: 'Tous les droits' },
  { id: 'operator', label: 'Opérateur', hint: 'Quotidien, sans achat ni suppression' },
  { id: 'readonly', label: 'Lecture seule', hint: 'Consultation uniquement' },
];

function statusLabel(status: string) {
  if (status === 'invited') return 'Invité';
  if (status === 'active') return 'Actif';
  if (status === 'pending') return 'E-mail en attente';
  return status || '—';
}

function PermissionGrid({
  value,
  disabled,
  onChange,
}: {
  value: PermissionMap;
  disabled?: boolean;
  onChange?: (next: PermissionMap) => void;
}) {
  const toggle = (key: string) => {
    if (disabled || !onChange) return;
    onChange({ ...value, [key]: !value[key] });
  };
  const toggleGroup = (groupId: string, actions: { id: string }[]) => {
    if (disabled || !onChange) return;
    const keys = actions.map((action) => `${groupId}.${action.id}`);
    const allOn = keys.every((key) => value[key]);
    const next = { ...value };
    for (const key of keys) next[key] = !allOn;
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {PERMISSION_GROUPS.map((group) => {
        const keys = group.actions.map((action) => `${group.id}.${action.id}`);
        const allOn = keys.every((key) => value[key]);
        return (
          <div key={group.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-black uppercase tracking-wide text-slate-700">{group.label}</p>
              {!disabled ? (
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id, group.actions)}
                  className="text-[11px] font-bold text-harx-600 hover:underline"
                >
                  {allOn ? 'Tout retirer' : 'Tout cocher'}
                </button>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {group.actions.map((action) => {
                const key = `${group.id}.${action.id}`;
                const on = Boolean(value[key]);
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={disabled}
                    onClick={() => toggle(key)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${
                      on
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 bg-white text-slate-500'
                    } ${disabled ? 'cursor-default' : 'hover:border-slate-300'}`}
                  >
                    {action.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function CompanyMembersPage() {
  const companyId = Cookies.get('companyId') || localStorage.getItem('companyId') || '';
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preset, setPreset] = useState<Exclude<PresetId, 'owner'>>('operator');
  const [rights, setRights] = useState<PermissionMap>(() => permissionsForPreset('operator'));
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRights, setEditRights] = useState<PermissionMap>({});
  const [editPreset, setEditPreset] = useState<string>('custom');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reinviteId, setReinviteId] = useState<string | null>(null);
  const [reinviteEmail, setReinviteEmail] = useState('');

  const load = useCallback(async () => {
    if (!companyId) {
      setError('Aucune entreprise associée à ce compte.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setMembers(await listCompanyMembers(companyId));
    } catch (e: any) {
      setError(e?.message || 'Impossible de charger l\'équipe.');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const applyPreset = (id: Exclude<PresetId, 'owner' | 'custom'>) => {
    setPreset(id);
    setRights(permissionsForPreset(id));
  };

  const onInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await inviteCompanyMember({
        companyId,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        preset,
        permissions: rights,
      });
      if (result.emailSent) {
        setSuccess(`Invitation envoyée à ${form.email.trim()}.`);
      } else {
        setError(
          `E-mail non envoyé à ${form.email.trim()}. ${result.emailError || 'Vérifiez la configuration Brevo.'}`
        );
        if (result.temporaryPassword) {
          setSuccess(`Mot de passe temporaire : ${result.temporaryPassword}`);
        }
      }
      setForm({ firstName: '', lastName: '', email: '', phone: '' });
      setShowForm(false);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Invitation impossible.');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (member: CompanyMember) => {
    setReinviteId(null);
    setEditingId(member.userId);
    setEditRights({ ...emptyPermissions(), ...member.permissions });
    setEditPreset(member.preset || 'custom');
  };

  const saveEdit = async (userId: string) => {
    if (!companyId) return;
    setBusyId(userId);
    setError(null);
    try {
      await updateCompanyMember(companyId, userId, { preset: editPreset, permissions: editRights });
      setEditingId(null);
      setSuccess('Droits mis à jour.');
      await load();
    } catch (err: any) {
      setError(err?.message || 'Mise à jour impossible.');
    } finally {
      setBusyId(null);
    }
  };

  const onReinvite = async (member: CompanyMember) => {
    if (!companyId) return;
    const email = reinviteEmail.trim();
    if (!email) {
      setError('Indiquez un e-mail.');
      return;
    }
    setBusyId(member.userId);
    setError(null);
    setSuccess(null);
    try {
      const result = await reinviteCompanyMember(companyId, member.userId, email);
      if (result.emailSent) {
        setSuccess(`Invitation renvoyée à ${email}.`);
        setReinviteId(null);
      } else {
        setError(`E-mail non envoyé à ${email}. ${result.emailError || 'Vérifiez la configuration Brevo.'}`);
        if (result.temporaryPassword) {
          setSuccess(`Mot de passe temporaire : ${result.temporaryPassword}`);
        }
      }
      await load();
    } catch (err: any) {
      setError(err?.message || 'Renvoi impossible.');
    } finally {
      setBusyId(null);
    }
  };

  const onRemove = async (member: CompanyMember) => {
    if (!companyId || member.isOwner) return;
    if (!window.confirm(`Retirer ${member.fullName || member.email} de l'entreprise ?`)) return;
    setBusyId(member.userId);
    setError(null);
    try {
      await removeCompanyMember(companyId, member.userId);
      setSuccess('Membre retiré.');
      await load();
    } catch (err: any) {
      setError(err?.message || 'Suppression impossible.');
    } finally {
      setBusyId(null);
    }
  };

  const grantedCount = useMemo(
    () => Object.values(rights).filter(Boolean).length,
    [rights]
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Équipe</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Invitez d'autres e-mails sur cette entreprise et choisissez ce que chacun peut faire : gigs, prospects, téléphonie, et le reste.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw size={14} />
            Actualiser
          </button>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-harx px-3 py-2 text-sm font-bold text-white hover:opacity-95"
          >
            <Plus size={14} />
            Inviter
          </button>
        </div>
      </div>

      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {success}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      ) : null}

      {showForm ? (
        <form onSubmit={onInvite} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-harx-600">
            <UserPlus size={16} />
            <h2 className="text-sm font-black uppercase tracking-wide">Nouvelle invitation</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block text-xs font-bold text-slate-600">
              Prénom
              <input
                required
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900"
              />
            </label>
            <label className="block text-xs font-bold text-slate-600">
              Nom
              <input
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900"
              />
            </label>
            <label className="block text-xs font-bold text-slate-600">
              E-mail
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900"
              />
            </label>
            <label className="block text-xs font-bold text-slate-600">
              Téléphone
              <input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900"
              />
            </label>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold text-slate-600">Profil de départ</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => applyPreset(item.id)}
                  className={`rounded-xl border px-3 py-2 text-left ${
                    preset === item.id
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <span className="block text-xs font-black uppercase">{item.label}</span>
                  <span className={`block text-[11px] ${preset === item.id ? 'text-white/70' : 'text-slate-500'}`}>
                    {item.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <PermissionGrid
            value={rights}
            onChange={(next) => {
              setRights(next);
              setPreset('custom');
            }}
          />

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-slate-500">{grantedCount} droit(s) coché(s)</p>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-harx px-4 py-2 text-sm font-black text-white disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
              Envoyer l'invitation
            </button>
          </div>
        </form>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
          <Loader2 size={16} className="animate-spin" />
          Chargement de l'équipe…
        </div>
      ) : (
        <div className="space-y-3">
          {members.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center">
              <Users className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              <p className="text-sm font-semibold text-slate-500">Aucun membre pour le moment.</p>
            </div>
          ) : null}
          {members.map((member) => {
            const editing = editingId === member.userId;
            return (
              <article key={member.userId} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-black text-slate-900">{member.fullName || member.email}</h3>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-600">
                        {member.isOwner ? 'Propriétaire' : member.preset}
                      </span>
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        {member.isOwner ? 'Actif' : statusLabel(member.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-medium text-slate-500">{member.email}</p>
                  </div>
                  {!member.isOwner ? (
                    <div className="flex items-center gap-2">
                      {member.status === 'invited' || member.status === 'pending' ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (reinviteId === member.userId) {
                              setReinviteId(null);
                              return;
                            }
                            setEditingId(null);
                            setReinviteId(member.userId);
                            setReinviteEmail(member.email || '');
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                        >
                          <Mail size={12} />
                          {reinviteId === member.userId ? 'Fermer' : 'Réinviter'}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => (editing ? setEditingId(null) : startEdit(member))}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                      >
                        {editing ? 'Fermer' : 'Droits'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void onRemove(member)}
                        disabled={busyId === member.userId}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50"
                      >
                        <Trash2 size={12} />
                        Retirer
                      </button>
                    </div>
                  ) : null}
                </div>
                {reinviteId === member.userId ? (
                  <form
                    className="mt-4 flex flex-wrap items-end gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void onReinvite(member);
                    }}
                  >
                    <label className="min-w-[240px] flex-1 text-xs font-bold text-slate-600">
                      E-mail
                      <input
                        required
                        type="email"
                        value={reinviteEmail}
                        onChange={(e) => setReinviteEmail(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900"
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={busyId === member.userId}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-harx px-3 py-2 text-xs font-black uppercase text-white disabled:opacity-60"
                    >
                      {busyId === member.userId ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />}
                      Renvoyer
                    </button>
                  </form>
                ) : null}
                {editing ? (
                  <div className="mt-4 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {PRESETS.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setEditPreset(item.id);
                            setEditRights(permissionsForPreset(item.id));
                          }}
                          className={`rounded-lg border px-2.5 py-1 text-[11px] font-black uppercase ${
                            editPreset === item.id
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-slate-200 text-slate-600'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                    <PermissionGrid
                      value={editRights}
                      onChange={(next) => {
                        setEditRights(next);
                        setEditPreset('custom');
                      }}
                    />
                    <button
                      type="button"
                      disabled={busyId === member.userId}
                      onClick={() => void saveEdit(member.userId)}
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-black uppercase text-white"
                    >
                      {busyId === member.userId ? <Loader2 size={12} className="animate-spin" /> : null}
                      Enregistrer
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
