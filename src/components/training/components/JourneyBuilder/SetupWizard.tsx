import React, { useState, useEffect, useRef, useCallback, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { Building2, Loader2, Target, Users, Sparkles, Briefcase, AlertCircle, CheckCircle, ArrowRight, ArrowLeft, ChevronDown, Check, Search, ImagePlus } from 'lucide-react';
import axios from 'axios';
import { Company, TrainingJourney } from '../../types/core';
import { Industry, GigFromApi } from '../../types';
import { TrainingMethodology, MethodologyComponent } from '../../types/methodology';
import MethodologySelector from './MethodologySelector';
import MethodologyBuilder from '../Methodology/MethodologyBuilder';
import { OnboardingService } from '../../infrastructure/services/OnboardingService';
import GigSelector from '../Dashboard/GigSelector';
import TrainingDetailsForm, { VISION_DURATIONS } from './TrainingDetailsForm';
import { scrollJourneyMainToTop } from './journeyScroll';
import { cloudinaryService } from '../../lib/cloudinaryService';

interface SetupWizardProps {
  onComplete: (company: Company, journey: TrainingJourney, methodology?: TrainingMethodology, gigId?: string) => void;
  /** Embedded in REP Onboarding: less top padding, content top-aligned (no vertical centering gap). */
  repOnboardingLayout?: boolean;
}

export default function SetupWizard({ onComplete, repOnboardingLayout = false }: SetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [company, setCompany] = useState<Partial<Company>>({});
  const [companyData, setCompanyData] = useState<any>(null);
  const [journey, setJourney] = useState<Partial<TrainingJourney>>({});
  const [selectedMethodology, setSelectedMethodology] = useState<TrainingMethodology | null>(null);
  const [showMethodologyBuilder, setShowMethodologyBuilder] = useState(false);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [loadingIndustries, setLoadingIndustries] = useState(true);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [selectedGig, setSelectedGig] = useState<GigFromApi | null>(null);
  const [trainingDetails, setTrainingDetails] = useState<{ trainingName: string; trainingDescription: string; estimatedDuration: string } | null>(null);
  const [visionSubStep, setVisionSubStep] = useState(0);
  const [visionName, setVisionName] = useState('');
  const [visionDesc, setVisionDesc] = useState('');
  const [visionDuration, setVisionDuration] = useState('');
  const prevWizardStepRef = useRef(currentStep);
  const [industryOpen, setIndustryOpen] = useState(false);
  const [industrySearch, setIndustrySearch] = useState('');
  const industryBtnRef = useRef<HTMLButtonElement>(null);
  const industryMenuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 });
  const [setupSummaryModulesExpanded, setSetupSummaryModulesExpanded] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [thumbnailGenerating, setThumbnailGenerating] = useState(false);
  const [thumbnailPrompt, setThumbnailPrompt] = useState('');
  const [visionTitleGenerating, setVisionTitleGenerating] = useState(false);
  const [visionDescriptionGenerating, setVisionDescriptionGenerating] = useState(false);
  const [targetRolesGenerating, setTargetRolesGenerating] = useState(false);
  const autoRolesSuggestionKeyRef = useRef('');

  useEffect(() => {
    if (currentStep !== 5) setSetupSummaryModulesExpanded(false);
  }, [currentStep]);

  const updateMenuPos = useCallback(() => {
    if (industryBtnRef.current) {
      const r = industryBtnRef.current.getBoundingClientRect();
      setMenuPos({ top: r.bottom + 4, left: r.left, width: r.width });
    }
  }, []);

  useEffect(() => {
    if (industryOpen) {
      updateMenuPos();
      window.addEventListener('scroll', updateMenuPos, true);
      window.addEventListener('resize', updateMenuPos);
      return () => { window.removeEventListener('scroll', updateMenuPos, true); window.removeEventListener('resize', updateMenuPos); };
    }
  }, [industryOpen, updateMenuPos]);

  useEffect(() => {
    if (!industryOpen) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (industryBtnRef.current?.contains(t) || industryMenuRef.current?.contains(t)) return;
      setIndustryOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [industryOpen]);

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
    scrollJourneyMainToTop();
  }, [currentStep]);

  useEffect(() => {
    const prev = prevWizardStepRef.current;
    if (currentStep === 3 && prev === 2) {
      setVisionSubStep(0);
      setVisionName('');
      setVisionDesc('');
      setVisionDuration('');
    } else if (currentStep === 3 && prev === 4 && trainingDetails) {
      setVisionSubStep(1);
      setVisionName(trainingDetails.trainingName);
      setVisionDesc(trainingDetails.trainingDescription);
      const ed = trainingDetails.estimatedDuration;
      setVisionDuration(VISION_DURATIONS.some((d) => d.value === ed) ? ed : '');
    }
    prevWizardStepRef.current = currentStep;
  }, [currentStep, trainingDetails]);

  useEffect(() => {
    if (currentStep !== 3) return;
    scrollJourneyMainToTop();
  }, [currentStep, visionSubStep]);

  const steps = [
    { id: 1, label: 'Gig' },
    { id: 2, label: 'Thumbnail' },
    { id: 3, label: 'Vision' },
    { id: 4, label: 'Team' },
    { id: 5, label: 'Methodology' },
  ];

  const handleNext = () => {
    if (currentStep === 6) {
      const realCompanyId = OnboardingService.getCompanyId();
      if (!realCompanyId) { alert('Internal Error: Company ID not found.'); return; }
      const completeCompany: Company = { id: realCompanyId, name: companyData?.name || companyData?.data?.name || company.name || '', industry: company.industry || '', size: company.size || 'medium', setupComplete: true };
      const completeJourney: TrainingJourney = {
        id: Date.now().toString(), companyId: completeCompany.id,
        title: trainingDetails?.trainingName || selectedGig?.title || 'New Training Journey',
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
        trainingLogo: thumbnailUrl
          ? {
              type: 'image',
              value: thumbnailUrl
            }
          : undefined,
      };
      onComplete(completeCompany, completeJourney, selectedMethodology || undefined, selectedGig?._id);
    } else if (currentStep === 5) {
      setCurrentStep(6);
    } else if (currentStep === 4 && selectedMethodology) {
      setCurrentStep(5);
    } else if (currentStep === 3) {
      setCurrentStep(4);
    } else if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleGigSelect = (gig: GigFromApi) => { setSelectedGig(gig); };

  const visionContinueDisabled =
    visionSubStep === 0 ? !visionName.trim() : !visionDuration;
  const visionContinueLabel = visionSubStep === 1 ? 'Continue' : 'Next';

  const handleVisionFooterBack = () => {
    if (visionSubStep > 0) setVisionSubStep(visionSubStep - 1);
    else setCurrentStep(2);
  };

  const handleVisionFooterContinue = () => {
    if (visionSubStep === 0) {
      if (visionName.trim()) setVisionSubStep(1);
    } else if (visionDuration) {
      const cleanVisionName = String(visionName || '').trim();
      const cleanVisionDesc = String(visionDesc || '').trim();
      setTrainingDetails({
        trainingName: cleanVisionName,
        trainingDescription: cleanVisionDesc,
        estimatedDuration: visionDuration,
      });
      setJourney((prev) => ({
        ...prev,
        title: cleanVisionName || prev.title || prev.name,
        name: cleanVisionName || prev.name || prev.title,
        description: cleanVisionDesc || prev.description || '',
        estimatedDuration: visionDuration || prev.estimatedDuration,
      }));
      setCurrentStep(4);
    }
  };

  const handleMethodologySelect = (m: TrainingMethodology) => { setSelectedMethodology(m); setCurrentStep(6); };
  const handleMethodologyApply = (m: TrainingMethodology) => { setSelectedMethodology(m); setShowMethodologyBuilder(false); setCurrentStep(6); };
  const handleCustomMethodology = () => { setCurrentStep(6); };

  const handleThumbnailUpload = async (file: File) => {
    try {
      setThumbnailUploading(true);
      const uploaded = await cloudinaryService.uploadImage(file, 'trainings/thumbnails');
      setThumbnailUrl(uploaded.secureUrl || uploaded.url);
    } catch (error: any) {
      console.error('[SetupWizard] Failed thumbnail upload:', error);
      alert(error?.message || 'Could not upload thumbnail.');
    } finally {
      setThumbnailUploading(false);
    }
  };

  const getTrainingBackendUrl = (): string => {
    if (import.meta.env.VITE_API_TRAINING_URL) return import.meta.env.VITE_API_TRAINING_URL;
    if (import.meta.env.VITE_TRAINING_BACKEND_URL) return import.meta.env.VITE_TRAINING_BACKEND_URL;
    if (typeof window !== 'undefined') {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      return isLocal ? 'http://localhost:5010' : 'https://v25platformtrainingbackend-production.up.railway.app';
    }
    return 'http://localhost:5010';
  };

  const handleGenerateThumbnailWithAI = async () => {
    try {
      setThumbnailGenerating(true);
      const trainingBackendUrl = getTrainingBackendUrl();
      const baseUrl = trainingBackendUrl.endsWith('/api') ? trainingBackendUrl : `${trainingBackendUrl}/api`;
      const response = await axios.post(`${baseUrl}/training_journeys/generate-thumbnail`, {
        prompt: thumbnailPrompt.trim(),
        gigTitle: selectedGig?.title || trainingDetails?.trainingName || '',
        industry: industries.find(i => i._id === company.industry)?.name || String(company.industry || '')
      });
      const url = String((response?.data as any)?.url || '').trim();
      if (!url) throw new Error('No image URL returned');
      setThumbnailUrl(url);
    } catch (error: any) {
      console.error('[SetupWizard] Failed AI thumbnail generation:', error);
      const backendMessage =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message;
      alert(backendMessage || 'Could not generate thumbnail with AI.');
    } finally {
      setThumbnailGenerating(false);
    }
  };

  const handleSuggestVision = async (target: 'title' | 'description') => {
    if (!selectedGig) {
      alert('Please select a gig first.');
      return;
    }
    const isTitle = target === 'title';
    try {
      if (isTitle) setVisionTitleGenerating(true);
      else setVisionDescriptionGenerating(true);

      const trainingBackendUrl = getTrainingBackendUrl();
      const baseUrl = trainingBackendUrl.endsWith('/api') ? trainingBackendUrl : `${trainingBackendUrl}/api`;
      const response = await axios.post(`${baseUrl}/training_journeys/suggest-vision`, {
        target,
        currentTitle: visionName,
        currentDescription: visionDesc,
        industry: industries.find(i => i._id === company.industry)?.name || String(company.industry || ''),
        gig: selectedGig
      });
      const data = (response?.data as any)?.data || {};
      if (isTitle) {
        const suggestedTitle = String(data.title || '').trim();
        if (suggestedTitle) setVisionName(suggestedTitle);
      } else {
        const suggestedDescription = String(data.description || '').trim();
        if (suggestedDescription) setVisionDesc(suggestedDescription);
      }
    } catch (error: any) {
      const backendMessage =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message;
      alert(backendMessage || 'Could not generate vision suggestion.');
    } finally {
      if (isTitle) setVisionTitleGenerating(false);
      else setVisionDescriptionGenerating(false);
    }
  };

  const roleOptions = [
    { role: 'Customer Success Representatives', dept: 'Customer Success', icon: '🎯' },
    { role: 'Sales Representatives', dept: 'Sales', icon: '💼' },
    { role: 'Support Agents', dept: 'Customer Support', icon: '🛟' },
    { role: 'Account Managers', dept: 'Sales', icon: '🤝' },
    { role: 'Product Specialists', dept: 'Product', icon: '⚙️' },
    { role: 'New Hires', dept: 'All Departments', icon: '🌟' },
    { role: 'Team Leaders', dept: 'Management', icon: '👥' },
    { role: 'All Employees', dept: 'Company-wide', icon: '🏢' }
  ];

  const handleSuggestTargetRoles = async (showAlert: boolean = true) => {
    if (!selectedGig) {
      if (showAlert) alert('Please select a gig first.');
      return;
    }
    try {
      setTargetRolesGenerating(true);
      const trainingBackendUrl = getTrainingBackendUrl();
      const baseUrl = trainingBackendUrl.endsWith('/api') ? trainingBackendUrl : `${trainingBackendUrl}/api`;
      const response = await axios.post(`${baseUrl}/training_journeys/suggest-target-roles`, {
        gig: selectedGig,
        industry: industries.find(i => i._id === company.industry)?.name || String(company.industry || ''),
        allowedRoles: roleOptions.map(r => r.role)
      });
      const roles = ((response?.data as any)?.data?.roles || []) as string[];
      if (!roles.length) throw new Error('No role suggestions returned');
      setJourney(prev => ({ ...prev, targetRoles: roles }));
    } catch (error: any) {
      const backendMessage =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message;
      if (showAlert) alert(backendMessage || 'Could not generate target roles.');
    } finally {
      setTargetRolesGenerating(false);
    }
  };

  useEffect(() => {
    if (currentStep !== 4 || !selectedGig) return;
    const alreadyHasRoles = (journey.targetRoles?.length || 0) > 0;
    const key = `${selectedGig._id || selectedGig.title || 'gig'}::${String(company.industry || '')}`;
    if (autoRolesSuggestionKeyRef.current === key) return;
    if (alreadyHasRoles) {
      autoRolesSuggestionKeyRef.current = key;
      return;
    }
    autoRolesSuggestionKeyRef.current = key;
    void handleSuggestTargetRoles(false);
  }, [currentStep, selectedGig?._id, selectedGig?.title, company.industry, journey.targetRoles]);

  if (showMethodologyBuilder) {
    return <MethodologyBuilder onApplyMethodology={handleMethodologyApply} selectedIndustry={company.industry} />;
  }

  const isStepValid = () => {
    switch (currentStep) {
      case 1: return !!companyData && selectedGig !== null;
      case 2: return !!thumbnailUrl && !thumbnailUploading;
      case 3: return trainingDetails !== null;
      case 4: return journey.targetRoles && journey.targetRoles.length > 0;
      case 5: return selectedMethodology !== null;
      case 6: return true;
      default: return true;
    }
  };

  const stepNum = currentStep > 5 ? 5 : currentStep;
  const isVisionStep = currentStep === 3;
  const isStep4 = currentStep === 5;
  const isStep5 = currentStep === 2;
  const isStep6 = currentStep === 6;

  const formatVisionDuration = (raw: string | undefined) => {
    if (!raw) return null;
    const m = parseInt(raw, 10);
    if (Number.isNaN(m)) return raw;
    if (m >= 1440) return `${Math.round(m / 1440)} day(s)`;
    if (m >= 60) return `${Math.round(m / 60)} hour(s)`;
    return `${m} minute(s)`;
  };

  const HARX = '#dc2626';
  const HARX_GRADIENT = 'linear-gradient(135deg, #b91c1c 0%, #dc2626 100%)';
  const WIZARD_BG = 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)';
  const WIZARD_CARD_BG = 'rgba(255,255,255,0.96)';
  const WIZARD_CARD_BORDER = '1px solid rgba(15, 23, 42, 0.08)';
  const WIZARD_CARD_SHADOW = '0 8px 24px rgba(15, 23, 42, 0.08)';
  const STEP_ACTIVE_RING = '0 0 0 3px rgba(15, 23, 42, 0.08)';
  const embedCompact = repOnboardingLayout;
  const stepperPadding = embedCompact ? '2px 24px 4px' : '8px 24px';
  const bodyPadding = embedCompact
    ? currentStep === 1
      ? '4px 20px 8px'
      : isVisionStep
        ? '4px 20px 8px'
        : isStep4
          ? '4px 20px 8px'
          : isStep5
            ? '2px 14px 4px'
            : '8px 20px 10px'
    : currentStep === 1
      ? '12px 28px 8px'
      : isVisionStep
        ? '12px 28px 8px'
        : isStep4
          ? '12px 28px 8px'
          : isStep5
            ? '8px 24px 6px'
            : '16px 28px';

  const isThumbnailStep = currentStep === 2;
  const setupContentMaxWidth = isStep4 ? 1120 : embedCompact && isThumbnailStep ? 380 : 500;
  const thumbDropSize = embedCompact && isThumbnailStep ? 160 : 260;
  const thumbOuterPadding = embedCompact && isThumbnailStep ? '10px 10px 8px' : '20px 16px 18px';
  const thumbSectionGap = embedCompact && isThumbnailStep ? 8 : 18;
  const thumbAiBlockMarginTop = embedCompact && isThumbnailStep ? 10 : 18;
  const thumbTextareaRows = embedCompact && isThumbnailStep ? 2 : 4;
  const thumbTextareaMinH = embedCompact && isThumbnailStep ? 64 : 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%', width: '100%', background: WIZARD_BG, borderRadius: 18 }}>
      <style>{`
        @keyframes wizardFadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── Stepper ── */}
      <div style={{ flexShrink: 0, padding: stepperPadding }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#ffffff', border: '1px solid rgba(15, 23, 42, 0.08)', borderRadius: 9999, padding: '8px 12px', backdropFilter: 'blur(8px)' }}>
          {steps.map((step, i) => {
            const done = currentStep > step.id;
            const active = currentStep === step.id || (currentStep === 6 && step.id === 5);
            return (
              <Fragment key={step.id}>
                <button
                  type="button"
                  onClick={() => { if (done) setCurrentStep(step.id); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '4px 10px', borderRadius: 9999, border: 'none',
                    fontSize: 11, fontWeight: 600, cursor: done ? 'pointer' : 'default',
                    background: active ? 'rgba(15, 23, 42, 0.05)' : 'transparent',
                    color: done ? '#059669' : active ? HARX : '#9ca3af',
                    transition: 'all 150ms',
                  }}
                >
                  <span style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 22, height: 22, borderRadius: '50%', fontSize: 10, fontWeight: 800,
                    background: done ? '#059669' : active ? HARX : '#d1d5db',
                    color: '#fff',
                    boxShadow: active ? STEP_ACTIVE_RING : 'none'
                  }}>
                    {done ? <Check style={{ width: 11, height: 11 }} /> : step.id}
                  </span>
                  <span style={{ fontWeight: 700 }}>{step.label}</span>
                </button>
                {i < steps.length - 1 && (
                  <div style={{ width: 22, height: 2, borderRadius: 1, background: done ? '#0f766e' : '#e5e7eb' }} />
                )}
              </Fragment>
            );
          })}
        </div>
      </div>

      {/* Body + footer column: footer stays at bottom of card; only the area above scrolls */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', width: '100%' }}>
        <div style={{
          flex: 1, minHeight: 0,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: embedCompact ? 'flex-start' : 'center',
          padding: bodyPadding,
          width: '100%',
        }}>
        <div style={{
          maxWidth: setupContentMaxWidth,
          margin: '0 auto',
          width: '100%',
          borderRadius: 18,
          border: WIZARD_CARD_BORDER,
          background: WIZARD_CARD_BG,
          boxShadow: WIZARD_CARD_SHADOW,
          padding: embedCompact ? '12px 14px' : '18px 20px',
          animation: 'wizardFadeUp 260ms ease-out',
        }}>

          {currentStep === 1 && (
            <>
              <div style={{ textAlign: 'center', marginBottom: embedCompact ? 10 : 18 }}>
                <h3 style={{ fontSize: 20, fontWeight: 900, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
                  Welcome to your training journey
                </h3>
                <p style={{ fontSize: 12, color: '#64748b', marginTop: embedCompact ? 3 : 6, fontWeight: 600 }}>
                  Smart defaults · Compliance
                </p>
              </div>

              {loadingCompany ? (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <Loader2 className="animate-spin" style={{ width: 24, height: 24, color: HARX, margin: '0 auto 10px' }} />
                  <p style={{ fontSize: 13, color: '#6b7280' }}>Loading company information...</p>
                </div>
              ) : companyData ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'none' }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1f2937', marginBottom: 6 }}>
                      Training industry <span style={{ color: HARX }}>*</span>
                    </label>
                    {loadingIndustries ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: '1px dashed #d1d5db', borderRadius: 10, padding: '12px 14px' }}>
                        <Loader2 className="animate-spin" style={{ width: 16, height: 16, color: HARX }} />
                        <span style={{ fontSize: 13, color: '#6b7280' }}>Loading...</span>
                      </div>
                    ) : (
                      <div>
                        <button
                          ref={industryBtnRef}
                          type="button"
                          onClick={() => { setIndustryOpen(!industryOpen); setIndustrySearch(''); }}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            border: industryOpen ? `1.5px solid ${HARX}` : '1px solid #d1d5db',
                            borderRadius: 8, padding: '9px 12px', fontSize: 13, background: '#fff',
                            color: company.industry ? '#111827' : '#9ca3af', cursor: 'pointer',
                            boxShadow: industryOpen ? `0 0 0 3px rgba(255,77,77,0.08)` : 'none',
                            transition: 'all 150ms',
                          }}
                        >
                          <span>{company.industry ? (industries.find(i => i._id === company.industry)?.name || 'Select industry...') : 'Select industry...'}</span>
                          <ChevronDown style={{ width: 16, height: 16, color: '#9ca3af', transition: 'transform 200ms', transform: industryOpen ? 'rotate(180deg)' : 'none' }} />
                        </button>
                        {industryOpen && createPortal(
                          <div
                            ref={industryMenuRef}
                            style={{
                              position: 'fixed', top: menuPos.top, left: menuPos.left, width: menuPos.width, zIndex: 99999,
                              background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
                              boxShadow: '0 8px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
                              overflow: 'hidden',
                            }}
                          >
                            <div style={{ padding: '8px 10px', borderBottom: '1px solid #f3f4f6' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f9fafb', borderRadius: 8, padding: '7px 10px' }}>
                                <Search style={{ width: 14, height: 14, color: '#9ca3af', flexShrink: 0 }} />
                                <input
                                  autoFocus
                                  value={industrySearch}
                                  onChange={(e) => setIndustrySearch(e.target.value)}
                                  placeholder="Search industries..."
                                  style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: '#111827', width: '100%' }}
                                />
                              </div>
                            </div>
                            <div style={{ maxHeight: 240, overflowY: 'auto', padding: '4px 0' }}>
                              {industries.filter(ind => ind.name.toLowerCase().includes(industrySearch.toLowerCase())).map(ind => {
                                const sel = company.industry === ind._id;
                                return (
                                  <button
                                    key={ind._id}
                                    type="button"
                                    onClick={() => { setCompany({ ...company, industry: ind._id }); setIndustryOpen(false); }}
                                    style={{
                                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                      padding: '9px 14px', border: 'none', background: sel ? '#fff5f5' : 'transparent',
                                      fontSize: 13, color: sel ? HARX : '#374151', fontWeight: sel ? 600 : 400,
                                      cursor: 'pointer', transition: 'background 100ms',
                                    }}
                                    onMouseEnter={(e) => { if (!sel) (e.currentTarget.style.background = '#f9fafb'); }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = sel ? '#fff5f5' : 'transparent'; }}
                                  >
                                    <span>{ind.name}</span>
                                    {sel && <Check style={{ width: 14, height: 14, color: HARX }} />}
                                  </button>
                                );
                              })}
                              {industries.filter(ind => ind.name.toLowerCase().includes(industrySearch.toLowerCase())).length === 0 && (
                                <div style={{ padding: '14px', textAlign: 'center', fontSize: 13, color: '#9ca3af' }}>No results</div>
                              )}
                            </div>
                          </div>,
                          document.body
                        )}
                      </div>
                    )}
                  </div>

                  <div style={{ border: '1px solid rgba(15,23,42,0.08)', borderRadius: 12, padding: embedCompact ? '10px' : '12px', background: 'linear-gradient(180deg, #ffffff 0%, #fafbff 100%)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#1f2937', marginBottom: 6 }}>
                      <Briefcase style={{ width: 13, height: 13, color: HARX }} />
                      Your gig <span style={{ color: HARX }}>*</span>
                    </label>
                    <GigSelector
                      industryFilter=""
                      industryName=""
                      onGigSelect={handleGigSelect}
                      selectedGigId={selectedGig?._id}
                    />
                  </div>

                  {selectedGig && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 10, padding: '10px 12px', fontSize: 12, color: '#065f46', border: '1px solid #a7f3d0', background: '#ecfdf5' }}>
                      <CheckCircle style={{ width: 14, height: 14, color: '#059669', flexShrink: 0 }} />
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

          {isVisionStep && (
            <TrainingDetailsForm
              subStep={visionSubStep}
              trainingName={visionName}
              trainingDescription={visionDesc}
              estimatedDuration={visionDuration}
              onTrainingNameChange={setVisionName}
              onTrainingDescriptionChange={setVisionDesc}
              onEstimatedDurationChange={setVisionDuration}
              gigData={selectedGig}
              onSuggestTitle={() => void handleSuggestVision('title')}
              onSuggestDescription={() => void handleSuggestVision('description')}
              generatingTitle={visionTitleGenerating}
              generatingDescription={visionDescriptionGenerating}
            />
          )}

          {currentStep === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ fontSize: 20, fontWeight: 900, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Users style={{ width: 20, height: 20, color: HARX }} />
                  Identify your learners
                </h3>
                <p style={{ fontSize: 13, color: '#64748b', marginTop: 6, fontWeight: 600 }}>Role-based paths · Skill assessments · Personalization</p>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1f2937' }}>
                    Target roles & departments <span style={{ color: HARX }}>*</span>
                  </label>
                  {targetRolesGenerating ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: HARX }}>
                      <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" />
                      AI selecting roles...
                    </span>
                  ) : null}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                  {roleOptions.map(item => {
                    const checked = journey.targetRoles?.includes(item.role) || false;
                    return (
                      <label key={item.role} style={{ display: 'flex', alignItems: 'center', padding: 10, border: `1.5px solid ${checked ? HARX : '#e5e7eb'}`, borderRadius: 12, cursor: 'pointer', transition: 'all 150ms', background: checked ? '#fef2f2' : '#ffffff', boxShadow: checked ? '0 4px 12px rgba(185,28,28,0.10)' : 'none' }}>
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

          {isStep4 && (
            <MethodologySelector
              onMethodologySelect={handleMethodologySelect}
              onCustomMethodology={handleCustomMethodology}
              onBack={() => setCurrentStep(3)}
              hideBackButton
            />
          )}

          {isStep5 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: thumbSectionGap, width: '100%' }}>
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ fontSize: embedCompact ? 18 : 20, fontWeight: 900, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
                  Upload training thumbnail
                </h3>
                <p style={{ fontSize: embedCompact ? 12 : 13, color: '#64748b', marginTop: embedCompact ? 3 : 6, lineHeight: 1.45, fontWeight: 600 }}>
                  Add a cover image for your training card, or describe one for AI.
                </p>
              </div>

              <div
                style={{
                  width: '100%',
                  maxWidth: embedCompact && isThumbnailStep ? 360 : undefined,
                  margin: embedCompact && isThumbnailStep ? '0 auto' : undefined,
                  border: '1px dashed #cbd5e1',
                  borderRadius: embedCompact ? 12 : 16,
                  padding: thumbOuterPadding,
                  background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
                }}
              >
                <input
                  id="training-thumbnail-input"
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleThumbnailUpload(file);
                    e.currentTarget.value = '';
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                  <label
                    htmlFor="training-thumbnail-input"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const file = e.dataTransfer.files?.[0];
                      if (file) void handleThumbnailUpload(file);
                    }}
                    className={`transition-all duration-200 focus-within:ring-2 focus-within:ring-rose-200 focus-within:ring-offset-2 ${thumbnailUploading ? 'cursor-not-allowed' : 'cursor-pointer hover:border-rose-300 hover:shadow-md'}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: thumbDropSize,
                      height: thumbDropSize,
                      maxWidth: '100%',
                      aspectRatio: '1',
                      border: '2px dashed #e2e8f0',
                      borderRadius: embedCompact ? 12 : 14,
                      background: '#ffffff',
                      overflow: 'hidden',
                      boxSizing: 'border-box',
                      boxShadow: thumbnailUrl ? '0 12px 28px rgba(17,24,39,0.12)' : 'none'
                    }}
                  >
                    {thumbnailUrl ? (
                      <img
                        src={thumbnailUrl}
                        alt="Training thumbnail"
                        onError={(e) => {
                          console.error('[SetupWizard] Thumbnail failed to render from URL:', thumbnailUrl);
                          const img = e.currentTarget as HTMLImageElement;
                          img.style.display = 'none';
                        }}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{ textAlign: 'center', padding: embedCompact ? '0 10px' : '0 18px' }}>
                        {thumbnailUploading ? (
                          <Loader2 className="animate-spin" style={{ width: embedCompact ? 18 : 22, height: embedCompact ? 18 : 22, color: HARX, margin: embedCompact ? '0 auto 6px' : '0 auto 10px' }} />
                        ) : (
                          <ImagePlus style={{ width: embedCompact ? 22 : 28, height: embedCompact ? 22 : 28, color: '#94a3b8', margin: embedCompact ? '0 auto 6px' : '0 auto 10px' }} strokeWidth={1.5} />
                        )}
                        <div style={{ fontSize: embedCompact ? 12 : 13, fontWeight: 700, color: '#0f172a' }}>
                          {thumbnailUploading ? 'Uploading…' : 'Import or drop image'}
                        </div>
                        <div style={{ fontSize: embedCompact ? 11 : 12, color: '#64748b', marginTop: embedCompact ? 4 : 6, lineHeight: 1.35 }}>
                          PNG, JPG, WEBP
                        </div>
                      </div>
                    )}
                  </label>
                </div>

                <div style={{ marginTop: thumbAiBlockMarginTop, width: '100%', display: 'flex', flexDirection: 'column', gap: embedCompact ? 6 : 10 }}>
                  <label htmlFor="thumbnail-ai-prompt" style={{ fontSize: embedCompact ? 11 : 12, fontWeight: 700, color: '#475569' }}>
                    Describe an AI thumbnail <span style={{ fontWeight: 500, color: '#94a3b8' }}>(optional)</span>
                  </label>
                  <textarea
                    id="thumbnail-ai-prompt"
                    value={thumbnailPrompt}
                    onChange={(e) => setThumbnailPrompt(e.target.value)}
                    placeholder="E.g. modern dashboard mockup, soft gradients, professional training cover…"
                    rows={thumbTextareaRows}
                    style={{
                      width: '100%',
                      minHeight: thumbTextareaMinH,
                      resize: 'vertical',
                      border: '1px solid #e2e8f0',
                      borderRadius: 10,
                      padding: embedCompact ? '8px 10px' : '12px 14px',
                      fontSize: embedCompact ? 12 : 13,
                      lineHeight: 1.5,
                      color: '#1e293b',
                      outline: 'none',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                  />
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: 8,
                      width: '100%',
                    }}
                  >
                    {thumbnailUrl ? (
                      <button
                        type="button"
                        onClick={() => setThumbnailUrl('')}
                        style={{
                          padding: '10px 14px',
                          borderRadius: 10,
                          border: '1px solid #e2e8f0',
                          background: '#fff',
                          color: '#64748b',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Remove image
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void handleGenerateThumbnailWithAI()}
                      disabled={thumbnailGenerating}
                      style={{
                        padding: '10px 18px',
                        borderRadius: 10,
                        border: `1px solid ${HARX}`,
                        background: '#fff',
                        color: HARX,
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: thumbnailGenerating ? 'not-allowed' : 'pointer',
                        opacity: thumbnailGenerating ? 0.65 : 1,
                        boxShadow: thumbnailGenerating ? 'none' : '0 1px 2px rgba(15, 23, 42, 0.06)',
                      }}
                    >
                      {thumbnailGenerating ? 'Generating…' : 'Generate with AI'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isStep6 && (
            <div
              style={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                overflow: 'hidden',
                width: '100%',
              }}
            >
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <h3
                  style={{
                    fontSize: 18,
                    fontWeight: 900,
                    color: '#111827',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <CheckCircle style={{ width: 18, height: 18, color: '#059669' }} />
                  Setup complete
                </h3>
                <p style={{ fontSize: 11, color: '#6b7280', marginTop: 3, lineHeight: 1.35 }}>
                  360° methodology applied. Upload and transform content next.
                </p>
              </div>

              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  border: '1px solid rgba(255, 77, 77, 0.22)',
                  borderRadius: 12,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  background: 'linear-gradient(180deg, #fffafa 0%, #ffffff 48px)',
                  boxShadow: '0 2px 12px rgba(255, 77, 77, 0.08)',
                }}
              >
                <div style={{ padding: '8px 12px', borderBottom: '1px solid #fce8e8', flexShrink: 0 }}>
                  <h5
                    style={{
                      fontSize: 9,
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: HARX,
                      marginBottom: 4,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    <Building2 style={{ width: 12, height: 12, color: HARX }} />
                    Gig
                  </h5>
                  <p style={{ fontSize: 13, color: '#111827', margin: 0, fontWeight: 600, lineHeight: 1.25 }}>
                    {selectedGig?.title || 'No gig selected'}
                  </p>
                </div>

                <div style={{ padding: '8px 12px', borderBottom: '1px solid #fce8e8', flexShrink: 0 }}>
                  <h5
                    style={{
                      fontSize: 9,
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: HARX,
                      marginBottom: 4,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    <Target style={{ width: 12, height: 12, color: HARX }} />
                    Training program
                  </h5>
                  <p style={{ fontSize: 13, color: '#111827', margin: 0, fontWeight: 600, lineHeight: 1.25 }}>
                    {trainingDetails?.trainingName || selectedGig?.title || 'N/A'}
                  </p>
                  {trainingDetails?.trainingDescription?.trim() ? (
                    <p
                      style={{
                        fontSize: 10,
                        color: '#6b7280',
                        margin: '4px 0 0',
                        lineHeight: 1.35,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {trainingDetails.trainingDescription.trim()}
                    </p>
                  ) : null}
                  <p style={{ fontSize: 10, color: '#9ca3af', margin: '4px 0 0', fontWeight: 600 }}>
                    {formatVisionDuration(trainingDetails?.estimatedDuration) || journey.estimatedDuration || 'N/A'}
                    {' · '}
                    {journey.targetRoles?.length || 0} target roles
                  </p>
                </div>

                {selectedMethodology ? (
                  <div
                    style={{
                      padding: '8px 12px',
                      flex: 1,
                      minHeight: 0,
                      overflowY: setupSummaryModulesExpanded ? 'auto' : 'hidden',
                      overflowX: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <h5
                      style={{
                        fontSize: 9,
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: HARX,
                        marginBottom: 6,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        flexShrink: 0,
                      }}
                    >
                      <Sparkles style={{ width: 12, height: 12, color: HARX }} />
                      Methodology
                    </h5>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, alignContent: 'start', flexShrink: 0 }}>
                      {(setupSummaryModulesExpanded
                        ? selectedMethodology.components
                        : selectedMethodology.components?.slice(0, 4) || []
                      ).map((c: MethodologyComponent, i: number) => (
                        <div key={c.id || i} style={{ display: 'flex', alignItems: 'flex-start', gap: 4, minWidth: 0 }}>
                          <CheckCircle style={{ width: 11, height: 11, color: '#059669', flexShrink: 0, marginTop: 2 }} />
                          <span
                            style={{
                              fontSize: 10,
                              color: '#374151',
                              lineHeight: 1.3,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: setupSummaryModulesExpanded ? 3 : 2,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {c.title}
                          </span>
                        </div>
                      ))}
                    </div>
                    {selectedMethodology.components && selectedMethodology.components.length > 4 ? (
                      <button
                        type="button"
                        onClick={() => setSetupSummaryModulesExpanded(!setupSummaryModulesExpanded)}
                        style={{
                          margin: '8px 0 0',
                          fontSize: 10,
                          fontWeight: 700,
                          color: HARX,
                          flexShrink: 0,
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          textAlign: 'left',
                          textDecoration: 'underline',
                          textUnderlineOffset: 2,
                        }}
                      >
                        {setupSummaryModulesExpanded
                          ? 'Show less'
                          : `+${selectedMethodology.components.length - 4} more modules`}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Footer (always bottom of wizard — same bar for all steps) ── */}
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: embedCompact ? '8px 20px' : '10px 28px',
          borderTop: '1px solid rgba(15,23,42,0.08)',
          background: '#ffffff',
          backdropFilter: 'blur(10px)',
        }}
      >
        {isVisionStep ? (
          <>
            <button
              type="button"
              onClick={handleVisionFooterBack}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                border: '1px solid #d1d5db', background: '#fff', color: '#374151',
                cursor: 'pointer',
              }}
            >
              <ArrowLeft style={{ width: 14, height: 14 }} />
              Back
            </button>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af' }}>Vision {visionSubStep + 1}/2 · Step 3 of 5</span>
            <button
              type="button"
              onClick={handleVisionFooterContinue}
              disabled={visionContinueDisabled}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 800,
                border: 'none', color: '#fff', cursor: visionContinueDisabled ? 'not-allowed' : 'pointer',
                background: visionContinueDisabled ? '#d1d5db' : HARX_GRADIENT,
                boxShadow: visionContinueDisabled ? 'none' : '0 6px 16px rgba(185,28,28,0.22)',
              }}
            >
              {visionContinueLabel}
              <ArrowRight style={{ width: 14, height: 14 }} />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => { if (currentStep === 5) setCurrentStep(4); else if (currentStep > 1) setCurrentStep(currentStep - 1); }}
              disabled={currentStep === 1}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                border: currentStep === 1 ? 'none' : '1px solid #d1d5db',
                background: currentStep === 1 ? 'transparent' : '#fff', color: currentStep === 1 ? '#d1d5db' : '#374151',
                cursor: currentStep === 1 ? 'not-allowed' : 'pointer',
              }}
            >
              <ArrowLeft style={{ width: 14, height: 14 }} />
              Back
            </button>

            <span style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af' }}>Step {stepNum} of {steps.length}</span>

            <button
              type="button"
              onClick={handleNext}
              disabled={!isStepValid()}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 800,
                border: 'none', color: '#fff', cursor: isStepValid() ? 'pointer' : 'not-allowed',
                background: isStepValid() ? HARX_GRADIENT : '#d1d5db',
                boxShadow: isStepValid() ? '0 6px 16px rgba(185,28,28,0.22)' : 'none',
              }}
            >
              {currentStep === 6 ? 'Start building' : 'Continue'}
              <ArrowRight style={{ width: 14, height: 14 }} />
            </button>
          </>
        )}
      </div>
      </div>
    </div>
  );
}
