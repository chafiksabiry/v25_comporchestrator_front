import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { InfoText } from './InfoText';
import {
  Briefcase,
  ArrowRight,
  ArrowLeft,
  Plus,
  X,
  Globe2,
  Target,
} from 'lucide-react';
import { GigData } from '../types';
import { predefinedOptions } from '../lib/guidance';
import {
  loadActivities,
  loadIndustries,
  getActivityOptions,
  getIndustryOptions,
  getActivityNameById,
  getIndustryNameById,
} from '../lib/activitiesIndustries';
import { fetchAllCountries, Country } from '../lib/api';

interface BasicSectionProps {
  data: GigData;
  onChange: (data: GigData) => void;
  errors: { [key: string]: string[] };
  onNext?: () => void;
  onPrevious?: () => void;
  onSave?: () => void;
  onAIAssist?: () => void;
  onSectionChange?: (sectionId: string) => void;
  currentSection: string;
}

type ChipField = 'highlights' | 'deliverables' | 'sectors';

const BasicSection: React.FC<BasicSectionProps> = ({
  data,
  onChange,
  errors,
  onPrevious,
  onNext,
  onSectionChange,
}) => {
  const { t } = useTranslation();
  const titleOk = Boolean(String(data.title || '').trim());

  const [activities, setActivities] = useState<Array<{ value: string; label: string; category: string }>>([]);
  const [industries, setIndustries] = useState<Array<{ value: string; label: string }>>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(true);
  const [draft, setDraft] = useState<Record<ChipField, string>>({
    highlights: '',
    deliverables: '',
    sectors: '',
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingRefs(true);
        await Promise.all([loadActivities(), loadIndustries()]);
        const countriesData = await fetchAllCountries();
        if (cancelled) return;
        setActivities(getActivityOptions());
        setIndustries(getIndustryOptions());
        setCountries(Array.isArray(countriesData) ? countriesData : []);
      } catch (err) {
        console.error('BasicSection: failed to load reference data', err);
        if (!cancelled) {
          setActivities([]);
          setIndustries([]);
          setCountries([]);
        }
      } finally {
        if (!cancelled) setLoadingRefs(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const goNext = () => {
    if (!titleOk) return;
    onNext?.();
  };

  const goSkipToReview = () => {
    if (!titleOk) return;
    if (onSectionChange) {
      onSectionChange('review');
      return;
    }
    onNext?.();
  };

  const listFor = (field: ChipField): string[] => {
    if (field === 'highlights') return data.highlights || [];
    if (field === 'deliverables') return data.deliverables || [];
    return data.sectors || [];
  };

  const setList = (field: ChipField, next: string[]) => {
    onChange({ ...data, [field]: next });
  };

  const addChip = (field: ChipField) => {
    const value = draft[field].trim();
    if (!value) return;
    const current = listFor(field);
    if (current.includes(value)) {
      setDraft((prev) => ({ ...prev, [field]: '' }));
      return;
    }
    setList(field, [...current, value]);
    setDraft((prev) => ({ ...prev, [field]: '' }));
  };

  const removeChip = (field: ChipField, index: number) => {
    setList(
      field,
      listFor(field).filter((_, i) => i !== index)
    );
  };

  const addSectorFromSelect = (value: string) => {
    if (!value) return;
    const current = data.sectors || [];
    if (!current.includes(value)) {
      onChange({ ...data, sectors: [...current, value] });
    }
  };

  const addIndustry = (value: string) => {
    if (!value) return;
    const current = data.industries || [];
    if (!current.includes(value)) {
      onChange({ ...data, industries: [...current, value] });
    }
  };

  const removeIndustry = (id: string) => {
    onChange({
      ...data,
      industries: (data.industries || []).filter((x) => x !== id),
    });
  };

  const addActivity = (value: string) => {
    if (!value) return;
    const current = data.activities || [];
    if (!current.includes(value)) {
      onChange({ ...data, activities: [...current, value] });
    }
  };

  const removeActivity = (id: string) => {
    onChange({
      ...data,
      activities: (data.activities || []).filter((x) => x !== id),
    });
  };

  const addDestination = (countryId: string) => {
    if (!countryId) return;
    const current = data.destinationZones || [];
    if (current.includes(countryId)) return;
    const country = countries.find((c) => c._id === countryId);
    const nextZones = [...current, countryId];
    onChange({
      ...data,
      destinationZones: nextZones,
      destination_zone: data.destination_zone || countryId,
      destination_zone_meta: data.destination_zone_meta ||
        (country
          ? {
              _id: country._id,
              name: {
                common: country.name?.common || '',
                official: (country.name as any)?.official || country.name?.common || '',
              },
              cca2: country.cca2,
            }
          : undefined),
    });
  };

  const removeDestination = (countryId: string) => {
    const nextZones = (data.destinationZones || []).filter((z) => z !== countryId);
    const nextPrimary = nextZones[0] || '';
    const country = countries.find((c) => c._id === nextPrimary);
    onChange({
      ...data,
      destinationZones: nextZones,
      destination_zone: nextPrimary,
      destination_zone_meta: country
        ? {
            _id: country._id,
            name: {
              common: country.name?.common || '',
              official: (country.name as any)?.official || country.name?.common || '',
            },
            cca2: country.cca2,
          }
        : undefined,
    });
  };

  const renderChipEditor = (field: ChipField, labelKey: string, placeholderKey: string) => (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">{t(labelKey)}</label>
      <div className="flex flex-wrap gap-2 mb-3">
        {listFor(field).map((item, index) => (
          <span
            key={`${field}-${index}`}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-harx-50 text-harx-800 border border-harx-200"
          >
            {item}
            <button
              type="button"
              onClick={() => removeChip(field, index)}
              className="text-harx-500 hover:text-harx-800"
              title={t('gigCreation.suggestions.remove')}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={draft[field]}
          onChange={(e) => setDraft((prev) => ({ ...prev, [field]: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addChip(field);
            }
          }}
          className="flex-1 px-4 py-2.5 border-2 border-harx-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-harx-300"
          placeholder={t(placeholderKey)}
        />
        <button
          type="button"
          onClick={() => addChip(field)}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-harx-500 text-white text-sm font-bold hover:bg-harx-600"
        >
          <Plus className="w-4 h-4" />
          {t('gigCreation.suggestions.add')}
        </button>
      </div>
    </div>
  );

  const availableSectors = predefinedOptions.sectors.filter(
    (s) => !(data.sectors || []).includes(s)
  );

  return (
    <div className="w-full bg-white py-6">
      <div className="space-y-8">
        <InfoText>{t('gigCreation.basic.infoBannerFull')}</InfoText>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-harx px-6 py-4">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-lg mr-3">
                <Briefcase className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{t('gigCreation.basic.sectionTitle')}</h3>
                <p className="text-white/80 text-sm">{t('gigCreation.basic.titleHint')}</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('gigCreation.basic.titleLabel')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={data.title || ''}
                onChange={(e) => onChange({ ...data, title: e.target.value })}
                className={`w-full px-4 py-3 bg-gradient-to-r from-harx-50 to-harx-alt-50 border-2 rounded-xl text-harx-900 font-medium focus:outline-none focus:ring-3 focus:ring-harx-300 focus:border-harx-400 transition-all ${
                  errors.title ? 'border-red-300 focus:ring-red-300' : 'border-harx-200'
                }`}
                placeholder={t('gigCreation.basic.titlePlaceholder')}
              />
              {errors.title && (
                <p className="mt-2 text-sm text-red-600 font-medium">{errors.title.join(', ')}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('gigCreation.suggestions.jobDescription')}
              </label>
              <textarea
                value={data.description || ''}
                onChange={(e) => onChange({ ...data, description: e.target.value })}
                rows={5}
                className={`w-full px-4 py-3 bg-gradient-to-r from-harx-50 to-harx-alt-50 border-2 rounded-xl text-harx-900 font-medium focus:outline-none focus:ring-3 focus:ring-harx-300 focus:border-harx-400 transition-all resize-none ${
                  errors.description ? 'border-red-300 focus:ring-red-300' : 'border-harx-200'
                }`}
                placeholder={t('gigCreation.suggestions.descriptionPlaceholder')}
              />
              {errors.description && (
                <p className="mt-2 text-sm text-red-600 font-medium">{errors.description.join(', ')}</p>
              )}
            </div>

            {renderChipEditor(
              'highlights',
              'gigCreation.suggestions.highlights',
              'gigCreation.suggestions.enterHighlight'
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('gigCreation.suggestions.sectors')}
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {(data.sectors || []).map((sector, index) => (
                  <span
                    key={`sector-${index}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-violet-50 text-violet-800 border border-violet-200"
                  >
                    {sector}
                    <button
                      type="button"
                      onClick={() => removeChip('sectors', index)}
                      className="text-violet-500 hover:text-violet-800"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
              <select
                className="w-full px-4 py-2.5 border-2 border-harx-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-harx-300"
                defaultValue=""
                onChange={(e) => {
                  addSectorFromSelect(e.target.value);
                  e.target.value = '';
                }}
              >
                <option value="" disabled>
                  {t('gigCreation.suggestions.selectSector')}
                </option>
                {availableSectors.map((sector) => (
                  <option key={sector} value={sector}>
                    {sector}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Target className="w-4 h-4 text-harx-alt-600" />
                {t('gigCreation.suggestions.industries')}
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {(data.industries || []).map((id) => {
                  const name = getIndustryNameById(id);
                  if (!name) return null;
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-harx-alt-50 text-harx-alt-800 border border-harx-alt-200"
                    >
                      {name}
                      <button type="button" onClick={() => removeIndustry(id)}>
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  );
                })}
              </div>
              <select
                className="w-full px-4 py-2.5 border-2 border-harx-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-harx-300"
                defaultValue=""
                disabled={loadingRefs}
                onChange={(e) => {
                  addIndustry(e.target.value);
                  e.target.value = '';
                }}
              >
                <option value="" disabled>
                  {loadingRefs
                    ? t('gigCreation.suggestions.loadingIndustries')
                    : t('gigCreation.suggestions.selectIndustry')}
                </option>
                {industries
                  .filter((i) => !(data.industries || []).includes(i.value))
                  .map((industry) => (
                    <option key={industry.value} value={industry.value}>
                      {industry.label}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('gigCreation.suggestions.activities')}
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {(data.activities || []).map((id) => {
                  const name = getActivityNameById(id);
                  if (!name) return null;
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-emerald-50 text-emerald-800 border border-emerald-200"
                    >
                      {name}
                      <button type="button" onClick={() => removeActivity(id)}>
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  );
                })}
              </div>
              <select
                className="w-full px-4 py-2.5 border-2 border-harx-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-harx-300"
                defaultValue=""
                disabled={loadingRefs}
                onChange={(e) => {
                  addActivity(e.target.value);
                  e.target.value = '';
                }}
              >
                <option value="" disabled>
                  {loadingRefs
                    ? t('gigCreation.suggestions.loadingActivities')
                    : t('gigCreation.suggestions.selectActivity')}
                </option>
                {activities
                  .filter((a) => !(data.activities || []).includes(a.value))
                  .map((activity) => (
                    <option key={activity.value} value={activity.value}>
                      {activity.label}
                    </option>
                  ))}
              </select>
            </div>

            {renderChipEditor(
              'deliverables',
              'gigCreation.suggestions.deliverables',
              'gigCreation.suggestions.enterDeliverable'
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-harx-600" />
                {t('gigCreation.suggestions.destinationZones')}
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {(data.destinationZones || []).map((id) => {
                  const country = countries.find((c) => c._id === id);
                  const name = country?.name?.common || id;
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-800 border border-blue-200"
                    >
                      {name}
                      <button type="button" onClick={() => removeDestination(id)}>
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  );
                })}
              </div>
              <select
                className="w-full px-4 py-2.5 border-2 border-harx-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-harx-300"
                defaultValue=""
                disabled={loadingRefs}
                onChange={(e) => {
                  addDestination(e.target.value);
                  e.target.value = '';
                }}
              >
                <option value="" disabled>
                  {loadingRefs
                    ? t('gigCreation.suggestions.loadingCountries')
                    : t('gigCreation.suggestions.addDestinationZone')}
                </option>
                {countries
                  .filter((c) => !(data.destinationZones || []).includes(c._id))
                  .map((country) => (
                    <option key={country._id} value={country._id}>
                      {country.name?.common}
                    </option>
                  ))}
              </select>
              {!loadingRefs && (
                <p className="mt-2 text-xs text-gray-500 text-center italic">
                  {t('gigCreation.suggestions.countriesAvailable', {
                    count: countries.filter(
                      (c) => !(data.destinationZones || []).includes(c._id)
                    ).length,
                  })}
                </p>
              )}
            </div>

            <p className="text-xs text-gray-500">{t('gigCreation.basic.skipTip')}</p>
          </div>
        </div>

        <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onPrevious}
            disabled={!onPrevious}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-gray-700 border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            {t('gigCreation.nav.previous')}
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={goSkipToReview}
              disabled={!titleOk}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-harx-200 text-harx-700 hover:bg-harx-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {t('gigCreation.basic.skipToReview')}
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={!titleOk}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-harx-500 text-white hover:bg-harx-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {t('gigCreation.nav.next')}
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BasicSection;
