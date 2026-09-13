import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Cookies from 'js-cookie';
import axios from 'axios';
import {
  Briefcase,
  ArrowLeft,
  Loader2,
  Globe2,
  Plus,
  Pencil,
  Trash2,
  Eye,
  MapPin,
  ChevronDown,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fetchAllCountries, type Country } from '../gigsaicreation/lib/api';

type CallCenterCreateProjectProps = {
  onBack: () => void;
  onSuccess?: (gigId?: string) => void;
};

type ProjectMode = 'list' | 'create' | 'edit' | 'view';

type ProjectRow = {
  _id: string;
  title: string;
  description?: string;
  status?: string;
  destination_zone?: any;
};

function countryLabel(country: Country): string {
  if (typeof country.name === 'string') return country.name;
  return country.name?.common || country.name?.official || country.cca2 || country._id;
}

function countryDbId(country: Country): string {
  const raw = (country as any)?._id ?? (country as any)?.id;
  if (raw && typeof raw === 'object' && typeof raw.$oid === 'string') return raw.$oid;
  return String(raw || '');
}

function isMongoObjectId(value: string): boolean {
  return /^[a-f0-9]{24}$/i.test(value);
}

function resolveDestinationId(zone: any): string {
  if (!zone) return '';
  if (typeof zone === 'string') return zone;
  return String(zone._id || zone.id || '');
}

function resolveDestinationLabel(zone: any, countries: Country[]): string {
  if (!zone) return '—';
  if (typeof zone === 'object') {
    if (zone.name?.common) return zone.name.common;
    if (zone.name?.official) return zone.name.official;
    if (typeof zone.name === 'string') return zone.name;
  }
  const id = resolveDestinationId(zone);
  const match = countries.find((c) => countryDbId(c) === id);
  return match ? countryLabel(match) : id || '—';
}

function gigsApiBase(): string {
  return (
    import.meta.env.VITE_API_URL_GIGS ||
    import.meta.env.VITE_GIGS_API ||
    'http://localhost:3000'
  );
}

/**
 * Call-center projects step:
 * - list existing projects with View / Edit / Delete
 * - Add project → title + destination zone (Country MongoDB _id)
 */
