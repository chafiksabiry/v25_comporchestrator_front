import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  Activity,
  BookOpen,
  Bot,
  Briefcase,
  Calendar,
  ClipboardCheck,
  Coins,
  CreditCard,
  GraduationCap,
  LayoutDashboard,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  PhoneCall,
  Plug,
  Plus,
  RefreshCw,
  ScrollText,
  Search,
  Settings,
  Shield,
  Trash2,
  TrendingUp,
  UserPlus,
  UserCog,
  Users,
  Wallet,
} from 'lucide-react';
import Cookies from 'js-cookie';
import {
  PERMISSION_GROUPS,
  allPermissionKeys,
  emptyPermissions,
  permissionsForPreset,
  type PermissionMap,
  type PresetId,
} from '../../../constants/companyPermissions';
import {
  inviteCompanyMember,
  listCompanyMembers,
  listCompanyRoles,
  createCompanyRole,
  deleteCompanyRole,
  reinviteCompanyMember,
  removeCompanyMember,
  updateCompanyMember,
  type CompanyMember,
  type CompanyRole,
} from '../../../services/companyMembersApi';

const PRESETS: { id: Exclude<PresetId, 'owner' | 'custom'>; label: string; hint: string }[] = [
  { id: 'admin', label: 'Admin', hint: 'Tous les droits' },
  { id: 'operator', label: 'Opérateur', hint: 'Quotidien, sans achat ni suppression' },
  { id: 'readonly', label: 'Lecture seule', hint: 'Consultation uniquement' },
];

function statusLabel(status: string) {
  if (status === 'invited') return 'Invité';
  if (status === 'active') return 'Membre';
  if (status === 'pending') return 'E-mail en attente';
  return status || '—';
}

const GROUP_META: Record<string, { icon: React.ComponentType<{ size?: number; className?: string }>; info: string }> = {
  gigs: { icon: Briefcase, info: 'Créer, modifier, activer ou supprimer les missions.' },
  leads: { icon: UserPlus, info: 'Voir et importer les prospects, les modifier ou les archiver.' },
  telephony: { icon: Phone, info: 'Numéros, recherche, achat, affectation et appel test.' },
  scripts: { icon: ScrollText, info: 'Scripts d’appel générés pour les missions.' },
  knowledge: { icon: BookOpen, info: 'Documents consultés pendant l’appel.' },
  matching: { icon: Users, info: 'Candidatures REP : invitation et décision.' },
  training: { icon: GraduationCap, info: 'Parcours et modules de formation.' },
  calls: { icon: PhoneCall, info: 'Journal, écoute, validation et export des appels.' },
  dashboard: { icon: LayoutDashboard, info: 'Tableau de bord de l’entreprise.' },
  agents: { icon: UserCog, info: 'Comptes agents du centre d’appels.' },
  planning: { icon: Calendar, info: 'Créneaux et planification des sessions.' },
  emails: { icon: Mail, info: 'Campagnes et envoi d’e-mails.' },
  chat: { icon: MessageSquare, info: 'Messagerie en direct avec les prospects.' },
  voice: { icon: Bot, info: 'Assistant vocal et sa configuration.' },
  activation: { icon: Plug, info: 'Mise en ligne d’un gig et ses intégrations.' },
  quality: { icon: ClipboardCheck, info: 'Contrôle qualité des appels.' },
  operations: { icon: Activity, info: 'Suivi opérationnel du jour.' },
  analytics: { icon: TrendingUp, info: 'Indicateurs et tendances.' },
  wallet: { icon: Wallet, info: 'Solde, dépôts et retraits.' },
  subscription: { icon: CreditCard, info: 'Plan en cours et changement d’offre.' },
  billing: { icon: Coins, info: 'Jetons IA et achats.' },
  members: { icon: Shield, info: 'Invitations, rôles et retrait d’un membre.' },
  settings: { icon: Settings, info: 'Réglages de l’entreprise.' },
};

