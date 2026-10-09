import { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import Cookies from 'js-cookie';
import { useTranslation } from 'react-i18next';

type ZohoField = { apiName: string; label: string; dataType: string };

const HARX_SLOTS = [
  'Deal_Name',
  'First_Name',
  'Last_Name',
  'Email_1',
  'Phone',
  'Address',
  'Postal_Code',
  'City',
  'Date_of_Birth',
  'Stage',
  'Pipeline',
] as const;

type HarxSlot = (typeof HARX_SLOTS)[number];
type FieldMapping = Partial<Record<HarxSlot, string>>;

const MODULES = ['Deals', 'Leads', 'Contacts'] as const;

const SUGGESTIONS: Record<HarxSlot, string[]> = {
  Deal_Name: ['deal_name', 'full_name', 'lead_name', 'name', 'account_name'],
  First_Name: ['first_name', 'firstname'],
  Last_Name: ['last_name', 'lastname'],
  Email_1: ['email', 'email_1', 'secondary_email'],
  Phone: ['phone', 'mobile', 'phone_1'],
  Address: ['address', 'mailing_street', 'street'],
  Postal_Code: ['postal_code', 'zip_code', 'mailing_zip'],
  City: ['city', 'mailing_city'],
  Date_of_Birth: ['date_of_birth', 'dob'],
  Stage: ['stage', 'lead_status'],
  Pipeline: ['pipeline'],
};

type Props = {
  open: boolean;
  gigId: string;
  onClose: () => void;
  onSaved: () => void;
};

export default function ZohoFieldMappingModal({ open, gigId, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const [moduleName, setModuleName] = useState<(typeof MODULES)[number]>('Deals');
  const [fields, setFields] = useState<ZohoField[]>([]);
  const [mapping, setMapping] = useState<FieldMapping>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const appliedSavedModule = useRef(false);

  const slotLabel = (slot: HarxSlot) => t(`uploadContacts.zohoMapping.slots.${slot}`);

  const suggest = (available: ZohoField[]): FieldMapping => {
    const next: FieldMapping = {};
    const used = new Set<string>();
    for (const slot of HARX_SLOTS) {
      const match = available.find((field) => {
        const api = field.apiName.toLowerCase();
        return !used.has(field.apiName) && SUGGESTIONS[slot].includes(api);
      });
      if (match) {
        next[slot] = match.apiName;
        used.add(match.apiName);
      }
    }
    return next;
  };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const userId = Cookies.get('userId');
        const response = await fetch(
          `${import.meta.env.VITE_DASHBOARD_API}/zoho/fields?module=${moduleName}`,
          {
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${gigId}:${userId}`,
            },
          }
        );
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.success) {
          throw new Error(data?.message || t('uploadContacts.zohoMapping.loadError'));
        }
        if (cancelled) return;
        if (!appliedSavedModule.current && MODULES.includes(data.savedModule) && data.savedModule !== moduleName) {
          appliedSavedModule.current = true;
          setModuleName(data.savedModule);
          return;
        }
        appliedSavedModule.current = true;
        const loaded = (data.fields || []) as ZohoField[];
        setFields(loaded);
        const saved = (data.mapping || {}) as FieldMapping;
        const hasSaved = HARX_SLOTS.some((slot) => Boolean(saved[slot]));
        setMapping(hasSaved ? saved : suggest(loaded));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : t('uploadContacts.zohoMapping.loadError'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [open, gigId, moduleName, t]);

  const missing = useMemo(() => {
    const hasName = Boolean(mapping.Deal_Name) || (Boolean(mapping.First_Name) && Boolean(mapping.Last_Name));
    const gaps: string[] = [];
    if (!hasName) gaps.push(slotLabel('Deal_Name'));
    if (!mapping.Email_1) gaps.push(slotLabel('Email_1'));
    if (!mapping.Phone) gaps.push(slotLabel('Phone'));
    return gaps;
  }, [mapping, t]);

  const save = async () => {
    if (missing.length > 0) {
      setError(t('uploadContacts.zohoMapping.missing', { fields: missing.join(', ') }));
      return;
    }
    setSaving(true);
    setError('');
    try {
      const userId = Cookies.get('userId');
      const used = new Set(Object.values(mapping).filter(Boolean));
      const extraFields = fields
        .map((field) => field.apiName)
        .filter((apiName) => apiName !== 'id' && !used.has(apiName))
        .slice(0, 40);
      const response = await fetch(`${import.meta.env.VITE_DASHBOARD_API}/zoho/field-mapping`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${gigId}:${userId}`,
        },
        body: JSON.stringify({ module: moduleName, mapping, extraFields }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || t('uploadContacts.zohoMapping.saveError'));
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('uploadContacts.zohoMapping.saveError'));
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{t('uploadContacts.zohoMapping.title')}</h3>
            <p className="mt-1 text-sm text-gray-600">{t('uploadContacts.zohoMapping.subtitle')}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-6 py-4">
          <label className="block text-sm font-semibold text-gray-700">
            {t('uploadContacts.zohoMapping.module')}
            <select
              value={moduleName}
              onChange={(event) => setModuleName(event.target.value as (typeof MODULES)[number])}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2"
            >
              {MODULES.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </label>

          {loading ? (
            <p className="text-sm text-gray-500">{t('uploadContacts.zohoMapping.loading')}</p>
          ) : (
            HARX_SLOTS.map((slot) => (
              <label key={slot} className="grid grid-cols-1 items-center gap-2 text-sm sm:grid-cols-2">
                <span className="font-semibold text-gray-800">{slotLabel(slot)}</span>
                <select
                  value={mapping[slot] || ''}
                  onChange={(event) => setMapping((prev) => ({ ...prev, [slot]: event.target.value }))}
                  className="rounded-xl border border-gray-200 px-3 py-2"
                >
                  <option value="">{t('uploadContacts.zohoMapping.none')}</option>
                  {fields.map((field) => (
                    <option key={field.apiName} value={field.apiName}>
                      {field.label} ({field.apiName})
                    </option>
                  ))}
                </select>
              </label>
            ))
          )}

          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-semibold text-gray-600">
            {t('uploadContacts.zohoMapping.cancel')}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={loading || saving}
            className="rounded-xl bg-gradient-harx px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {saving ? t('uploadContacts.zohoMapping.saving') : t('uploadContacts.zohoMapping.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
