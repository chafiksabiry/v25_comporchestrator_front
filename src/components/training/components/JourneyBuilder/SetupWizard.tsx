import { useState, useEffect } from 'react';
import { Building2, Loader2, Target, Users, Sparkles, Briefcase, AlertCircle, CheckCircle, ArrowRight, ArrowLeft, ChevronDown, Check } from 'lucide-react';
import { Company, TrainingJourney } from '../../types/core';
import { Industry, GigFromApi } from '../../types';
import { TrainingMethodology } from '../../types/methodology';
import MethodologySelector from './MethodologySelector';
import MethodologyBuilder from '../Methodology/MethodologyBuilder';
import { OnboardingService } from '../../infrastructure/services/OnboardingService';
import GigSelector from '../Dashboard/GigSelector';
import TrainingDetailsForm from './TrainingDetailsForm';
import React from 'react';

interface SetupWizardProps {
  onComplete: (company: Company, journey: TrainingJourney, methodology?: TrainingMethodology, gigId?: string) => void;
}

export default function SetupWizard({ onComplete }: SetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [company, setCompany] = useState<Partial<Company>>({});
  const [companyData, setCompanyData] = useState<any>(null);
  const [journey, setJourney] = useState<Partial<TrainingJourney>>({});
  const [selectedMethodology, setSelectedMethodology] = useState<TrainingMethodology | null>(null);
  const [showMethodologySelector, setShowMethodologySelector] = useState(false);
  const [showMethodologyBuilder, setShowMethodologyBuilder] = useState(false);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [loadingIndustries, setLoadingIndustries] = useState(true);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [selectedGig, setSelectedGig] = useState<GigFromApi | null>(null);
  const [trainingDetails, setTrainingDetails] = useState<{ trainingName: string; trainingDescription: string; estimatedDuration: string } | null>(null);
  const [showAllComponents, setShowAllComponents] = useState(false);

  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        setLoadingCompany(true);
        const response = await OnboardingService.fetchCompanyData();
        if (response.success && response.data) {
          setCompanyData(response.data);
          setCompany(prev => ({ ...prev, name: response.data.name, industry: response.data.industry }));
        }
      } catch (error) {
        console.error('Error fetching company data:', error);
      } finally {
        setLoadingCompany(false);
      }
    };
    fetchCompanyData();
  }, []);

  useEffect(() => {
    const fetchIndustries = async () => {
      try {
        setLoadingIndustries(true);
        const response = await OnboardingService.fetchIndustries();
        if (response.success && response.data) {
          setIndustries(response.data.filter(ind => ind.isActive));
        }
      } catch (error) {
        console.error('Error fetching industries:', error);
      } finally {
        setLoadingIndustries(false);
      }
    };
    fetchIndustries();
  }, []);

  useEffect(() => {
    const el = document.querySelector('[data-journey-main-scroll]');
    if (el instanceof HTMLElement) el.scrollTo({ top: 0, behavior: 'auto' });
  }, [currentStep]);

  const steps = [
    { id: 1, label: 'Industry' },
    { id: 2, label: 'Vision' },
    { id: 3, label: 'Team' },
    { id: 4, label: 'Methodology' },
  ];

  const handleNext = () => {
    if (currentStep === 5) {
      const realCompanyId = OnboardingService.getCompanyId();
      if (!realCompanyId) { alert('Internal Error: Company ID not found.'); return; }
      const completeCompany: Company = { id: realCompanyId, name: companyData?.name || companyData?.data?.name || company.name || '', industry: company.industry || '', size: company.size || 'medium', setupComplete: true };
      const completeJourney: TrainingJourney = {
        id: Date.now().toString(), companyId: completeCompany.id,
        name: trainingDetails?.trainingName || selectedGig?.title || 'New Training Journey',
        description: trainingDetails?.trainingDescription || selectedGig?.description || '',
        status: 'draft',
        steps: [
          { id: '1', title: 'Upload & Transform Content', description: 'Upload existing materials and let AI transform them', type: 'content-upload', status: 'pending', order: 1, estimatedTime: '15 minutes', requirements: ['Documents', 'Videos', 'Presentations'], outputs: ['Enhanced content', 'Media elements', 'Interactive components'] },
          { id: '2', title: 'AI Content Enhancement', description: 'AI analyzes and enhances your content with multimedia', type: 'ai-analysis', status: 'pending', order: 2, estimatedTime: '10 minutes', requirements: ['Uploaded content'], outputs: ['Videos', 'Audio narration', 'Infographics', 'Interactive elements'] },
          { id: '3', title: 'Curriculum Design', description: 'Structure your enhanced content into learning modules', type: 'curriculum-design', status: 'pending', order: 3, estimatedTime: '20 minutes', requirements: ['Enhanced content'], outputs: ['Learning modules', 'Assessments', 'Progress tracking'] },
          { id: '4', title: 'Live Training Setup', description: 'Configure live streaming and interactive sessions', type: 'live-setup', status: 'pending', order: 4, estimatedTime: '10 minutes', requirements: ['Curriculum'], outputs: ['Live sessions', 'Interactive features', 'Recording setup'] },
          { id: '5', title: 'Launch & Monitor', description: 'Deploy your training program and track progress', type: 'launch', status: 'pending', order: 5, estimatedTime: '5 minutes', requirements: ['Complete setup'], outputs: ['Live training program', 'Analytics dashboard', 'Progress reports'] },
        ],
        createdAt: new Date().toISOString(),
        estimatedDuration: trainingDetails?.estimatedDuration || journey.estimatedDuration || '1 hour total setup',
        targetRoles: journey.targetRoles || [],
      };
      onComplete(completeCompany, completeJourney, selectedMethodology || undefined, selectedGig?._id);
    } else if (currentStep === 3) {
      setShowMethodologySelector(true);
    } else if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleTrainingDetailsComplete = (details: { trainingName: string; trainingDescription: string; estimatedDuration: string }) => {
    setTrainingDetails(details);
    setCurrentStep(3);
  };

  const handleGigSelect = (gig: GigFromApi) => { setSelectedGig(gig); };

  const handleMethodologySelect = (m: TrainingMethodology) => { setSelectedMethodology(m); setShowMethodologySelector(false); setCurrentStep(5); };
  const handleMethodologyApply = (m: TrainingMethodology) => { setSelectedMethodology(m); setShowMethodologyBuilder(false); setCurrentStep(5); };
  const handleCustomMethodology = () => { setShowMethodologySelector(false); setCurrentStep(5); };

  if (showMethodologySelector) {
    return <MethodologySelector onMethodologySelect={handleMethodologySelect} onCustomMethodology={handleCustomMethodology} onBack={() => { setShowMethodologySelector(false); setCurrentStep(3); }} />;
  }
  if (showMethodologyBuilder) {
    return <MethodologyBuilder onApplyMethodology={handleMethodologyApply} selectedIndustry={company.industry} />;
  }

  const isStepValid = () => {
    switch (currentStep) {
      case 1: return companyData && company.industry && selectedGig !== null;
      case 2: return trainingDetails !== null;
      case 3: return journey.targetRoles && journey.targetRoles.length > 0;
      case 4: return selectedMethodology !== null;
      case 5: return true;
      default: return true;
    }
  };

  if (currentStep === 4) return null;

  const stepNum = currentStep > 4 ? 4 : currentStep;
  const isStep2 = currentStep === 2;

  const HARX = '#ff4d4d';
  const HARX_GRADIENT = 'linear-gradient(to right, #ff4d4d, #ec4899)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>

      {/* ── Stepper ── */}
      <div style={{ flexShrink: 0, padding: '12px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          {steps.map((step, i) => {
            const done = currentStep > step.id;
            const active = currentStep === step.id || (currentStep === 5 && step.id === 4);
            return (
              <React.Fragment key={step.id}>
                <button
                  type="button"
                  onClick={() => { if (done) setCurrentStep(step.id); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '4px 10px', borderRadius: 9999, border: 'none',
                    fontSize: 12, fontWeight: 600, cursor: done ? 'pointer' : 'default',
                    background: 'transparent',
                    color: done ? '#059669' : active ? HARX : '#9ca3af',
                    transition: 'all 150ms',
                  }}
                >
                  <span style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 22, height: 22, borderRadius: '50%', fontSize: 11, fontWeight: 700,
                    background: done ? '#059669' : active ? HARX : '#d1d5db',
                    color: '#fff',
                  }}>
                    {done ? <Check style={{ width: 12, height: 12 }} /> : step.id}
                  </span>
                  <span>{step.label}</span>
                </button>
                {i < steps.length - 1 && (
                  <div style={{ width: 24, height: 2, borderRadius: 1, background: done ? '#059669' : '#e5e7eb' }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{
        flex: 1, minHeight: 0, overflowY: 'auto',
        display: currentStep === 1 ? 'flex' : 'block',
        alignItems: currentStep === 1 ? 'center' : undefined,
        justifyContent: currentStep === 1 ? 'center' : undefined,
        padding: currentStep === 1 ? '0 32px' : '20px 32px',
      }}>
        <div style={{ maxWidth: 520, margin: '0 auto', width: '100%' }}>

          {currentStep === 1 && (
            <>
              <div style={{ textAlign: 'center', marginBottom: 28 }}>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.01em' }}>
                  Welcome to your training journey
                </h3>
                <p style={{ fontSize: 13, color: '#6b7280', marginTop: 6 }}>
                  Industry templates · Smart defaults · Compliance
                </p>
              </div>

              {loadingCompany ? (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <Loader2 className="animate-spin" style={{ width: 24, height: 24, color: HARX, margin: '0 auto 10px' }} />
                  <p style={{ fontSize: 13, color: '#6b7280' }}>Loading company information...</p>
                </div>
              ) : companyData ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1f2937', marginBottom: 8 }}>
                      Training industry <span style={{ color: HARX }}>*</span>
                    </label>
                    {loadingIndustries ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: '1px dashed #d1d5db', borderRadius: 10, padding: '12px 14px' }}>
                        <Loader2 className="animate-spin" style={{ width: 16, height: 16, color: HARX }} />
                        <span style={{ fontSize: 13, color: '#6b7280' }}>Loading...</span>
                      </div>
                    ) : (
                      <div style={{ position: 'relative' }}>
                        <select
                          value={company.industry || ''}
                          onChange={(e) => setCompany({ ...company, industry: e.target.value })}
                          style={{ width: '100%', appearance: 'none', border: '1px solid #d1d5db', borderRadius: 10, padding: '11px 40px 11px 14px', fontSize: 14, color: company.industry ? '#111827' : '#9ca3af', outline: 'none', cursor: 'pointer' }}
                        >
                          <option value="">Select industry...</option>
                          {industries.map(ind => <option key={ind._id} value={ind._id}>{ind.name}</option>)}
                        </select>
                        <ChevronDown style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#9ca3af', pointerEvents: 'none' }} />
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#1f2937', marginBottom: 8 }}>
                      <Briefcase style={{ width: 14, height: 14, color: HARX }} />
                      Your gig <span style={{ color: HARX }}>*</span>
                    </label>
                    <GigSelector
                      industryFilter={company.industry}
                      industryName={industries.find(ind => ind._id === company.industry)?.name || company.industry}
                      onGigSelect={handleGigSelect}
                      selectedGigId={selectedGig?._id}
                    />
                  </div>

                  {selectedGig && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#065f46', border: '1px solid #d1fae5' }}>
                      <CheckCircle style={{ width: 16, height: 16, color: '#059669', flexShrink: 0 }} />
                      <span style={{ fontWeight: 600 }}>{selectedGig.title}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <AlertCircle style={{ width: 28, height: 28, color: HARX, margin: '0 auto 8px' }} />
                  <p style={{ fontSize: 14, color: '#dc2626' }}>Failed to load company data</p>
                </div>
              )}
            </>
          )}

          {isStep2 && (
            <TrainingDetailsForm
              onComplete={handleTrainingDetailsComplete}
              onBack={() => setCurrentStep(1)}
              gigData={selectedGig}
            />
          )}

          {currentStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Users style={{ width: 20, height: 20, color: HARX }} />
                  Identify your learners
                </h3>
                <p style={{ fontSize: 13, color: '#6b7280', marginTop: 6 }}>Role-based paths · Skill assessments · Personalization</p>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1f2937', marginBottom: 10 }}>
                  Target roles & departments <span style={{ color: HARX }}>*</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                  {[
                    { role: 'Customer Success Representatives', dept: 'Customer Success', icon: '🎯' },
                    { role: 'Sales Representatives', dept: 'Sales', icon: '💼' },
                    { role: 'Support Agents', dept: 'Customer Support', icon: '🛟' },
                    { role: 'Account Managers', dept: 'Sales', icon: '🤝' },
                    { role: 'Product Specialists', dept: 'Product', icon: '⚙️' },
                    { role: 'New Hires', dept: 'All Departments', icon: '🌟' },
                    { role: 'Team Leaders', dept: 'Management', icon: '👥' },
                    { role: 'All Employees', dept: 'Company-wide', icon: '🏢' },
                  ].map(item => {
                    const checked = journey.targetRoles?.includes(item.role) || false;
                    return (
                      <label key={item.role} style={{ display: 'flex', alignItems: 'center', padding: 10, border: `1.5px solid ${checked ? HARX : '#e5e7eb'}`, borderRadius: 10, cursor: 'pointer', transition: 'all 150ms' }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const cur = journey.targetRoles || [];
                            setJourney({ ...journey, targetRoles: e.target.checked ? [...cur, item.role] : cur.filter(r => r !== item.role) });
                          }}
                          style={{ marginRight: 8, accentColor: HARX }}
                        />
                        <span style={{ fontSize: 14, marginRight: 6 }}>{item.icon}</span>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', lineHeight: 1.3 }}>{item.role}</div>
                          <div style={{ fontSize: 10, color: '#6b7280' }}>{item.dept}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <CheckCircle style={{ width: 22, height: 22, color: '#059669' }} />
                  Setup complete
                </h3>
                <p style={{ fontSize: 13, color: '#6b7280', marginTop: 6 }}>360° methodology applied. Upload and transform content next.</p>
              </div>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #f3f4f6' }}>
                  <h5 style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Building2 style={{ width: 14, height: 14, color: HARX }} /> Industry & gig
                  </h5>
                  <p style={{ fontSize: 14, color: '#374151', margin: 0, fontWeight: 500 }}>
                    {company.industry ? (industries.find(i => i._id === company.industry)?.name || company.industry) : 'N/A'}
                  </p>
                  <p style={{ fontSize: 13, color: '#6b7280', margin: '2px 0 0' }}>{selectedGig?.title || 'No gig selected'}</p>
                </div>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #f3f4f6' }}>
                  <h5 style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Target style={{ width: 14, height: 14, color: HARX }} /> Training program
                  </h5>
                  <p style={{ fontSize: 14, color: '#374151', margin: 0, fontWeight: 500 }}>{trainingDetails?.trainingName || selectedGig?.title || 'N/A'}</p>
                  <p style={{ fontSize: 13, color: '#6b7280', margin: '2px 0 0' }}>
                    {trainingDetails?.estimatedDuration ? (() => { const m = parseInt(trainingDetails.estimatedDuration); if (m >= 1440) return `${Math.round(m / 1440)} day(s)`; if (m >= 60) return `${Math.round(m / 60)} hour(s)`; return `${m} minute(s)`; })() : journey.estimatedDuration || 'N/A'}
                    {' · '}{journey.targetRoles?.length || 0} target roles
                  </p>
                </div>
                {selectedMethodology && (
                  <div style={{ padding: '14px 18px' }}>
                    <h5 style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Sparkles style={{ width: 14, height: 14, color: HARX }} /> Methodology
                    </h5>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      {selectedMethodology.components?.slice(0, showAllComponents ? undefined : 6).map((c: any, i: number) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#374151' }}>
                          <CheckCircle style={{ width: 14, height: 14, color: '#059669', flexShrink: 0 }} />
                          <span>{c.title}</span>
                        </div>
                      ))}
                    </div>
                    {selectedMethodology.components && selectedMethodology.components.length > 6 && (
                      <button type="button" onClick={() => setShowAllComponents(!showAllComponents)} style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: HARX, background: 'none', border: 'none', cursor: 'pointer' }}>
                        {showAllComponents ? 'Show less' : `+${selectedMethodology.components.length - 6} more`}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Footer ── */}
      {!isStep2 && (
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 32px' }}>
          <button
            type="button"
            onClick={() => { if (currentStep === 5) setCurrentStep(4); else if (currentStep > 1) setCurrentStep(currentStep - 1); }}
            disabled={currentStep === 1}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700,
              border: currentStep === 1 ? 'none' : '1px solid #d1d5db',
              background: 'transparent', color: currentStep === 1 ? '#d1d5db' : '#374151',
              cursor: currentStep === 1 ? 'not-allowed' : 'pointer',
            }}
          >
            <ArrowLeft style={{ width: 16, height: 16 }} />
            Back
          </button>

          <span style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af' }}>Step {stepNum} of {steps.length}</span>

          <button
            type="button"
            onClick={handleNext}
            disabled={!isStepValid()}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700,
              border: 'none', color: '#fff', cursor: isStepValid() ? 'pointer' : 'not-allowed',
              background: isStepValid() ? HARX_GRADIENT : '#d1d5db',
              boxShadow: isStepValid() ? '0 2px 8px rgba(255,77,77,0.25)' : 'none',
            }}
          >
            {currentStep === 5 ? 'Start building' : 'Continue'}
            <ArrowRight style={{ width: 16, height: 16 }} />
          </button>
        </div>
      )}
    </div>
  );
}
