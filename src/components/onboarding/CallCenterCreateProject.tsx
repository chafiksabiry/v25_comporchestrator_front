import React, { useEffect, useMemo, useState } from 'react';
import Cookies from 'js-cookie';
import axios from 'axios';
import { Briefcase, ArrowLeft, Loader2, Globe2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fetchAllCountries, type Country } from '../gigsaicreation/lib/api';

type CallCenterCreateProjectProps = {
  onBack: () => void;
  onSuccess?: () => void;
};

function countryLabel(country: Country): string {
  if (typeof country.name === 'string') return country.name;
  return country.name?.common || country.name?.official || country.cca2 || country._id;
}

/**
 * Call-center onboarding: create project with title + destination zone only.
 */
export default function CallCenterCreateProject({
  onBack,
  onSuccess,
}: CallCenterCreateProjectProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [destinationZone, setDestinationZone] = useState('');
  const [countries, setCountries] = useState<Country[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(true);
  const [countryQuery, setCountryQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchAllCountries();
        if (!cancelled) setCountries(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error('[CallCenterCreateProject] countries load failed', err);
        if (!cancelled) {
          setError(
            t(
              'companyOnboarding.ui.callCenterDestinationLoadError',
              'Could not load destination zones. Please refresh.'
            )
          );
        }
      } finally {
        if (!cancelled) setCountriesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const sortedCountries = useMemo(() => {
    return [...countries].sort((a, b) =>
      countryLabel(a).localeCompare(countryLabel(b), undefined, { sensitivity: 'base' })
    );
  }, [countries]);

  const filteredCountries = useMemo(() => {
    const q = countryQuery.trim().toLowerCase();
    if (!q) return sortedCountries;
    return sortedCountries.filter((c) => {
      const label = countryLabel(c).toLowerCase();
      const code = (c.cca2 || '').toLowerCase();
      return label.includes(q) || code.includes(q);
    });
  }, [sortedCountries, countryQuery]);

  const selectedCountry = sortedCountries.find((c) => c._id === destinationZone);
  const titleOk = Boolean(title.trim());
  const zoneOk = Boolean(destinationZone && /^[a-f0-9]{24}$/i.test(destinationZone));
  const canSave = titleOk && zoneOk && !saving && !countriesLoading;

  const handleCreate = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const userId = Cookies.get('userId');
      const companyId = Cookies.get('companyId');
      if (!userId || !companyId) {
        throw new Error('Missing user or company. Please refresh and try again.');
      }

      const apiUrl =
        import.meta.env.VITE_API_URL_GIGS ||
        import.meta.env.VITE_GIGS_API ||
        'http://localhost:3000';

      const trimmed = title.trim();
      const response = await fetch(`${apiUrl}/gigs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          companyId,
          title: trimmed,
          description: trimmed,
          destination_zone: destinationZone,
          status: 'to_activate',
        }),
      });

      const responseText = await response.text();
      if (!response.ok) {
        let message = 'Failed to create project';
        try {
          const parsed = JSON.parse(responseText);
          message = parsed.message || message;
        } catch {
          message = responseText || message;
        }
        throw new Error(message);
      }

      const userType = localStorage.getItem('userType') || 'call-center';
      try {
        await axios.put(
          `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding/phases/2/steps/3`,
          { status: 'completed' },
          { params: { userType } }
        );
      } catch (onboardingErr) {
        console.warn('[CallCenterCreateProject] step 3 mark failed', onboardingErr);
      }

      Cookies.set('createGigStepCompleted', 'true');
      window.dispatchEvent(
        new CustomEvent('stepCompleted', { detail: { stepId: 3, phaseId: 2 } })
      );

      onSuccess?.();
      onBack();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              'companyOnboarding.ui.callCenterProjectCreateError',
              'Could not create the project. Please try again.'
            )
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto py-10 px-4">
      <button
        type="button"
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-800"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('companyOnboarding.ui.backToOnboarding', 'Back to onboarding')}
      </button>

      <div className="rounded-3xl border border-gray-100 bg-white shadow-xl p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-harx text-white">
            <Briefcase className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900">
              {t('companyOnboarding.ui.callCenterProjectTitle', 'Create project')}
            </h2>
            <p className="text-sm text-gray-500 font-medium">
              {t(
                'companyOnboarding.ui.callCenterProjectHint',
                'Enter the project title and destination zone.'
              )}
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {t('companyOnboarding.ui.callCenterProjectLabel', 'Title')}{' '}
            <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 border-2 border-harx-200 rounded-xl text-harx-900 font-medium focus:outline-none focus:ring-3 focus:ring-harx-300 focus:border-harx-400"
            placeholder={t(
              'companyOnboarding.ui.callCenterProjectPlaceholder',
              'e.g. Outbound sales campaign Q2'
            )}
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {t('companyOnboarding.ui.callCenterDestinationLabel', 'Destination zone')}{' '}
            <span className="text-red-500">*</span>
          </label>
          <div className="relative mb-2">
            <Globe2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="search"
              value={countryQuery}
              onChange={(e) => setCountryQuery(e.target.value)}
              disabled={countriesLoading}
              className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-3 focus:ring-harx-300 focus:border-harx-400 disabled:opacity-50"
              placeholder={t(
                'companyOnboarding.ui.callCenterDestinationSearch',
                'Search country…'
              )}
            />
          </div>
          <select
            value={destinationZone}
            onChange={(e) => setDestinationZone(e.target.value)}
            disabled={countriesLoading}
            className="w-full px-4 py-3 border-2 border-harx-200 rounded-xl text-harx-900 font-medium focus:outline-none focus:ring-3 focus:ring-harx-300 focus:border-harx-400 disabled:opacity-50 bg-white"
          >
            <option value="">
              {countriesLoading
                ? t('companyOnboarding.ui.callCenterDestinationLoading', 'Loading countries…')
                : t('companyOnboarding.ui.callCenterDestinationPlaceholder', 'Select a country')}
            </option>
            {filteredCountries.map((country) => (
              <option key={country._id} value={country._id}>
                {countryLabel(country)}
                {country.cca2 ? ` (${country.cca2})` : ''}
              </option>
            ))}
          </select>
          {selectedCountry ? (
            <p className="mt-2 text-xs text-gray-500 font-medium">
              {t('companyOnboarding.ui.callCenterDestinationSelected', 'Selected')}:{' '}
              {countryLabel(selectedCountry)}
            </p>
          ) : null}
        </div>

        {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={!canSave}
          className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-harx px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-harx-500/20 hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {t('companyOnboarding.ui.callCenterProjectCta', 'Save')}
        </button>
      </div>
    </div>
  );
}