function countOn(value: PermissionMap) {
  return Object.values(value).filter(Boolean).length;
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
  const [query, setQuery] = useState('');
  const total = allPermissionKeys().length;
  const granted = countOn(value);
  const needle = query.trim().toLowerCase();
  const groups = PERMISSION_GROUPS.filter((group) => {
    if (!needle) return true;
    if (group.label.toLowerCase().includes(needle)) return true;
    return group.actions.some((action) => action.label.toLowerCase().includes(needle));
  });

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
  const setAll = (on: boolean) => {
    if (disabled || !onChange) return;
    onChange(Object.fromEntries(allPermissionKeys().map((key) => [key, on])));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[200px] flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Chercher une fonctionnalité"
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm font-medium text-slate-800"
          />
        </label>
        <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-black text-white">
          {granted}/{total}
        </span>
        {!disabled ? (
          <>
            <button type="button" onClick={() => setAll(true)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50">
              Tout autoriser
            </button>
            <button type="button" onClick={() => setAll(false)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50">
              Tout retirer
            </button>
          </>
        ) : null}
      </div>
      {groups.length === 0 ? (
        <p className="text-sm font-semibold text-slate-500">Aucune fonctionnalité ne correspond à « {query.trim()} ».</p>
      ) : null}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {groups.map((group) => {
          const meta = GROUP_META[group.id];
          const Icon = meta?.icon || Shield;
          const keys = group.actions.map((action) => `${group.id}.${action.id}`);
          const onCount = keys.filter((key) => value[key]).length;
          const allOn = onCount === keys.length;
          return (
            <div key={group.id} className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-2">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                    <Icon size={16} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-800">{group.label}</p>
                    <p className="text-[11px] font-medium leading-snug text-slate-500">{meta?.info}</p>
                  </div>
                </div>
                {!disabled ? (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id, group.actions)}
                    className="shrink-0 text-[11px] font-bold text-rose-600 hover:underline"
                  >
                    {allOn ? 'Retirer' : 'Tout'}
                  </button>
                ) : (
                  <span className="text-[11px] font-bold text-slate-400">{onCount}/{keys.length}</span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
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
                          ? 'border-rose-500 bg-rose-500 text-white'
                          : 'border-slate-200 bg-slate-50 text-slate-500'
                      } ${disabled ? 'cursor-default' : 'hover:border-rose-300'}`}
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
    </div>
  );
}

export default function CompanyMembersPage() {
  const companyId = Cookies.get('companyId') || localStorage.getItem('companyId') || '';
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [roles, setRoles] = useState<CompanyRole[]>([]);
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
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [editRoleId, setEditRoleId] = useState<string | null>(null);
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [roleName, setRoleName] = useState('');
  const [roleRights, setRoleRights] = useState<PermissionMap>(() => emptyPermissions());
  const [savingRole, setSavingRole] = useState(false);
  const [memberQuery, setMemberQuery] = useState('');

  const load = useCallback(async (silent = false) => {
    if (!companyId) {
      setError('Aucune entreprise associée à ce compte.');
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    if (!silent) setError(null);
    try {
      const [nextMembers, nextRoles] = await Promise.all([
        listCompanyMembers(companyId),
        listCompanyRoles(companyId).catch(() => [] as CompanyRole[]),
      ]);
      setMembers(nextMembers);
      setRoles(nextRoles);
    } catch (e: any) {
      if (!silent) setError(e?.message || 'Impossible de charger l\'équipe.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onPresence = (event: Event) => {
      const detail = (event as CustomEvent<{
        userId?: string;
        online?: boolean;
        status?: string;
        onlineUserIds?: string[];
      }>).detail;
      if (!detail) return;
      if (Array.isArray(detail.onlineUserIds)) {
        const online = new Set(detail.onlineUserIds);
        setMembers((prev) => prev.map((member) => (
          member.isOwner ? member : { ...member, online: online.has(member.userId), status: online.has(member.userId) ? 'active' : member.status }
        )));
        return;
      }
      if (!detail.userId) return;
      setMembers((prev) => prev.map((member) => (
        member.userId === detail.userId
          ? { ...member, online: Boolean(detail.online), status: detail.status || member.status }
          : member
      )));
    };
    window.addEventListener('harx:team-presence', onPresence);
    return () => window.removeEventListener('harx:team-presence', onPresence);
  }, []);

  const applyPreset = (id: Exclude<PresetId, 'owner' | 'custom'>) => {
    setPreset(id);
    setSelectedRoleId(null);
    setRights(permissionsForPreset(id));
  };

  const applyRole = (role: CompanyRole) => {
    setSelectedRoleId(role._id);
    setPreset('custom');
    setRights({ ...emptyPermissions(), ...role.permissions });
  };

  const onCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;
    setSavingRole(true);
    setError(null);
    setSuccess(null);
    try {
      const created = await createCompanyRole({
        companyId,
        name: roleName.trim(),
        permissions: roleRights,
      });
      setRoles((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setRoleName('');
      setRoleRights(emptyPermissions());
      setShowRoleForm(false);
      setSuccess(`Rôle « ${created.name} » créé.`);
    } catch (err: any) {
      setError(err?.message || 'Création du rôle impossible.');
    } finally {
      setSavingRole(false);
    }
  };

  const onDeleteRole = async (role: CompanyRole) => {
    if (!companyId) return;
    if (!window.confirm(`Supprimer le rôle « ${role.name} » ? Les membres gardent leurs droits actuels.`)) return;
    setError(null);
    try {
      await deleteCompanyRole(companyId, role._id);
      setRoles((prev) => prev.filter((item) => item._id !== role._id));
      if (selectedRoleId === role._id) setSelectedRoleId(null);
      setSuccess(`Rôle « ${role.name} » supprimé.`);
    } catch (err: any) {
      setError(err?.message || 'Suppression du rôle impossible.');
    }
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
        roleId: selectedRoleId,
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
    setEditRoleId(member.roleId || null);
  };

  const saveEdit = async (userId: string) => {
    if (!companyId) return;
    setBusyId(userId);
    setError(null);
    try {
      await updateCompanyMember(companyId, userId, {
        preset: editPreset,
        permissions: editRights,
        roleId: editRoleId,
      });
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
  const teamStats = useMemo(() => {
    const people = members.filter((member) => !member.isOwner);
    return {
      total: members.length,
      online: people.filter((member) => member.online).length,
      waiting: people.filter((member) => member.status === 'invited' || member.status === 'pending').length,
      roles: roles.length,
    };
  }, [members, roles.length]);
  const visibleMembers = useMemo(() => {
    const needle = memberQuery.trim().toLowerCase();
    if (!needle) return members;
    return members.filter((member) =>
      `${member.fullName} ${member.email} ${member.roleName || ''} ${member.preset}`.toLowerCase().includes(needle)
    );
  }, [members, memberQuery]);

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-12">
      <div className="overflow-hidden rounded-3xl bg-slate-950 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-300">Entreprise</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight">Équipe</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-300">
              Invitez des collègues, créez des rôles, et choisissez chaque fonctionnalité qu’ils peuvent ouvrir.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-bold text-white hover:bg-white/10"
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
        <div className="grid grid-cols-2 gap-px bg-white/10 sm:grid-cols-4">
          {[
            { label: 'Personnes', value: teamStats.total, icon: Users },
            { label: 'En ligne', value: teamStats.online, icon: Activity },
            { label: 'Invitations', value: teamStats.waiting, icon: Mail },
            { label: 'Rôles', value: teamStats.roles, icon: Shield },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 bg-slate-950 px-4 py-3">
              <item.icon size={16} className="text-rose-300" />
              <div>
                <p className="text-lg font-black leading-none">{item.value}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">{item.label}</p>
              </div>
            </div>
          ))}
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

      <section className="space-y-3 rounded-3xl border border-rose-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <Shield size={18} />
            </span>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wide text-slate-900">Rôles</h2>
              <p className="mt-1 max-w-xl text-xs text-slate-500">
                Un rôle mémorise une combinaison de droits. Vous le réutilisez à l’invitation et dans Droits.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowRoleForm((open) => !open)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 px-3 py-2 text-sm font-bold text-white hover:bg-slate-800"
          >
            <Shield size={14} />
            {showRoleForm ? 'Fermer' : 'Nouveau rôle'}
          </button>
        </div>
        {roles.length === 0 ? (
          <p className="text-sm font-semibold text-slate-500">Aucun rôle enregistré. Les profils Admin, Opérateur et Lecture seule restent disponibles.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {roles.map((role) => (
              <span key={role._id} className="inline-flex items-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-900">
                <Shield size={12} />
                {role.name}
                <span className="font-semibold text-rose-500">{countOn(role.permissions)} droits</span>
                <button
                  type="button"
                  onClick={() => void onDeleteRole(role)}
                  className="text-rose-600 hover:text-rose-800"
                  aria-label={`Supprimer ${role.name}`}
                >
                  <Trash2 size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
        {showRoleForm ? (
          <form onSubmit={onCreateRole} className="space-y-3 border-t border-slate-100 pt-3">
            <label className="block text-xs font-bold text-slate-600">
              Nom du rôle
              <input
                required
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                placeholder="Ex. Superviseur, Finance, Recrutement"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900"
              />
            </label>
            <PermissionGrid value={roleRights} onChange={setRoleRights} />
            <button
              type="submit"
              disabled={savingRole}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white disabled:opacity-60"
            >
              {savingRole ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Enregistrer le rôle
            </button>
          </form>
        ) : null}
      </section>

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
                    preset === item.id && !selectedRoleId
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <span className="block text-xs font-black uppercase">{item.label}</span>
                  <span className={`block text-[11px] ${preset === item.id && !selectedRoleId ? 'text-white/70' : 'text-slate-500'}`}>
                    {item.hint}
                  </span>
                </button>
              ))}
              {roles.map((role) => (
                <button
                  key={role._id}
                  type="button"
                  onClick={() => applyRole(role)}
                  className={`rounded-xl border px-3 py-2 text-left ${
                    selectedRoleId === role._id
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <span className="block text-xs font-black uppercase">{role.name}</span>
                  <span className={`block text-[11px] ${selectedRoleId === role._id ? 'text-white/70' : 'text-slate-500'}`}>
                    Rôle enregistré
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
          <label className="relative block">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={memberQuery}
              onChange={(event) => setMemberQuery(event.target.value)}
              placeholder="Chercher un membre, un e-mail ou un rôle"
              className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm font-medium text-slate-800"
            />
          </label>
          {visibleMembers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center">
              <Users className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              <p className="text-sm font-semibold text-slate-500">
                {memberQuery.trim() ? 'Aucun membre ne correspond à cette recherche.' : 'Aucun membre pour le moment.'}
              </p>
            </div>
          ) : null}
          {visibleMembers.map((member) => {
            const editing = editingId === member.userId;
            return (
              <article key={member.userId} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-black text-white ${
                      member.isOwner ? 'bg-slate-950' : 'bg-gradient-harx'
                    }`}>
                      {(member.fullName || member.email || '?').slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-black text-slate-900">{member.fullName || member.email}</h3>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-600">
                        {member.isOwner ? 'Propriétaire' : (member.roleName || member.preset)}
                      </span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                        member.isOwner || member.status === 'active'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                          : 'border-amber-200 bg-amber-50 text-amber-800'
                      }`}>
                        {member.isOwner ? 'Actif' : statusLabel(member.status)}
                      </span>
                      {!member.isOwner && member.status === 'active' ? (
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                          member.online
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                            : 'border-slate-200 bg-slate-50 text-slate-500'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${member.online ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {member.online ? 'En ligne' : 'Hors ligne'}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs font-medium text-slate-500">{member.email}</p>
                    </div>
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
                            setEditRoleId(null);
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
                      {roles.map((role) => (
                        <button
                          key={role._id}
                          type="button"
                          onClick={() => {
                            setEditPreset('custom');
                            setEditRoleId(role._id);
                            setEditRights({ ...emptyPermissions(), ...role.permissions });
                          }}
                          className={`rounded-lg border px-2.5 py-1 text-[11px] font-black uppercase ${
                            editRoleId === role._id
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-slate-200 text-slate-600'
                          }`}
                        >
                          {role.name}
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
