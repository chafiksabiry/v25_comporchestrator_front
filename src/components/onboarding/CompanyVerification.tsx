import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  BadgeCheck,
  CheckCircle,
  FileText,
  Loader2,
  Lock,
  ShieldCheck,
  Upload,
} from 'lucide-react';

type DocType = 'kbis' | 'address_proof' | 'manager_id';
const DOC_TYPES: DocType[] = ['kbis', 'address_proof', 'manager_id'];
const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

interface DocState {
  status: 'verified' | 'rejected';
  reason: string | null;
  fileName: string | null;
}
interface VerificationState {
  verified: boolean;
  documents: Record<DocType, DocState | null>;
}

const API_BASE_URL =
  import.meta.env.VITE_COMPANY_API_URL || 'https://v25searchcompanywizardbackend-recette.up.railway.app/api';

export const KYB_STATUS_EVENT = 'kybStatusChanged';

export async function fetchKybVerified(companyId: string): Promise<boolean> {
  try {
    const res = await axios.get<{ data?: VerificationState }>(`${API_BASE_URL}/verification/companies/${companyId}`);
    return Boolean(res.data?.data?.verified);
  } catch {
    return false;
  }
}

const CompanyVerification: React.FC<{ companyId?: string | null }> = ({ companyId: propCompanyId }) => {
  const { t } = useTranslation();
  const companyId = propCompanyId || Cookies.get('companyId') || '';
  const [state, setState] = useState<VerificationState | null>(null);
  const [busy, setBusy] = useState<DocType | null>(null);
  const [errors, setErrors] = useState<Partial<Record<DocType, string>>>({});
  const inputs = useRef<Partial<Record<DocType, HTMLInputElement | null>>>({});

  const load = useCallback(async () => {
    if (!companyId) return;
    try {
      const res = await axios.get<{ data: VerificationState }>(`${API_BASE_URL}/verification/companies/${companyId}`);
      setState(res.data.data);
    } catch {
      setState({ verified: false, documents: { kbis: null, address_proof: null, manager_id: null } });
    }
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('stepGuideUpdate', {
        detail: {
          title: t('sidebar.nextAction.2.title', 'Vérifier votre entreprise'),
          description: t(
            'sidebar.nextAction.2.description',
            'Déposez les trois documents demandés pour obtenir le badge « Vérifié ». Cette étape est facultative.'
          ),
          steps: t('sidebar.nextAction.2.steps', {
            returnObjects: true,
            defaultValue: ['Choisissez un document dans chaque carte.', "Attendez l'analyse automatique (quelques secondes).", 'Remplacez un document refusé en suivant le motif indiqué.'],
          }),
        },
      })
    );
  }, [t]);

  const upload = async (type: DocType, file: File | undefined) => {
    if (!file || !companyId) return;
    const setError = (message: string) => setErrors((prev) => ({ ...prev, [type]: message }));
    setErrors((prev) => ({ ...prev, [type]: undefined }));
    if (!ACCEPTED.includes(file.type)) return setError(t('companyVerification.errors.type', 'Format accepté : JPG, PNG, WebP ou PDF.'));
    if (file.size > MAX_BYTES) return setError(t('companyVerification.errors.size', 'Fichier trop volumineux (8 Mo maximum).'));

    const form = new FormData();
    form.append('file', file);
    setBusy(type);
    try {
      const res = await axios.post<{ data: VerificationState }>(
        `${API_BASE_URL}/verification/companies/${companyId}/documents/${type}`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 90000 }
      );
      setState(res.data.data);
      window.dispatchEvent(new CustomEvent(KYB_STATUS_EVENT, { detail: { verified: res.data.data.verified } }));
    } catch (err: any) {
      const code = err?.response?.data?.code;
      setError(
        code === 'unavailable'
          ? t('companyVerification.errors.unavailable', 'La vérification est momentanément indisponible. Réessayez plus tard.')
          : t('companyVerification.errors.analysis', "Le document n'a pas pu être analysé. Réessayez avec un fichier plus net.")
      );
    } finally {
      setBusy(null);
      const input = inputs.current[type];
      if (input) input.value = '';
    }
  };

  const verifiedCount = state ? DOC_TYPES.filter((d) => state.documents[d]?.status === 'verified').length : 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6">
      <header className="space-y-2">
        <h1 className="flex items-center gap-3 text-2xl font-black text-gray-900">
          <ShieldCheck className="h-7 w-7 text-harx-600" />
          {t('companyVerification.title', "Vérification de l'entreprise")}
        </h1>
        <p className="text-sm text-gray-600">
          {t(
            'companyVerification.intro',
            "Cette étape est facultative. Elle affiche le badge « Vérifié » sur votre profil et rassure les reps qui souhaitent travailler avec vous. Vos documents sont analysés automatiquement."
          )}
        </p>
        <p className="flex items-center gap-2 text-xs text-gray-500">
          <Lock className="h-3.5 w-3.5" />
          {t('companyVerification.privacy', "Vos documents sont stockés de façon privée et ne sont jamais affichés aux autres utilisateurs.")}
        </p>
      </header>

      {state?.verified ? (
        <div className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-800">
          <BadgeCheck className="h-6 w-6 shrink-0" />
          <div>
            <p className="font-bold">{t('companyVerification.verifiedTitle', 'Entreprise vérifiée')}</p>
            <p className="text-sm">{t('companyVerification.verifiedText', 'Le badge « Vérifié » est affiché sur votre profil.')}</p>
          </div>
        </div>
      ) : (
        <p className="text-sm font-medium text-gray-700">
          {t('companyVerification.progress', '{{count}} document(s) validé(s) sur 3', { count: verifiedCount })}
        </p>
      )}

      <div className="space-y-4">
        {DOC_TYPES.map((type) => {
          const doc = state?.documents[type] ?? null;
          const isBusy = busy === type;
          return (
            <section
              key={type}
              className={`rounded-2xl border-2 bg-white p-5 ${
                doc?.status === 'verified' ? 'border-green-200' : doc?.status === 'rejected' ? 'border-red-200' : 'border-gray-100'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
                    <FileText className="h-5 w-5 text-harx-600" />
                    {t(`companyVerification.docs.${type}.title`)}
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">{t(`companyVerification.docs.${type}.help`)}</p>
                </div>
                {doc?.status === 'verified' ? (
                  <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
                    <CheckCircle className="mr-1 h-3.5 w-3.5" />
                    {t('companyVerification.status.verified', 'Validé')}
                  </span>
                ) : doc?.status === 'rejected' ? (
                  <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800">
                    <AlertCircle className="mr-1 h-3.5 w-3.5" />
                    {t('companyVerification.status.rejected', 'Refusé')}
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                    {t('companyVerification.status.missing', 'À fournir')}
                  </span>
                )}
              </div>

              {doc?.status === 'rejected' && (
                <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">
                  {t(`companyVerification.reasons.${doc.reason || 'default'}`, t('companyVerification.reasons.default'))}
                </p>
              )}
              {errors[type] && (
                <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">
                  {errors[type]}
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <input
                  ref={(el) => {
                    inputs.current[type] = el;
                  }}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                  className="hidden"
                  onChange={(e) => void upload(type, e.target.files?.[0])}
                />
                <button
                  type="button"
                  disabled={isBusy || busy !== null}
                  onClick={() => inputs.current[type]?.click()}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-harx px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-harx-500/20 transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {isBusy
                    ? t('companyVerification.analysing', 'Analyse en cours…')
                    : doc
                      ? t('companyVerification.replace', 'Remplacer le document')
                      : t('companyVerification.choose', 'Choisir un fichier')}
                </button>
                {doc?.fileName && !isBusy && <span className="truncate text-xs text-gray-500">{doc.fileName}</span>}
                <span className="text-xs text-gray-400">{t('companyVerification.formats', 'JPG, PNG, WebP ou PDF · 8 Mo max')}</span>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default CompanyVerification;
