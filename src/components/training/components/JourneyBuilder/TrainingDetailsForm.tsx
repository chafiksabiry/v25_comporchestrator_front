import { useState, useEffect } from 'react';
import { Target, ArrowLeft, ArrowRight } from 'lucide-react';

const HARX = '#ff4d4d';
const HARX_GRADIENT = 'linear-gradient(to right, #ff4d4d, #ec4899)';

interface TrainingDetailsFormProps {
  onComplete: (data: { trainingName: string; trainingDescription: string; estimatedDuration: string }) => void;
  onBack: () => void;
  gigData?: any;
}

export default function TrainingDetailsForm({ onComplete, onBack }: TrainingDetailsFormProps) {
  const [trainingName, setTrainingName] = useState('');
  const [trainingDescription, setTrainingDescription] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');

  const handleSubmit = () => {
    onComplete({ trainingName, trainingDescription, estimatedDuration });
  };

  const canProceed = trainingName.trim() && estimatedDuration;

  useEffect(() => {
    const el = document.querySelector('[data-journey-main-scroll]');
    if (el instanceof HTMLElement) el.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 520, margin: '0 auto', width: '100%' }}>

      <div style={{ textAlign: 'center' }}>
        <h3 style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Target style={{ width: 20, height: 20, color: HARX }} />
          Define your training vision
        </h3>
        <p style={{ fontSize: 13, color: '#6b7280', marginTop: 6 }}>
          AI-suggested goals · Success metrics · Timeline planning
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1f2937', marginBottom: 8 }}>
            Training Program Name <span style={{ color: HARX }}>*</span>
          </label>
          <input
            type="text"
            value={trainingName}
            onChange={(e) => setTrainingName(e.target.value)}
            placeholder="e.g., Customer Success Mastery Program"
            style={{
              width: '100%', border: '1px solid #d1d5db', borderRadius: 10,
              padding: '11px 14px', fontSize: 14, color: '#111827', outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1f2937', marginBottom: 8 }}>
            Program Description
          </label>
          <textarea
            value={trainingDescription}
            onChange={(e) => setTrainingDescription(e.target.value)}
            rows={3}
            placeholder="Describe the goals, outcomes, and key benefits of this training program..."
            style={{
              width: '100%', border: '1px solid #d1d5db', borderRadius: 10,
              padding: '11px 14px', fontSize: 14, color: '#111827', outline: 'none',
              resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1f2937', marginBottom: 10 }}>
            Expected Program Duration <span style={{ color: HARX }}>*</span>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {[
              { value: '120', label: 'Quick Start', desc: '1-2 hours' },
              { value: '240', label: 'Half Day', desc: '3-4 hours' },
              { value: '480', label: 'Full Day', desc: '6-8 hours' },
              { value: '2400', label: 'One Week', desc: 'Multi-session' },
              { value: '4800', label: 'Two Weeks', desc: 'Comprehensive' },
              { value: '9600', label: 'One Month', desc: 'Deep Learning' },
            ].map((d) => {
              const selected = estimatedDuration === d.value;
              return (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setEstimatedDuration(d.value)}
                  style={{
                    padding: '10px 8px', border: `1.5px solid ${selected ? HARX : '#e5e7eb'}`,
                    borderRadius: 10, background: selected ? '#fff5f5' : 'transparent',
                    cursor: 'pointer', textAlign: 'left', transition: 'all 150ms',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, color: selected ? HARX : '#111827' }}>{d.label}</div>
                  <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>{d.desc}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700,
            border: '1px solid #d1d5db', background: 'transparent', color: '#374151',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft style={{ width: 16, height: 16 }} />
          Back
        </button>

        <span style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af' }}>Step 2 of 4</span>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canProceed}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700,
            border: 'none', color: '#fff', cursor: canProceed ? 'pointer' : 'not-allowed',
            background: canProceed ? HARX_GRADIENT : '#d1d5db',
            boxShadow: canProceed ? '0 2px 8px rgba(255,77,77,0.25)' : 'none',
          }}
        >
          Continue
          <ArrowRight style={{ width: 16, height: 16 }} />
        </button>
      </div>
    </div>
  );
}
