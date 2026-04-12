import React, { useState, useEffect } from 'react';
import { Target, ArrowLeft, ArrowRight } from 'lucide-react';

const HARX = '#ff4d4d';
const HARX_GRADIENT = 'linear-gradient(to right, #ff4d4d, #ec4899)';

interface TrainingDetailsFormProps {
  onComplete: (data: { trainingName: string; trainingDescription: string; estimatedDuration: string }) => void;
  onBack: () => void;
  gigData?: { title?: string } | null;
}

const DURATIONS = [
  { value: '120', label: 'Quick Start', desc: '1-2 hours' },
  { value: '240', label: 'Half Day', desc: '3-4 hours' },
  { value: '480', label: 'Full Day', desc: '6-8 hours' },
  { value: '2400', label: 'One Week', desc: 'Multi-session' },
  { value: '4800', label: 'Two Weeks', desc: 'Comprehensive' },
  { value: '9600', label: 'One Month', desc: 'Deep Learning' },
] as const;

export default function TrainingDetailsForm({ onComplete, onBack, gigData }: TrainingDetailsFormProps) {
  const [subStep, setSubStep] = useState(0);
  const [trainingName, setTrainingName] = useState('');
  const [trainingDescription, setTrainingDescription] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');

  useEffect(() => {
    const el = document.querySelector('[data-journey-main-scroll]');
    if (el instanceof HTMLElement) el.scrollTo({ top: 0, behavior: 'auto' });
  }, [subStep]);

  const canNextFromName = trainingName.trim().length > 0;
  const canFinish = estimatedDuration.length > 0;

  const handleFooterContinue = () => {
    if (subStep === 0) {
      if (canNextFromName) setSubStep(1);
    } else if (subStep === 1) {
      setSubStep(2);
    } else {
      if (canFinish) onComplete({ trainingName, trainingDescription, estimatedDuration });
    }
  };

  const handleFooterBack = () => {
    if (subStep === 0) onBack();
    else setSubStep(subStep - 1);
  };

  const continueDisabled =
    subStep === 0 ? !canNextFromName : subStep === 2 ? !canFinish : false;

  const continueLabel = subStep === 2 ? 'Continue' : 'Next';

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
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          paddingBottom: 8,
        }}
      >
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
            {subStep === 0 && 'Step 1 of 3 — Name your program'}
            {subStep === 1 && 'Step 2 of 3 — Add context (optional)'}
            {subStep === 2 && 'Step 3 of 3 — How long should it run?'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 10 }}>
            {[0, 1, 2].map((i) => (
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
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1f2937', marginBottom: 6 }}>
              Training Program Name <span style={{ color: HARX }}>*</span>
            </label>
            <input
              type="text"
              value={trainingName}
              onChange={(e) => setTrainingName(e.target.value)}
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
        )}

        {subStep === 1 && (
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1f2937', marginBottom: 6 }}>
              Program Description <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional)</span>
            </label>
            <textarea
              value={trainingDescription}
              onChange={(e) => setTrainingDescription(e.target.value)}
              rows={5}
              placeholder="Describe the goals, outcomes, and key benefits of this training program..."
              autoFocus
              style={{
                width: '100%',
                border: '1px solid #d1d5db',
                borderRadius: 8,
                padding: '10px 12px',
                fontSize: 14,
                color: '#111827',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                minHeight: 120,
              }}
            />
          </div>
        )}

        {subStep === 2 && (
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1f2937', marginBottom: 8 }}>
              Expected Program Duration <span style={{ color: HARX }}>*</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {DURATIONS.map((d) => {
                const selected = estimatedDuration === d.value;
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setEstimatedDuration(d.value)}
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

      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          paddingTop: 12,
          marginTop: 'auto',
          borderTop: '1px solid #f3f4f6',
        }}
      >
        <button
          type="button"
          onClick={handleFooterBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '7px 14px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 700,
            border: '1px solid #d1d5db',
            background: 'transparent',
            color: '#374151',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft style={{ width: 14, height: 14 }} />
          Back
        </button>

        <span style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af' }}>Vision {subStep + 1}/3</span>

        <button
          type="button"
          onClick={handleFooterContinue}
          disabled={continueDisabled}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '7px 16px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 700,
            border: 'none',
            color: '#fff',
            cursor: continueDisabled ? 'not-allowed' : 'pointer',
            background: continueDisabled ? '#d1d5db' : HARX_GRADIENT,
            boxShadow: continueDisabled ? 'none' : '0 2px 8px rgba(255,77,77,0.25)',
          }}
        >
          {continueLabel}
          <ArrowRight style={{ width: 14, height: 14 }} />
        </button>
      </div>
    </div>
  );
}
