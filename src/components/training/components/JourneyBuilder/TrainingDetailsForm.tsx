import React from 'react';
import { Target, Brain, Loader2 } from 'lucide-react';

const HARX = '#ff4d4d';

export const VISION_DURATIONS = [
  { value: '120', label: 'Quick Start', desc: '1-2 hours' },
  { value: '240', label: 'Half Day', desc: '3-4 hours' },
  { value: '480', label: 'Full Day', desc: '6-8 hours' },
] as const;

interface TrainingDetailsFormProps {
  subStep: number;
  trainingName: string;
  trainingDescription: string;
  estimatedDuration: string;
  onTrainingNameChange: (v: string) => void;
  onTrainingDescriptionChange: (v: string) => void;
  onEstimatedDurationChange: (v: string) => void;
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
  gigData,
  onSuggestTitle,
  onSuggestDescription,
  generatingTitle = false,
  generatingDescription = false,
}: TrainingDetailsFormProps) {
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
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <h3
            style={{
              fontSize: 17,
              fontWeight: 800,
              color: '#111827',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Target style={{ width: 18, height: 18, color: HARX }} />
            Define your training vision
          </h3>
          <p style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
            {subStep === 0 && 'Step 1 of 2 — Name & description'}
            {subStep === 1 && 'Step 2 of 2 — How long should it run?'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 10 }}>
            {[0, 1].map((i) => (
              <div
                key={i}
                style={{
                  width: subStep === i ? 22 : 8,
                  height: 8,
                  borderRadius: 9999,
                  background: subStep === i ? HARX : subStep > i ? '#059669' : '#e5e7eb',
                  transition: 'all 200ms',
                }}
              />
            ))}
          </div>
        </div>

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
                title="Generate title and description from gig"
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
                AI
              </button>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1f2937' }}>
                  Training Program Name <span style={{ color: HARX }}>*</span>
                </label>
              </div>
              <input
                type="text"
                value={trainingName}
                onChange={(e) => onTrainingNameChange(e.target.value)}
                placeholder={gigData?.title ? `e.g., ${gigData.title}` : 'e.g., Customer Success Mastery Program'}
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
                  Program Description <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional)</span>
                </label>
              </div>
              <textarea
                value={trainingDescription}
                onChange={(e) => onTrainingDescriptionChange(e.target.value)}
                rows={5}
                placeholder="Describe the goals, outcomes, and key benefits of this training program..."
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
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1f2937', marginBottom: 8 }}>
              Expected Program Duration <span style={{ color: HARX }}>*</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
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
                      textAlign: 'left',
                      transition: 'all 150ms',
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 600, color: selected ? HARX : '#111827' }}>{d.label}</div>
                    <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>{d.desc}</div>
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
