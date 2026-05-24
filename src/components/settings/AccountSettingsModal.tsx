import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';
import {
  X,
  Mail,
  User as UserIcon,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';

interface AccountSettingsModalProps {
  open: boolean;
  onClose: () => void;
  onProfileUpdated?: (next: { fullName?: string; phone?: string }) => void;
}

interface ApiUserResponse {
  success?: boolean;
  data?: {
    _id?: string;
    email?: string;
    fullName?: string;
    phone?: string;
    typeUser?: string;
    isVerified?: boolean;
  };
  error?: string;
  message?: string;
}

const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({
  open,
  onClose,
  onProfileUpdated,
}) => {
  const [tab, setTab] = useState<'profile' | 'password'>('profile');

  const [loadingUser, setLoadingUser] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const backendUrl = (
    import.meta.env.VITE_REGISTRATION_BACKEND_URL ||
    import.meta.env.VITE_REGISTRATION_BACK_URL ||
    'http://localhost:3001'
  ).replace(/\/$/, '');

  const userId = Cookies.get('userId') || '';

  useEffect(() => {
    if (!open) return;
    setTab('profile');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrent(false);
    setShowNew(false);

    if (!userId) {
      toast.error('Identifiant utilisateur introuvable.');
      return;
    }

    let cancelled = false;
    setLoadingUser(true);
    axios
      .get<ApiUserResponse>(`${backendUrl}/api/users/${userId}`)
      .then((res) => {
        if (cancelled) return;
        const data = res.data?.data;
        setEmail(data?.email || Cookies.get('userEmail') || '');
        setFullName(data?.fullName || localStorage.getItem('userFullName') || '');
        setPhone(data?.phone || '');
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to load user details:', err);
        setEmail(Cookies.get('userEmail') || localStorage.getItem('userEmail') || '');
        setFullName(localStorage.getItem('userFullName') || '');
        setPhone('');
        toast.error('Impossible de charger le profil utilisateur.');
      })
      .finally(() => {
        if (!cancelled) setLoadingUser(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, backendUrl, userId]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !savingProfile && !savingPassword) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, savingProfile, savingPassword, onClose]);

  if (!open || typeof document === 'undefined') return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    const trimmedName = fullName.trim();
    if (trimmedName.length < 2) {
      toast.error('Le nom doit contenir au moins 2 caractères.');
      return;
    }
    setSavingProfile(true);
    try {
      const { data } = await axios.patch<ApiUserResponse>(
        `${backendUrl}/api/users/${userId}`,
        { fullName: trimmedName, phone: phone.trim() }
      );
      const updated = data?.data;
      if (updated) {
        const nextName = updated.fullName || trimmedName;
        setFullName(nextName);
        setPhone(updated.phone || '');
        localStorage.setItem('userFullName', nextName);
        onProfileUpdated?.({ fullName: nextName, phone: updated.phone });
      }
      toast.success('Profil mis à jour.');
    } catch (err: any) {
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Échec de la mise à jour.');
      toast.error(message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    if (newPassword.length < 8) {
      toast.error('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Les deux mots de passe ne correspondent pas.');
      return;
    }
    setSavingPassword(true);
    try {
      await axios.post(`${backendUrl}/api/users/${userId}/change-password`, {
        currentPassword,
        newPassword,
      });
      toast.success('Mot de passe modifié.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Échec du changement de mot de passe.');
      toast.error(message);
    } finally {
      setSavingPassword(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[2147483000] flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm"
      style={{ padding: 'clamp(8px, 4vh, 32px) 16px' }}
      onClick={() => !savingProfile && !savingPassword && onClose()}
    >
      <div
        className="w-full max-w-lg bg-white rounded-[2rem] border border-gray-100 shadow-2xl relative my-auto overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-harx-50 text-harx-500 rounded-xl flex items-center justify-center shadow-inner">
              <UserIcon size={18} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Paramètres du compte</h3>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                Profil & sécurité
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => !savingProfile && !savingPassword && onClose()}
            disabled={savingProfile || savingPassword}
            className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 pt-4">
          <div className="flex gap-1 rounded-xl bg-gray-50 p-1 border border-gray-100">
            <button
              type="button"
              onClick={() => setTab('profile')}
              className={`flex-1 px-3 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${
                tab === 'profile'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-gray-500 hover:text-slate-700'
              }`}
            >
              Profil
            </button>
            <button
              type="button"
              onClick={() => setTab('password')}
              className={`flex-1 px-3 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${
                tab === 'password'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-gray-500 hover:text-slate-700'
              }`}
            >
              Mot de passe
            </button>
          </div>
        </div>

        <div className="p-6">
          {tab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              {loadingUser && (
                <div className="flex items-center gap-2 text-[11px] text-gray-500 font-bold">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Chargement du profil…
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    readOnly
                    disabled
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm text-gray-700 cursor-not-allowed"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  L'email ne peut pas être modifié depuis cette interface.
                </p>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Nom complet
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <UserIcon size={16} />
                  </div>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    minLength={2}
                    maxLength={120}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 focus:border-harx-500 rounded-xl font-bold text-sm focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Téléphone
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Phone size={16} />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    maxLength={32}
                    placeholder="+33…"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 focus:border-harx-500 rounded-xl font-bold text-sm focus:outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={savingProfile || loadingUser}
                className="w-full py-3.5 bg-gradient-to-r from-harx-500 to-rose-500 hover:from-harx-600 hover:to-rose-600 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-300 shadow-md active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {savingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
                {savingProfile ? 'Enregistrement…' : 'Enregistrer les modifications'}
              </button>
            </form>
          )}

          {tab === 'password' && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Mot de passe actuel
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 bg-white border border-gray-200 focus:border-harx-500 rounded-xl font-bold text-sm focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent((v) => !v)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    aria-label={showCurrent ? 'Masquer' : 'Afficher'}
                  >
                    {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    maxLength={128}
                    className="w-full pl-10 pr-10 py-3 bg-white border border-gray-200 focus:border-harx-500 rounded-xl font-bold text-sm focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    aria-label={showNew ? 'Masquer' : 'Afficher'}
                  >
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  Au moins 8 caractères.
                </p>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Confirmer le nouveau mot de passe
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    maxLength={128}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 focus:border-harx-500 rounded-xl font-bold text-sm focus:outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={savingPassword}
                className="w-full py-3.5 bg-slate-900 hover:bg-black text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-300 shadow-md active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {savingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
                {savingPassword ? 'Modification…' : 'Mettre à jour le mot de passe'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AccountSettingsModal;
