import React, { useState, useEffect } from 'react';
import { HelpCircle, ArrowUp } from 'lucide-react';
import { Suggestions } from './Suggestions';
import { SectionContent } from './SectionContent';
import { AudioBriefRecorder } from './AudioBriefRecorder';
import { GigData, GigSuggestion } from '../types';
import { predefinedOptions } from '../lib/guidance';
import { mapGeneratedDataToGigData } from '../lib/ai';
import Cookies from 'js-cookie';
import {
  Briefcase,
  Calendar,
  DollarSign,
  Users,
  Award,
  ClipboardList
} from "lucide-react";
import toast from 'react-hot-toast';
const sections = [
  { id: 'basic', label: 'Basic Information', icon: Briefcase },
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'commission', label: 'Commission', icon: DollarSign },
  { id: 'skills', label: 'Skills', icon: Award },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'review', label: 'Review', icon: ClipboardList }
];

interface PrompAIProps {
  onBack?: () => void; // Existing back (Back to AI Assistant or original onBack)
  onBackToGigs?: () => void;
  onBackToOnboarding?: () => void;
}

const PrompAI: React.FC<PrompAIProps> = ({ onBack, onBackToGigs, onBackToOnboarding }) => {
  const backToOnboarding = onBackToOnboarding ?? onBack;

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [input, setInput] = useState("");
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showGuidance, setShowGuidance] = useState(false);
  const [audioFromDictation, setAudioFromDictation] = useState(false);
  const [confirmedSuggestions, setConfirmedSuggestions] = useState<GigSuggestion | null>(null);
  const [currentSection, setCurrentSection] = useState<string>("basic");
  const [showReview, setShowReview] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editGigId, setEditGigId] = useState<string | null>(null);
  const [isLoadingGig, setIsLoadingGig] = useState(false);

  const [gigData, setGigData] = useState<GigData>({
    userId: Cookies.get('userId') || "",
    companyId: Cookies.get('companyId') || "",
    title: "",
    description: "",
    category: "",
    destination_zone: "",
    destinationZones: [],
    callTypes: [],
    highlights: [],
    industries: [],
    activities: [],
    status: 'to_activate',
    requirements: {
      essential: [],
      preferred: []
    },
    benefits: [],
    availability: {
      schedule: [],
      timeZones: [],
      time_zone: "",
      flexibility: [],
      minimumHours: {}
    },
    schedule: {
      schedules: [],
      timeZones: [],
      time_zone: "",
      flexibility: [],
      minimumHours: {}
    },
    commission: {
      commission_per_call: 0,
      bonusAmount: "0",
      currency: "",
      minimumVolume: {
        amount: "0",
        period: "",
        unit: ""
      },
      transactionCommission: 0,
      kpis: [],
      additionalDetails: ""
    },
    leads: {
      types: [],
      sources: [],
      distribution: {
        method: "",
        rules: []
      },
      qualificationCriteria: []
    },
    skills: {
      languages: [],
      soft: [],
      professional: [],
      technical: []
    },
    seniority: {
      level: "",
      yearsExperience: 0
    },
    team: {
      size: 0,
      structure: [],
      territories: [],
      reporting: {
        to: "",
        frequency: ""
      },
      collaboration: []
    },
    documentation: {
      training: [],
      product: [],
      process: []
    },
    activity: {
      options: []
    }
  });

  // Scroll to top when section changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentSection]);

  // Check for edit mode parameters on component mount
  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto to correctly calculate scrollHeight
      textarea.style.height = 'auto';
      // Set new height based on scrollHeight
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [input]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const editParam = urlParams.get('edit');
    const gigIdParam = urlParams.get('gigId');
    const sectionParam = urlParams.get('section');

    if (editParam === 'true' && gigIdParam) {
      setIsEditMode(true);
      setEditGigId(gigIdParam);
      loadGigForEdit(gigIdParam);

      // Si une section est spécifiée, aller directement au formulaire
      if (sectionParam) {
        setCurrentSection(sectionParam);
        setIsManualMode(true);
      }
    }
  }, []);

  // Function to load gig data for editing
  const loadGigForEdit = async (gigId: string) => {
    setIsLoadingGig(true);
    try {
      
      const response = await fetch(`${import.meta.env.VITE_API_URL_GIGS}/gigs/${gigId}`);

      if (!response.ok) {
        console.error('🔄 EDIT MODE - API Error:', response.status, response.statusText);
        throw new Error(`Failed to fetch gig data: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();
      

      const { data } = responseData;

      if (data) {
        

        // Map the fetched gig data to our GigData format
        const mappedGigData: GigData = {
          userId: data.userId || Cookies.get('userId') || "",
          companyId: data.companyId || Cookies.get('companyId') || "",
          title: data.title || "",
          description: data.description || "",
          category: data.category || "",
          destination_zone: typeof data.destination_zone === 'object' && data.destination_zone?._id
            ? data.destination_zone._id
            : data.destination_zone || "",
          destinationZones: data.destinationZones || [],
          callTypes: data.callTypes || [],
          highlights: data.highlights || [],
          industries: Array.isArray(data.industries)
            ? data.industries.map((industry: { _id: any; }) =>
              typeof industry === 'object' && industry?._id
                ? industry._id
                : industry
            )
            : [],
          activities: Array.isArray(data.activities)
            ? data.activities.map((activity: any) =>
              typeof activity === 'object' && activity?._id
                ? activity._id
                : activity
            )
            : [],
          status: data.status || 'to_activate',
          requirements: data.requirements || { essential: [], preferred: [] },
          benefits: data.benefits || [],
          availability: {
            schedule: data.availability?.schedule || data.schedule?.schedules || [],
            timeZones: data.availability?.timeZones || data.schedule?.timeZones || [],
            time_zone: typeof data.availability?.time_zone === 'object' && data.availability?.time_zone?._id
              ? data.availability.time_zone._id
              : typeof data.schedule?.time_zone === 'object' && data.schedule?.time_zone?._id
                ? data.schedule.time_zone._id
                : data.availability?.time_zone || data.schedule?.time_zone || "",
            flexibility: data.availability?.flexibility || data.schedule?.flexibility || [],
            minimumHours: data.availability?.minimumHours || data.schedule?.minimumHours || {}
          },
          schedule: {
            schedules: data.schedule?.schedules || data.availability?.schedule || [],
            timeZones: data.schedule?.timeZones || data.availability?.timeZones || [],
            time_zone: typeof data.schedule?.time_zone === 'object' && data.schedule?.time_zone?._id
              ? data.schedule.time_zone._id
              : typeof data.availability?.time_zone === 'object' && data.availability?.time_zone?._id
                ? data.availability.time_zone._id
                : data.schedule?.time_zone || data.availability?.time_zone || "",
            flexibility: data.schedule?.flexibility || data.availability?.flexibility || [],
            minimumHours: data.schedule?.minimumHours || data.availability?.minimumHours || {}
          },
          // Ajouter time_zone au niveau racine pour ScheduleSection
          time_zone: typeof data.schedule?.time_zone === 'object' && data.schedule?.time_zone?._id
            ? data.schedule.time_zone._id
            : typeof data.availability?.time_zone === 'object' && data.availability?.time_zone?._id
              ? data.availability.time_zone._id
              : data.schedule?.time_zone || data.availability?.time_zone || "",
          commission: {
            commission_per_call: data.commission?.commission_per_call || data.commission?.baseAmount || data.commission?.base || 0,
            bonusAmount: (data.commission?.bonusAmount || data.commission?.bonus || "0").toString(),
            currency: typeof data.commission?.currency === 'object' && data.commission?.currency?._id
              ? data.commission.currency._id
              : data.commission?.currency || "",
            minimumVolume: {
              amount: (data.commission?.minimumVolume?.amount || "0").toString(),
              period: data.commission?.minimumVolume?.period || "",
              unit: data.commission?.minimumVolume?.unit || ""
            },
            transactionCommission: typeof data.commission?.transactionCommission === 'object'
              ? (data.commission.transactionCommission?.amount || 0)
              : (data.commission?.transactionCommission || 0),
            additionalDetails: data.commission?.additionalDetails || "",
            kpis: data.commission?.kpis || []
          },
          leads: {
            types: data.leads?.types || [],
            sources: data.leads?.sources || [],
            distribution: data.leads?.distribution || { method: "", rules: [] },
            qualificationCriteria: data.leads?.qualificationCriteria || []
          },
          skills: {
            languages: Array.isArray(data.skills?.languages)
              ? data.skills.languages.map(lang => ({
                language: typeof lang.language === 'object' && lang.language?._id
                  ? lang.language._id
                  : lang.language || '',
                proficiency: lang.proficiency || '',
                iso639_1: lang.iso639_1 || ''
              }))
              : [],
            soft: Array.isArray(data.skills?.soft)
              ? data.skills.soft.map(skill => {
                // Extract the actual ID string from the skill object
                let skillId = '';
                if (typeof skill.skill === 'object' && skill.skill) {
                  if (skill.skill._id) {
                    skillId = skill.skill._id;
                  } else if (skill.skill.$oid) {
                    skillId = skill.skill.$oid;
                  }
                } else if (typeof skill.skill === 'string') {
                  skillId = skill.skill;
                }

                return {
                  skill: { $oid: skillId },
                  level: skill.level || 1,
                  details: skill.details || ''
                };
              })
              : [],
            professional: Array.isArray(data.skills?.professional)
              ? data.skills.professional.map(skill => {
                // Extract the actual ID string from the skill object
                let skillId = '';
                if (typeof skill.skill === 'object' && skill.skill) {
                  if (skill.skill._id) {
                    skillId = skill.skill._id;
                  } else if (skill.skill.$oid) {
                    skillId = skill.skill.$oid;
                  }
                } else if (typeof skill.skill === 'string') {
                  skillId = skill.skill;
                }

                return {
                  skill: { $oid: skillId },
                  level: skill.level || 1,
                  details: skill.details || ''
                };
              })
              : [],
            technical: Array.isArray(data.skills?.technical)
              ? data.skills.technical.map(skill => {
                // Extract the actual ID string from the skill object
                let skillId = '';
                if (typeof skill.skill === 'object' && skill.skill) {
                  if (skill.skill._id) {
                    skillId = skill.skill._id;
                  } else if (skill.skill.$oid) {
                    skillId = skill.skill.$oid;
                  }
                } else if (typeof skill.skill === 'string') {
                  skillId = skill.skill;
                }

                return {
                  skill: { $oid: skillId },
                  level: skill.level || 1,
                  details: skill.details || ''
                };
              })
              : []
          },
          seniority: {
            level: data.seniority?.level || "",
            yearsExperience: data.seniority?.yearsExperience || 0
          },
          team: {
            size: data.team?.size || 0,
            structure: data.team?.structure || [],
            territories: Array.isArray(data.team?.territories)
              ? data.team.territories.map(territory =>
                typeof territory === 'object' && territory?._id
                  ? territory._id
                  : territory
              )
              : [],
            reporting: data.team?.reporting || { to: "", frequency: "" },
            collaboration: data.team?.collaboration || []
          },
          activity: data.activity || { options: [] },
          documentation: {
            training: data.documentation?.training || [],
            product: data.documentation?.product || [],
            process: data.documentation?.process || []
          }
        };

        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        


        // Debug: Check the structure of individual skill objects
        if (data.skills?.professional && data.skills.professional.length > 0) {
          
          
        }
        if (data.skills?.technical && data.skills.technical.length > 0) {
          
          
        }
        if (data.skills?.soft && data.skills.soft.length > 0) {
          
          
        }

        // Debug: Check the mapped skill structure
        if (mappedGigData.skills.professional.length > 0) {
          
          
        }
        if (mappedGigData.skills.technical.length > 0) {
          
          
        }
        if (mappedGigData.skills.soft.length > 0) {
          
          
        }
        
        
        
        
        

        // Debug: Vérifier la structure des skills mappés
        if (mappedGigData.skills.languages.length > 0) {
          
        }
        if (mappedGigData.skills.professional.length > 0) {
          
        }
        
        

        setGigData(mappedGigData);
        setIsManualMode(true); // Activer le mode manuel pour l'édition

        // Vérifier si une section spécifique est demandée dans l'URL
        const urlParams = new URLSearchParams(window.location.search);
        const sectionParam = urlParams.get('section');
        setCurrentSection(sectionParam || "basic");
      }
    } catch (error) {
      console.error('Error loading gig for edit:', error);
      // En cas d'erreur, on peut afficher un message ou rediriger
    } finally {
      setIsLoadingGig(false);
    }
  };

  const captureSelection = () => {
    const el = textareaRef.current;
    if (!el) return;
    setSelection({ start: el.selectionStart ?? 0, end: el.selectionEnd ?? 0 });
  };

  const applyTranscriptToInput = (transcript: string) => {
    const text = transcript.trim();
    if (!text) return;

    const el = textareaRef.current;
    const start = el?.selectionStart ?? selection.start;
    const end = el?.selectionEnd ?? selection.end;
    const current = input;

    let next = current;
    let caret = 0;

    if (start !== end) {
      // Replace selected text
      next = current.slice(0, start) + text + current.slice(end);
      caret = start + text.length;
      toast.success('Passage sélectionné corrigé.');
    } else if (!current.trim()) {
      next = text;
      caret = text.length;
      toast.success('Texte dicté ajouté.');
    } else if (start <= 0) {
      // Insert at beginning
      const gap = current && !current.startsWith(' ') && !text.endsWith(' ') ? ' ' : '';
      next = text + gap + current;
      caret = text.length;
      toast.success('Texte ajouté au début.');
    } else if (start >= current.length) {
      // Append at end
      const needsSpace = !/\s$/.test(current) && !/^\s/.test(text);
      next = current + (needsSpace ? ' ' : '') + text;
      caret = next.length;
      toast.success('Texte ajouté à la suite.');
    } else {
      // Insert at cursor
      const before = current.slice(0, start);
      const after = current.slice(start);
      const leftGap = before && !/\s$/.test(before) && !/^\s/.test(text) ? ' ' : '';
      const rightGap = after && !/^\s/.test(after) && !/\s$/.test(text) ? ' ' : '';
      next = before + leftGap + text + rightGap + after;
      caret = (before + leftGap + text).length;
      toast.success('Texte inséré au curseur.');
    }

    setInput(next);
    setAudioFromDictation(true);
    window.setTimeout(() => {
      const node = textareaRef.current;
      if (!node) return;
      node.focus();
      node.setSelectionRange(caret, caret);
      setSelection({ start: caret, end: caret });
    }, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      // Modal disabled - directly proceed to suggestions generation
      handleGenerateSuggestions();
    }
  };

  const handleGenerateSuggestions = () => {
    setIsAnalyzing(true);
    setShowAIDialog(false);
    // Simuler le temps d'analyse
    setTimeout(() => {
      setIsAnalyzing(false);
      setShowSuggestions(true);
    }, 1500);
  };

  const handleAudioTranscript = (text: string) => {
    applyTranscriptToInput(text);
  };

  const handleAudioCancel = () => {
    toast('Enregistrement annulé');
  };

  const dictationModeHint = (() => {
    if (selection.start !== selection.end) {
      return 'Sélection active → la prochaine dictée remplacera ce passage.';
    }
    if (!input.trim()) {
      return 'Dictez votre brief, puis corrigez le texte avant d’envoyer.';
    }
    return 'Placez le curseur pour ajouter, ou sélectionnez un passage pour le corriger.';
  })();

  const handleConfirmSuggestions = (suggestions: GigSuggestion) => {
    setConfirmedSuggestions(suggestions);
    setShowSuggestions(false);
    setCurrentSection("basic");

    // Map the generated data to the initialized structure
    const mappedData = mapGeneratedDataToGigData(suggestions);
    
    
    

    // Update the gig data with the mapped suggestions
    setGigData((prevData: GigData) => ({
      ...prevData,
      ...mappedData,
      // Use selected job title as the main title
      title: suggestions.selectedJobTitle || mappedData.title || prevData.title,
      // Preserve any existing data that wasn't in the suggestions
      userId: prevData.userId,
      companyId: prevData.companyId,
      // Use the destination_zone from mappedData (which comes from AI suggestions)
      destination_zone: mappedData.destination_zone || prevData.destination_zone
    }));
  };

  const handleSectionChange = (sectionId: string) => {
    
    
    
    setCurrentSection(sectionId);
  };

  const handleGigDataChange = (newData: GigData) => {
    
    setGigData(newData);
  };

  const handleManualMode = () => {
    setIsManualMode(true);
    setCurrentSection("basic");
  };

  if (showSuggestions) {
    return (
      <div className="w-full h-full py-8 px-4 mx-auto max-w-5xl">
        <Suggestions
          input={input}
          onBack={() => {
            setShowSuggestions(false);
            // S'assurer que la section courante est définie quand on revient
            if (confirmedSuggestions || isManualMode) {
              setCurrentSection("basic");
            }
          }}
          onConfirm={handleConfirmSuggestions}
          initialSuggestions={confirmedSuggestions}
        />
      </div>
    );
  }

  // Show loading state when loading gig for edit
  if (isLoadingGig) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-harx-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading gig data for editing...</p>
        </div>
      </div>
    );
  }

  if (confirmedSuggestions || isManualMode) {
    // S'assurer que currentSection est valide
    const validSections = sections.map(s => s.id);
    const effectiveSection = validSections.includes(currentSection) ? currentSection : 'basic';

    // Si showReview est true, afficher directement le GigReview
    if (showReview) {
      return (
        <div className="min-h-screen bg-[#F8FAFC]">
          <div className="w-full h-full py-8 px-4">
            <div className="backdrop-blur-sm rounded-3xl shadow-2xl border border-white/30 overflow-hidden w-full h-full">
              <div>
                <SectionContent
                  section="review"
                  data={gigData}
                  onChange={handleGigDataChange}
                  errors={{}}
                  constants={predefinedOptions}
                  onSectionChange={handleSectionChange}
                  isAIMode={!!confirmedSuggestions}
                  isEditMode={isEditMode}
                  editGigId={editGigId}
                  onPublishSuccess={onBackToOnboarding}
                />
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className={
          effectiveSection === 'review'
            ? 'w-full h-full py-8 px-4'
            : 'w-full h-full py-8 px-4 mx-auto max-w-5xl'
        }>
          {/* Header with back button for manual mode */}
          {isManualMode && (
            <div className="mb-8">
              <div className="flex items-center mb-4">
                <button
                  onClick={() => {
                    if (isEditMode && onBack) {
                      onBack();
                    } else if (isManualMode) {
                      setIsManualMode(false);
                    }
                  }}
                  className="flex items-center text-harx-500 hover:text-harx-600 transition-colors duration-200 py-2 font-bold"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  {isEditMode ? 'Back' : 'Back to AI Assistant'}
                </button>
              </div>
              <div className="text-center mt-2">
                <div className="flex items-center justify-center space-x-3 mb-2">
                  <h1 className="text-4xl font-black bg-gradient-harx bg-clip-text text-transparent">
                    {isEditMode ? 'Edit Gig' : 'Create Gig Manually'}
                  </h1>
                </div>
                <p className="text-lg text-gray-500 font-medium">
                  {isEditMode ? 'Modify the sections below to update your gig' : 'Fill out the sections below to create your gig'}
                </p>
              </div>
            </div>
          )}

          {/* Navigation and Section Content */}
          <div className="backdrop-blur-sm rounded-3xl shadow-2xl border border-white/30 overflow-hidden w-full h-full">

            {/* Navigation Tabs */}
            {effectiveSection !== 'review' && (
              <nav className="border-b border-gray-100 bg-white px-4 py-3">
                <div className="flex justify-center gap-2">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => handleSectionChange(section.id)}
                      className={`flex items-center gap-2 px-4 py-2 text-base font-bold transition-all duration-200
                        ${section.id === effectiveSection
                          ? "border-b-4 border-harx-500 text-harx-500 bg-harx-50/50"
                          : "text-gray-500 hover:text-harx-500 border-b-4 border-transparent hover:bg-gray-50"
                        }`}
                      style={{ outline: "none" }}
                    >
                      <section.icon className={`w-5 h-5 ${section.id === effectiveSection ? 'text-harx-500' : 'text-gray-400'}`} />
                      {section.label}
                    </button>
                  ))}
                </div>
              </nav>
            )}

            {/* Section Content */}
            <div>
              <SectionContent
                section={effectiveSection}
                data={gigData}
                onChange={handleGigDataChange}
                errors={{}}
                constants={predefinedOptions}
                onSectionChange={handleSectionChange}
                isAIMode={!!confirmedSuggestions}
                isEditMode={isEditMode}
                editGigId={editGigId}
                onPublishSuccess={onBackToOnboarding}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-80px)] overflow-hidden flex flex-col bg-[#F8FAFC]">
      <div className="w-full max-w-5xl mx-auto px-4 pt-6 shrink-0">
        {/* Navigation Buttons */}
        <div className="flex justify-between items-center">
          <div className="flex gap-4 items-center">
            {onBackToGigs && (
              <button
                onClick={onBackToGigs}
                className="flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-md border border-white/40 rounded-xl text-xs font-black uppercase tracking-widest text-gray-600 hover:bg-white/80 hover:text-harx-500 transition-all duration-300 shadow-sm"
              >
                <Briefcase className="w-4 h-4" />
                Back to Gigs
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-3xl -translate-y-6 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_20px_60px_-28px_rgba(15,23,42,0.35)] sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                  Création de gig
                </p>
                <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                  Décrivez votre besoin
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Écrivez, dictez, sélectionnez un passage pour le corriger, puis envoyez.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowGuidance(!showGuidance)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  <HelpCircle className="h-4 w-4" />
                  Conseils
                </button>
              </div>
            </div>

            {showGuidance && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <ul className="space-y-1.5 text-sm text-slate-600">
                  <li>• Audience, zone géographique et langue</li>
                  <li>• Compétences et expérience attendues</li>
                  <li>• Planning / disponibilités</li>
                  <li>• Commission ou objectifs si connus</li>
                </ul>
              </div>
            )}

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/40 focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-900/5">
              <textarea
                ref={textareaRef}
                id="description"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setAudioFromDictation(false);
                }}
                onSelect={captureSelection}
                onKeyUp={captureSelection}
                onClick={captureSelection}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (input.trim() && !isAnalyzing) {
                      handleGenerateSuggestions();
                    }
                  }
                }}
                rows={5}
                placeholder="Ex. : Campagne télévente assurance santé, francophones en France, bonus au closing…"
                className="w-full resize-none border-0 bg-transparent px-5 pb-3 pt-5 text-[16px] leading-relaxed text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 sm:text-[17px]"
              />

              <div className="flex flex-col gap-3 border-t border-slate-200/80 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <AudioBriefRecorder
                  disabled={isAnalyzing}
                  language="fr"
                  maxSeconds={120}
                  modeHint={dictationModeHint}
                  onTranscript={handleAudioTranscript}
                  onCancel={handleAudioCancel}
                  onError={(message) => toast.error(message)}
                />

                <div className="flex items-center justify-end gap-2">
                  {input.trim() ? (
                    <button
                      type="button"
                      onClick={() => {
                        setInput('');
                        setAudioFromDictation(false);
                        setSelection({ start: 0, end: 0 });
                        textareaRef.current?.focus();
                      }}
                      className="rounded-xl px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                    >
                      Effacer
                    </button>
                  ) : null}
                  <button
                    type="submit"
                    disabled={!input.trim() || isAnalyzing}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black uppercase tracking-wide text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                  >
                    {isAnalyzing ? 'Analyse…' : 'Générer'}
                    <ArrowUp className="h-4 w-4 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-500">
              {audioFromDictation ? (
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-800">
                  Dictée prête — éditez librement
                </span>
              ) : null}
              {selection.start !== selection.end ? (
                <span className="rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-800">
                  Sélection · dictée = correction
                </span>
              ) : null}
              <span>Entrée = générer · Shift+Entrée = nouvelle ligne · max dictée 2 min</span>
            </div>
          </form>
        </div>
      </div>

      {/* AIDialog disabled - modal removed */}
    </div>
  );
};

export default PrompAI;