export default function CallCenterCreateProject({
  onBack,
  onSuccess,
}: CallCenterCreateProjectProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<ProjectMode>('list');
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [activeProject, setActiveProject] = useState<ProjectRow | null>(null);

  const [title, setTitle] = useState('');
  const [destinationCountryId, setDestinationCountryId] = useState('');
  const [countries, setCountries] = useState<Country[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(true);
  const [countryQuery, setCountryQuery] = useState('');
  const [countryMenuOpen, setCountryMenuOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const countryBoxRef = useRef<HTMLDivElement | null>(null);

  const companyId = Cookies.get('companyId') || '';

  const loadProjects = useCallback(async () => {
    if (!companyId) {
      setProjects([]);
      setListLoading(false);
      return;
    }
    setListLoading(true);
    try {
      const { data } = await axios.get(`${gigsApiBase()}/gigs/company/${companyId}?populate=companyId`);
      const rows = Array.isArray(data?.data) ? data.data : [];
      setProjects(rows);
    } catch (err) {
      console.error('[CallCenterProjects] load failed', err);
      setError(
        t('companyOnboarding.ui.callCenterProjectsLoadError', 'Could not load projects.')
      );
    } finally {
      setListLoading(false);
    }
  }, [companyId, t]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchAllCountries();
        if (!cancelled) setCountries(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error('[CallCenterProjects] countries load failed', err);
      } finally {
        if (!cancelled) setCountriesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sortedCountries = useMemo(() => {
    return [...countries]
      .filter((c) => isMongoObjectId(countryDbId(c)))
      .sort((a, b) =>
        countryLabel(a).localeCompare(countryLabel(b), undefined, { sensitivity: 'base' })
      );
  }, [countries]);

  const selectedCountry = sortedCountries.find(
    (c) => countryDbId(c) === destinationCountryId
  );
  const selectedCountryLabel = selectedCountry
    ? `${countryLabel(selectedCountry)}${selectedCountry.cca2 ? ` (${selectedCountry.cca2})` : ''}`
    : '';

  const filteredCountries = useMemo(() => {
    const q = countryQuery.trim().toLowerCase();
    // If input still shows the selected label, list all countries for easier re-pick.
    if (!q || (selectedCountryLabel && q === selectedCountryLabel.toLowerCase())) {
      return sortedCountries;
    }
    return sortedCountries.filter((c) => {
      const label = countryLabel(c).toLowerCase();
      const code = (c.cca2 || '').toLowerCase();
      return label.includes(q) || code.includes(q);
    });
  }, [sortedCountries, countryQuery, selectedCountryLabel]);

  useEffect(() => {
    if (!countryMenuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!countryBoxRef.current?.contains(event.target as Node)) {
        setCountryMenuOpen(false);
        if (selectedCountryLabel) setCountryQuery(selectedCountryLabel);
        else setCountryQuery('');
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [countryMenuOpen, selectedCountryLabel]);

  const titleOk = Boolean(title.trim());
  const zoneOk = Boolean(
    destinationCountryId && isMongoObjectId(destinationCountryId) && selectedCountry
  );
  const canSave = titleOk && zoneOk && !saving && !countriesLoading;

  const resetForm = () => {
    setTitle('');
    setDestinationCountryId('');
    setCountryQuery('');
    setCountryMenuOpen(false);
    setActiveProject(null);
    setError(null);
  };

  const pickCountry = (country: Country) => {
    const id = countryDbId(country);
    const label = `${countryLabel(country)}${country.cca2 ? ` (${country.cca2})` : ''}`;
    setDestinationCountryId(id);
    setCountryQuery(label);
    setCountryMenuOpen(false);
  };

  const openCreate = () => {
    resetForm();
    setMode('create');
  };

  const openEdit = (project: ProjectRow) => {
    setActiveProject(project);
    setTitle(project.title || '');
    const zoneId = resolveDestinationId(project.destination_zone);
    setDestinationCountryId(zoneId);
    const match = sortedCountries.find((c) => countryDbId(c) === zoneId);
    setCountryQuery(
      match
        ? `${countryLabel(match)}${match.cca2 ? ` (${match.cca2})` : ''}`
        : resolveDestinationLabel(project.destination_zone, sortedCountries)
    );
    setCountryMenuOpen(false);
    setError(null);
    setMode('edit');
  };

  const openView = (project: ProjectRow) => {
    setActiveProject(project);
    setError(null);
    setMode('view');
  };

  const backToList = () => {
    resetForm();
    setMode('list');
  };

  const markStepComplete = async () => {
    if (!companyId) return;
    const userType = localStorage.getItem('userType') || 'call-center';
    try {
      await axios.put(
        `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding/phases/2/steps/3`,
        { status: 'completed' },
        { params: { userType } }
      );
    } catch (onboardingErr) {
      console.warn('[CallCenterProjects] step 3 mark failed', onboardingErr);
    }
    Cookies.set('createGigStepCompleted', 'true');
    window.dispatchEvent(
      new CustomEvent('stepCompleted', { detail: { stepId: 3, phaseId: 2 } })
    );
  };

  const handleSave = async () => {
    if (!canSave || !selectedCountry) return;
    setSaving(true);
    setError(null);
    try {
      const userId = Cookies.get('userId');
      if (!userId || !companyId) {
        throw new Error('Missing user or company. Please refresh and try again.');
      }

      const countryId = countryDbId(selectedCountry);
      if (!isMongoObjectId(countryId)) {
        throw new Error('Invalid destination country id from database.');
      }

      const trimmed = title.trim();
      const payload = {
        userId,
        companyId,
        title: trimmed,
        description: trimmed,
        destination_zone: countryId,
        destinationZones: [countryId],
        status: 'to_activate',
      };

      let response: Response;
      if (mode === 'edit' && activeProject?._id) {
        response = await fetch(`${gigsApiBase()}/gigs/${activeProject._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: trimmed,
            description: trimmed,
            destination_zone: countryId,
            destinationZones: [countryId],
          }),
        });
      } else {
        response = await fetch(`${gigsApiBase()}/gigs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const responseText = await response.text();
      if (!response.ok) {
        let message = 'Failed to save project';
        try {
          const parsed = JSON.parse(responseText);
          message = parsed.message || message;
        } catch {
          message = responseText || message;
        }
        throw new Error(message);
      }

      await markStepComplete();
      let savedId: string | undefined;
      try {
        const parsed = JSON.parse(responseText);
        savedId = String(parsed?._id || parsed?.data?._id || activeProject?._id || '');
        if (!savedId) savedId = undefined;
      } catch {
        savedId = activeProject?._id ? String(activeProject._id) : undefined;
      }

      if (mode === 'edit') {
        await loadProjects();
        backToList();
        onSuccess?.(savedId);
      } else {
        // Continue funnel: parent opens next step (telephony)
        onSuccess?.(savedId);
      }
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

  const handleDelete = async (project: ProjectRow) => {
    const ok = window.confirm(
      t('companyOnboarding.ui.callCenterProjectDeleteConfirm', {
        title: project.title,
        defaultValue: `Delete project "${project.title}"?`,
      })
    );
    if (!ok) return;

    try {
      const response = await fetch(`${gigsApiBase()}/gigs/${project._id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Failed to delete project');
      }
      if (activeProject?._id === project._id) backToList();
      await loadProjects();
      onSuccess?.();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              'companyOnboarding.ui.callCenterProjectDeleteError',
              'Could not delete the project.'
            )
      );
    }
  };

  const formTitle =
    mode === 'edit'
      ? t('companyOnboarding.ui.callCenterProjectEditTitle', 'Edit project')
      : t('companyOnboarding.ui.callCenterProjectTitle', 'Create project');

  if (mode === 'list') {
    return (
      <div className="w-full max-w-3xl mx-auto py-10 px-4">
        <button
          type="button"
          onClick={onBack}
          className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('companyOnboarding.ui.backToOnboarding', 'Back to onboarding')}
        </button>

        <div className="rounded-3xl border border-gray-100 bg-white shadow-xl p-6 md:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-harx text-white">
                <Briefcase className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900">
                  {t('companyOnboarding.ui.callCenterProjectsTitle', 'Projects')}
                </h2>
                <p className="text-sm text-gray-500 font-medium">
                  {t(
                    'companyOnboarding.ui.callCenterProjectsHint',
                    'View, edit or add projects for this call center.'
                  )}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-harx px-5 py-3 text-sm font-black text-white shadow-lg shadow-harx-500/20 hover:opacity-95"
            >
              <Plus className="h-4 w-4" />
              {t('companyOnboarding.ui.callCenterProjectAdd', 'Add project')}
            </button>
          </div>

          {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

          {listLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-harx-500" />
            </div>
          ) : projects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center">
              <p className="text-sm font-medium text-gray-500 mb-4">
                {t(
                  'companyOnboarding.ui.callCenterProjectsEmpty',
                  'No projects yet. Create your first one.'
                )}
              </p>
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-bold text-white"
              >
                <Plus className="h-4 w-4" />
                {t('companyOnboarding.ui.callCenterProjectAdd', 'Add project')}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map((project) => (
                <div
                  key={project._id}
                  className="rounded-2xl border border-gray-100 bg-white p-4 flex flex-col md:flex-row md:items-center gap-4 hover:border-harx-200 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-black text-gray-900 truncate">{project.title}</h3>
                    <p className="mt-1 text-xs text-gray-500 font-medium inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {resolveDestinationLabel(project.destination_zone, sortedCountries)}
                    </p>
                    {project.status ? (
                      <span className="mt-2 inline-flex rounded-full bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider">
                        {project.status}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => openView(project)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      {t('companyOnboarding.ui.callCenterProjectView', 'View')}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(project)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-harx-200 px-3 py-2 text-xs font-bold text-harx-700 hover:bg-harx-50"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      {t('companyOnboarding.ui.callCenterProjectEdit', 'Edit')}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(project)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t('companyOnboarding.ui.callCenterProjectDelete', 'Delete')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (mode === 'view' && activeProject) {
    return (
      <div className="w-full max-w-xl mx-auto py-10 px-4">
        <button
          type="button"
          onClick={backToList}
          className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('companyOnboarding.ui.callCenterBackToProjects', 'Back to projects')}
        </button>
        <div className="rounded-3xl border border-gray-100 bg-white shadow-xl p-8 space-y-5">
          <h2 className="text-2xl font-black text-gray-900">
            {t('companyOnboarding.ui.callCenterProjectViewTitle', 'Project details')}
          </h2>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
              {t('companyOnboarding.ui.callCenterProjectLabel', 'Title')}
            </p>
            <p className="mt-1 text-lg font-black text-gray-900">{activeProject.title}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
              {t('companyOnboarding.ui.callCenterDestinationLabel', 'Destination zone')}
            </p>
            <p className="mt-1 text-base font-semibold text-gray-800">
              {resolveDestinationLabel(activeProject.destination_zone, sortedCountries)}
            </p>
          </div>
          {activeProject.status ? (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Status</p>
              <p className="mt-1 text-sm font-bold text-gray-700">{activeProject.status}</p>
            </div>
          ) : null}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => openEdit(activeProject)}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl border border-harx-200 px-4 py-3 text-sm font-black text-harx-700 hover:bg-harx-50"
            >
              <Pencil className="h-4 w-4" />
              {t('companyOnboarding.ui.callCenterProjectEdit', 'Edit')}
            </button>
            <button
              type="button"
              onClick={() => void handleDelete(activeProject)}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 px-4 py-3 text-sm font-black text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              {t('companyOnboarding.ui.callCenterProjectDelete', 'Delete')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto py-10 px-4">
      <button
        type="button"
        onClick={backToList}
        className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-800"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('companyOnboarding.ui.callCenterBackToProjects', 'Back to projects')}
      </button>

      <div className="rounded-3xl border border-gray-100 bg-white shadow-xl p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-harx text-white">
            <Briefcase className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900">{formTitle}</h2>
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
          <div className="relative" ref={countryBoxRef}>
            <Globe2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10 pointer-events-none" />
            <input
              type="text"
              role="combobox"
              aria-expanded={countryMenuOpen}
              aria-autocomplete="list"
              value={countryQuery}
              disabled={countriesLoading}
              onFocus={() => setCountryMenuOpen(true)}
              onClick={() => setCountryMenuOpen(true)}
              onChange={(e) => {
                const value = e.target.value;
                setCountryQuery(value);
                setCountryMenuOpen(true);
                // Typing means user is searching — clear previous selection until they pick again.
                if (selectedCountryLabel && value !== selectedCountryLabel) {
                  setDestinationCountryId('');
                }
              }}
              className="w-full pl-10 pr-10 py-3 border-2 border-harx-200 rounded-xl text-harx-900 font-medium focus:outline-none focus:ring-3 focus:ring-harx-300 focus:border-harx-400 disabled:opacity-50 bg-white"
              placeholder={
                countriesLoading
                  ? t('companyOnboarding.ui.callCenterDestinationLoading', 'Loading countries…')
                  : t(
                      'companyOnboarding.ui.callCenterDestinationPlaceholder',
                      'Search and select a country'
                    )
              }
            />
            {countryMenuOpen && !countriesLoading ? (
              <div className="absolute z-20 mt-2 w-full max-h-56 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl">
                {filteredCountries.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-gray-500">
                    {t('companyOnboarding.ui.callCenterDestinationNoResults', 'No countries found')}
                  </p>
                ) : (
                  filteredCountries.map((country) => {
                    const id = countryDbId(country);
                    const active = id === destinationCountryId;
                    return (
                      <button
                        key={id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => pickCountry(country)}
                        className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
                          active
                            ? 'bg-harx-50 text-harx-800'
                            : 'text-gray-800 hover:bg-gray-50'
                        }`}
                      >
                        {countryLabel(country)}
                        {country.cca2 ? ` (${country.cca2})` : ''}
                      </button>
                    );
                  })
                )}
              </div>
            ) : null}
          </div>
        </div>

        {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

        <button
          type="button"
          onClick={() => void handleSave()}
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
