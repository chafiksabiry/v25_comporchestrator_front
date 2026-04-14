import React, { useState, useEffect } from 'react';
import { Brain, HelpCircle, PlusCircle, ArrowUp } from 'lucide-react';
import { Suggestions } from './Suggestions';
import { SectionContent } from './SectionContent';
import Logo from './Logo';
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

const sections = [
  { id: 'basic', label: 'Basic Information', icon: Briefcase },
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'commission', label: 'Commission', icon: DollarSign },
  { id: 'skills', label: 'Skills', icon: Award },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'review', label: 'Review', icon: ClipboardList }
];

interface PrompAIProps {
  onBack?: () => void;
}

const PrompAI: React.FC<PrompAIProps> = ({ onBack }) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [input, setInput] = useState("");
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showGuidance, setShowGuidance] = useState(false);
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
      console.log('🔄 EDIT MODE - Fetching gig data from:', `${import.meta.env.VITE_GIGS_API}/gigs/${gigId}`);
      const response = await fetch(`${import.meta.env.VITE_GIGS_API}/gigs/${gigId}`);

      if (!response.ok) {
        console.error('🔄 EDIT MODE - API Error:', response.status, response.statusText);
        throw new Error(`Failed to fetch gig data: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();
      console.log('🔄 EDIT MODE - API Response:', responseData);

      const { data } = responseData;

      if (data) {
        console.log('🔍 DEBUG COMMISSION - Raw API data.commission:', data.commission);

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

        console.log('🔄 EDIT MODE - Loaded gig data:', data);
        console.log('🔄 EDIT MODE - Raw industries:', data.industries);
        console.log('🔄 EDIT MODE - Raw activities:', data.activities);
        console.log('🔄 EDIT MODE - Mapped gig data:', mappedGigData);
        console.log('🔄 EDIT MODE - Mapped industries (IDs):', mappedGigData.industries);
        console.log('🔄 EDIT MODE - Mapped activities (IDs):', mappedGigData.activities);
        console.log('🔄 EDIT MODE - destination_zone ID:', mappedGigData.destination_zone);
        console.log('🔄 EDIT MODE - time_zone ID (schedule):', mappedGigData.schedule.time_zone);
        console.log('🔄 EDIT MODE - time_zone ID (root):', mappedGigData.time_zone);
        console.log('🔄 EDIT MODE - currency ID:', mappedGigData.commission.currency);
        console.log('🔄 EDIT MODE - Raw skills data:', data.skills);
        console.log('🔄 EDIT MODE - Raw languages:', data.skills?.languages);
        console.log('🔄 EDIT MODE - Raw professional skills:', data.skills?.professional);
        console.log('🔄 EDIT MODE - Raw technical skills:', data.skills?.technical);
        console.log('🔄 EDIT MODE - Raw soft skills:', data.skills?.soft);
        console.log('🔍 DEBUG COMMISSION - Mapped commission data:', mappedGigData.commission);


        // Debug: Check the structure of individual skill objects
        if (data.skills?.professional && data.skills.professional.length > 0) {
          console.log('🔄 EDIT MODE - First professional skill raw structure:', data.skills.professional[0]);
          console.log('🔄 EDIT MODE - First professional skill.skill structure:', data.skills.professional[0].skill);
        }
        if (data.skills?.technical && data.skills.technical.length > 0) {
          console.log('🔄 EDIT MODE - First technical skill raw structure:', data.skills.technical[0]);
          console.log('🔄 EDIT MODE - First technical skill.skill structure:', data.skills.technical[0].skill);
        }
        if (data.skills?.soft && data.skills.soft.length > 0) {
          console.log('🔄 EDIT MODE - First soft skill raw structure:', data.skills.soft[0]);
          console.log('🔄 EDIT MODE - First soft skill.skill structure:', data.skills.soft[0].skill);
        }

        // Debug: Check the mapped skill structure
        if (mappedGigData.skills.professional.length > 0) {
          console.log('🔄 EDIT MODE - Mapped professional skill structure:', mappedGigData.skills.professional[0]);
          console.log('🔄 EDIT MODE - Mapped professional skill.skill:', mappedGigData.skills.professional[0].skill);
        }
        if (mappedGigData.skills.technical.length > 0) {
          console.log('🔄 EDIT MODE - Mapped technical skill structure:', mappedGigData.skills.technical[0]);
          console.log('🔄 EDIT MODE - Mapped technical skill.skill:', mappedGigData.skills.technical[0].skill);
        }
        if (mappedGigData.skills.soft.length > 0) {
          console.log('🔄 EDIT MODE - Mapped soft skill structure:', mappedGigData.skills.soft[0]);
          console.log('🔄 EDIT MODE - Mapped soft skill.skill:', mappedGigData.skills.soft[0].skill);
        }
        console.log('🔄 EDIT MODE - Mapped skills data:', mappedGigData.skills);
        console.log('🔄 EDIT MODE - Mapped languages:', mappedGigData.skills.languages);
        console.log('🔄 EDIT MODE - Mapped professional skills:', mappedGigData.skills.professional);
        console.log('🔄 EDIT MODE - Mapped technical skills:', mappedGigData.skills.technical);
        console.log('🔄 EDIT MODE - Mapped soft skills:', mappedGigData.skills.soft);

        // Debug: Vérifier la structure des skills mappés
        if (mappedGigData.skills.languages.length > 0) {
          console.log('🔄 EDIT MODE - First language structure:', mappedGigData.skills.languages[0]);
        }
        if (mappedGigData.skills.professional.length > 0) {
          console.log('🔄 EDIT MODE - First professional skill structure:', mappedGigData.skills.professional[0]);
        }
        console.log('🔄 EDIT MODE - Raw team territories:', data.team?.territories);
        console.log('🔄 EDIT MODE - Mapped team territories:', mappedGigData.team.territories);

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

  const handleConfirmSuggestions = (suggestions: GigSuggestion) => {
    setConfirmedSuggestions(suggestions);
    setShowSuggestions(false);
    setCurrentSection("basic");

    // Map the generated data to the initialized structure
    const mappedData = mapGeneratedDataToGigData(suggestions);
    console.log('🔄 PROMP AI - suggestions.destination_zone:', suggestions.destination_zone);
    console.log('🔄 PROMP AI - mappedData.destination_zone:', mappedData.destination_zone);
    console.log('🔄 PROMP AI - selectedJobTitle:', suggestions.selectedJobTitle);

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
    console.log(`🔄 PROMP AI - Section change to: ${sectionId}`);
    console.log('🔄 PROMP AI - gigData.schedule:', gigData.schedule);
    console.log('🔄 PROMP AI - gigData.availability:', gigData.availability);
    setCurrentSection(sectionId);
  };

  const handleGigDataChange = (newData: GigData) => {
    console.log('🔄 PROMP AI - Gig data changed:', newData);
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
            <div className="w-full max-w-3xl mx-auto mb-8 flex justify-center">
              <Logo />
            </div>
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
          {/* Logo et Titre global en haut */}
          <div className="w-full max-w-3xl mx-auto mb-8 flex justify-center">
            {confirmedSuggestions && (
              <Logo />
            )}
          </div>

          {/* Header with back button and centered logo for manual mode */}
          {isManualMode && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
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
                <div className="flex-1 flex justify-center items-center">
                  <Logo />
                </div>
                <div className="w-32"></div> {/* Spacer to balance the layout */}
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
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="w-full h-full py-6 px-4 mx-auto max-w-5xl">
        <div className="text-center mb-12 relative">
          <Logo className="mb-4" />
          <div className="flex items-center justify-center space-x-4 mb-2">
            <h1 className="text-4xl font-black tracking-tighter text-black uppercase italic">
              Create with <span className="bg-gradient-harx bg-clip-text text-transparent">AI Assistance</span>
            </h1>
          </div>
          <p className="text-lg text-gray-500 font-medium w-full mx-auto italic tracking-wide">
            Describe your needs naturally, and let AI help structure your content
          </p>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/30 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700"
                >
                  Describe your needs naturally
                </label>
                <div className="flex items-center space-x-4">
                  <button
                    type="button"
                    onClick={() => setShowGuidance(!showGuidance)}
                    className="text-harx-500 hover:text-harx-600 flex items-center text-sm font-bold"
                  >
                    <HelpCircle className="w-4 h-4 mr-1" />
                    Writing Tips
                  </button>
                  <button
                    type="button"
                    disabled
                    className="text-gray-400 flex items-center text-sm cursor-not-allowed"
                  >
                    <PlusCircle className="w-5 h-5 mr-1 text-gray-400" />
                    <span>Create Manually</span>
                  </button>
                </div>
              </div>

              {showGuidance && (
                <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="text-sm font-medium text-blue-800 mb-2">Writing Tips</h3>
                  <ul className="text-sm text-blue-600 space-y-2">
                    <li>• Be specific about your target audience and location</li>
                    <li>• Mention key requirements and qualifications</li>
                    <li>• Include details about schedule and availability</li>
                    <li>• Specify any technical requirements or tools needed</li>
                    <li>• Describe the compensation structure if possible</li>
                  </ul>
                </div>
              )}

              <div className="relative">
                <textarea
                  ref={textareaRef}
                  id="description"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  rows={1}
                  placeholder="Example: I need a sales campaign targeting Spanish-speaking customers in Europe, with a focus on insurance products..."
                  className="w-full min-h-[88px] max-h-[172px] pl-6 pr-14 py-4 bg-[#f4f4f4] border-none rounded-[26px] focus:ring-0 text-gray-900 placeholder-gray-500 text-lg resize-none shadow-sm overflow-y-auto"
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="absolute bottom-3 right-3 p-3 bg-gradient-harx text-white rounded-2xl hover:scale-105 disabled:bg-gray-200 disabled:scale-100 disabled:cursor-not-allowed transition-all duration-300 shadow-xl shadow-harx-500/20"
                >
                  <ArrowUp className="w-6 h-6 stroke-[3]" />
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* AIDialog disabled - modal removed */}
    </div>
  );
};

export default PrompAI;