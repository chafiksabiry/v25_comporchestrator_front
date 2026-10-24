import React from 'react';
import { useTranslation } from 'react-i18next';
import { CONTENT_LANGUAGES } from '../../utils/contentLanguage';
import { Target, Brain, Loader2 } from 'lucide-react';

const HARX = '#ff4d4d';

export const VISION_DURATIONS = [
  { value: '120', key: 'd120', label: 'Quick Start', desc: '1-2 hours' },
  { value: '240', key: 'd240', label: 'Half Day', desc: '3-4 hours' },
  { value: '480', key: 'd480', label: 'Full Day', desc: '6-8 hours' },
] as const;

interface TrainingDetailsFormProps {
  subStep: number;
  trainingName: string;
  trainingDescription: string;
  estimatedDuration: string;
  onTrainingNameChange: (v: string) => void;
  onTrainingDescriptionChange: (v: string) => void;
  onEstimatedDurationChange: (v: string) => void;
  contentLanguage: string;
  onContentLanguageChange: (code: string) => void;
  gigData?: { title?: string } | null;
  onSuggestTitle?: () => void;
  onSuggestDescription?: () => void;
  generatingTitle?: boolean;
  generatingDescription?: boolean;
}

export default function TrainingDetailsForm({
  subStep,
  trainingName,
  trainingDescription,
  estimatedDuration,
  onTrainingNameChange,
  onTrainingDescriptionChange,
  onEstimatedDurationChange,
  contentLanguage,
  onContentLanguageChange,
  gigData,
  onSuggestTitle,
  onSuggestDescription,
  generatingTitle = false,
  generatingDescription = false,
}: TrainingDetailsFormProps) {
  const { t } = useTranslation();
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        width: '100%',
        maxWidth: 500,
        margin: '0 auto',
      }}
    >
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: 8 }}>
        {subStep === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  onSuggestTitle?.();
                  onSuggestDescription?.();
                }}
                disabled={generatingTitle || generatingDescription}
                title={t('training.vision.ai')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  border: '1px solid #fecaca',
                  borderRadius: 999,
                  background: '#fff',
                  color: HARX,
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '6px 10px',
                  cursor: generatingTitle || generatingDescription ? 'not-allowed' : 'pointer',
                  opacity: generatingTitle || generatingDescription ? 0.7 : 1
                }}
              >
                {generatingTitle || generatingDescription ? (
                  <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" />
                ) : (
                  <Brain style={{ width: 13, height: 13 }} />
                )}
                {t('training.vision.aiButton')}
              </button>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1f2937', marginBottom: 6 }}>
                {t('training.vision.language')}
              </label>
              <select
                value={contentLanguage}
                onChange={(e) => onContentLanguageChange(e.target.value)}
                style={{
                  width: '100%',
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  padding: '10px 12px',
                  fontSize: 14,
                  color: '#111827',
                  background: '#fff',
                  boxSizing: 'border-box',
                }}
              >
                {CONTENT_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>{t('training.vision.languageHint')}</div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                {generatingTitle || generatingDescription ? t('training.vision.generating') : t('training.vision.editHint')}
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1f2937' }}>
                  {t('training.vision.name')} <span style={{ color: HARX }}>*</span>
                </label>
              </div>
              <input
                type="text"
                value={trainingName}
                onChange={(e) => onTrainingNameChange(e.target.value)}
                placeholder={gigData?.title ? t('training.vision.namePh', { title: gigData.title }) : t('training.vision.namePhDefault')}
                autoFocus
                style={{
                  width: '100%',
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  padding: '10px 12px',
                  fontSize: 14,
                  color: '#111827',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1f2937' }}>
                  {t('training.vision.desc')} <span style={{ fontWeight: 400, color: '#9ca3af' }}>{t('training.vision.optional')}</span>
                </label>
              </div>
              <textarea
                value={trainingDescription}
                onChange={(e) => onTrainingDescriptionChange(e.target.value)}
                rows={5}
                placeholder={t('training.vision.descPh')}
                style={{
                  width: '100%',
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  padding: '10px 12px',
                  fontSize: 14,
                  color: '#111827',
                  outline: 'none',
                  resize: 'none',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  height: 120,
                  minHeight: 120,
                  maxHeight: 120,
                  overflowY: 'auto',
                }}
              />
            </div>
          </div>
        )}

        {subStep === 1 && (
          <div
            style={{
              maxWidth: 560,
              margin: '0 auto',
              width: '100%',
              minHeight: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <label style={{ display: 'block', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#1f2937', marginBottom: 10 }}>
              {t('training.vision.duration')} <span style={{ color: HARX }}>*</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
              {VISION_DURATIONS.map((d) => {
                const selected = estimatedDuration === d.value;
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => onEstimatedDurationChange(d.value)}
                    style={{
                      padding: '9px 6px',
                      border: `1.5px solid ${selected ? HARX : '#e5e7eb'}`,
                      borderRadius: 8,
                      background: selected ? '#fff5f5' : 'transparent',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 150ms',
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 600, color: selected ? HARX : '#111827' }}>{t(`training.vision.${d.key}`)}</div>
                    <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>{t(`training.vision.${d.key}d`)}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
