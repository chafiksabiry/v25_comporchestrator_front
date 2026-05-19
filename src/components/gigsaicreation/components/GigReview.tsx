import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import Cookies from "js-cookie";
import axios from "axios";
import {
  DollarSign,
  Users,
  Award,
  Star,
  Clock,
  Calendar,
  Briefcase,
  Coins,
  Edit3,
  MapPin,
  Building,
  Target,
  Zap,
  Languages,
  ArrowLeft,
  Repeat,
  Phone,
} from "lucide-react";
import { GigData } from "../types";
import { predefinedOptions } from "../lib/guidance";
import { groupSchedules } from "../lib/scheduleUtils";
import { fetchAllTimezones, fetchCompanyById, getCountryNameById, fetchCurrencyById } from '../lib/api';
// import { GigStatusBadge } from './GigStatusBadge';
import {
  getIndustryNameById,
  loadLanguages,
  getLanguageNameById
} from '../lib/activitiesIndustries';

interface GigReviewProps {
  data: GigData;
  onEdit: (section: string) => void;
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
  onBack: () => void;
  isEditMode?: boolean;
  editGigId?: string | null;
  /** When set (e.g. embedded in Company Onboarding), called instead of full page navigation to /#/orchestrator */
  onPublishSuccess?: () => void | Promise<void>;
  isReadOnly?: boolean;
}

export function GigReview({
  data,
  onEdit,
  onSubmit,
  isSubmitting,
  onBack,
  isEditMode = false,
  editGigId = null,
  onPublishSuccess,
  isReadOnly = false,
}: GigReviewProps) {
  // State for skills data
  const [softSkills, setSoftSkills] = useState<Array<{ _id: string, name: string, description: string, category: string }>>([]);
  const [professionalSkills, setProfessionalSkills] = useState<Array<{ _id: string, name: string, description: string, category: string }>>([]);
  const [technicalSkills, setTechnicalSkills] = useState<Array<{ _id: string, name: string, description: string, category: string }>>([]);
  const [skillsLoading, setSkillsLoading] = useState(true);
  const [languagesLoading, setLanguagesLoading] = useState(true);
  const [selectedCurrency, setSelectedCurrency] = useState<any>(null);

  // State for timezones and companies
  const [timezoneMap, setTimezoneMap] = useState<{ [key: string]: string }>({});
  const [companyMap, setCompanyMap] = useState<{ [key: string]: string }>({});
  const [countryName, setCountryName] = useState<string>('');

  // Load skills and languages from API
  useEffect(() => {
    const fetchSkillsAndLanguages = async () => {
      try {
        setSkillsLoading(true);
        setLanguagesLoading(true);

        // Fetch all skills categories and languages
        const [softResponse, professionalResponse, technicalResponse] = await Promise.all([
          fetch(`${import.meta.env.VITE_REP_URL}/skills/soft`),
          fetch(`${import.meta.env.VITE_REP_URL}/skills/professional`),
          fetch(`${import.meta.env.VITE_REP_URL}/skills/technical`)
        ]);

        if (softResponse.ok) {
          const softData = await softResponse.json();
          setSoftSkills(softData.data || []);
        }

        if (professionalResponse.ok) {
          const professionalData = await professionalResponse.json();
          setProfessionalSkills(professionalData.data || []);
        }

        if (technicalResponse.ok) {
          const technicalData = await technicalResponse.json();
          setTechnicalSkills(technicalData.data || []);
        }

        // Load languages using the utility function
        await loadLanguages();
      } catch (error) {
        console.error('Error fetching skills and languages:', error);
      } finally {
        setSkillsLoading(false);
        setLanguagesLoading(false);
      }
    };

    fetchSkillsAndLanguages();
  }, []);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Fetch all timezones and companies on mount
  useEffect(() => {
    const fetchMeta = async () => {
      // Fetch timezones
      try {
        const tzRes = await fetchAllTimezones();
        if (tzRes && Array.isArray(tzRes)) {
          const tzMap: { [key: string]: string } = {};
          tzRes.forEach((tz: any) => {
            tzMap[tz._id] = tz.name || tz.label || tz.tz || tz._id;
          });
          setTimezoneMap(tzMap);
        }
      } catch (e) { /* ignore */ }
      // Fetch company by ID if we have a companyId
      if (data.companyId) {
        try {
          const company = await fetchCompanyById(data.companyId);

          if (company) {
            const cMap: { [key: string]: string } = {};
            cMap[company._id] = company.name || company._id;
            setCompanyMap(cMap);
          } else {
          }
        } catch (e) {
        }
      }

      // Fetch country name if we have a destination_zone
      if (data.destination_zone) {
        try {
          const countryNameFromApi = await getCountryNameById(data.destination_zone);
          setCountryName(countryNameFromApi);
        } catch (e) {
          console.error('❌ GigReview: Error fetching country name:', e);
          setCountryName(data.destination_zone); // Fallback to zone ID
        }
      }
    };
    fetchMeta();
  }, []);

  // Fetch currency details
  useEffect(() => {
    const loadCurrency = async () => {
      const currencyVal = data?.commission?.currency;
      if (!currencyVal) return;

      const currencyId = (typeof currencyVal === 'object' && (currencyVal as any).$oid)
        ? (currencyVal as any).$oid
        : currencyVal;

      if (typeof currencyId === 'string') {
        // Try finding in predefined options first
        const currencies = (predefinedOptions.commission as any)?.currencies || [];
        const found = currencies.find((c: any) => c._id === currencyId || c.code === currencyId);

        if (found) {
          setSelectedCurrency(found);
        } else if (/^[0-9a-fA-F]{24}$/.test(currencyId)) {
          // If not found and looks like an ID, fetch it
          try {
            const fetched = await fetchCurrencyById(currencyId);
            if (fetched) setSelectedCurrency(fetched);
          } catch (e) {
            console.error('Error fetching currency:', e);
          }
        }
      }
    };
    loadCurrency();
  }, [data?.commission?.currency]);

  // Helper to get time zone name
  const getTimeZoneName = (zone: string) => {
    return timezoneMap[zone] || zone;
  };
  // Helper to get company name
  const getCompanyName = (id: string) => {

    const companyName = companyMap[id] || id;
    return companyName;
  };
  // Helper to get skill name by id
  const getSkillName = (skill: any, category: 'soft' | 'professional' | 'technical') => {
    // Handle both string and { $oid: string } formats
    let skillId: string;
    if (typeof skill === 'string') {
      skillId = skill;
    } else if (skill && typeof skill === 'object' && skill.$oid) {
      skillId = skill.$oid;
    } else {
      return 'Unknown Skill';
    }

    let arr: any[] = [];
    if (category === 'soft') arr = softSkills;
    if (category === 'professional') arr = professionalSkills;
    if (category === 'technical') arr = technicalSkills;
    const found = arr.find((s) => s._id === skillId);
    return found ? found.name : skillId;
  };

  // Helper to get language name by id
  const getLanguageName = (language: any) => {
    if (languagesLoading) {
      return 'Loading...';
    }

    // Handle both string and { $oid: string } formats
    let languageId: string;
    if (typeof language === 'string') {
      languageId = language;
    } else if (language && typeof language === 'object' && language.$oid) {
      languageId = language.$oid;
    } else {
      return '';
    }

    const languageName = getLanguageNameById(languageId);
    return languageName || languageId;
  };

  const getCurrencySymbol = () => {
    if (selectedCurrency?.symbol) return selectedCurrency.symbol;

    // Fallback logic
    if (!data.commission) {
      return "€";
    }
    const currencies = predefinedOptions.commission.currencies || [];
    return data.commission.currency
      ? currencies.find(
        (c: any) => c.code === data.commission.currency
      )?.symbol || "€"
      : "€";
  };

  const handlePublish = async () => {
    if (isSubmitting) return;
    try {

      // Let onSubmit handle the saving (it already calls saveGigData)
      await onSubmit();

      // Mark Step 3 (Create Gigs - Phase 2) as completed in onboarding progress
      if (!isEditMode) {
        try {
          const companyId = Cookies.get('companyId');
          if (companyId) {
            await axios.put(
              `${import.meta.env.VITE_API_URL_ONBOARDING}/onboarding/phases/2/steps/3/complete`,
              {},
              { params: { companyId } }
            );
          }
        } catch (onboardingError) {
          console.error('Failed to update onboarding progress for step 3:', onboardingError);
          // Don't block the user if onboarding update fails
        }
      }

      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true,
        didOpen: (toast: { addEventListener: (arg0: string, arg1: any) => void; }) => {
          toast.addEventListener('mouseenter', Swal.stopTimer)
          toast.addEventListener('mouseleave', Swal.resumeTimer)
        }
      });

      await Toast.fire({
        icon: 'success',
        title: isEditMode ? "Gig updated successfully" : "Gig published successfully"
      });

      if (isEditMode && editGigId) {
        const gigUrl = `#/dashboard/gigs/${editGigId}`;
        
        window.location.hash = gigUrl;
      } else if (onPublishSuccess) {
        await onPublishSuccess();
      } else {
        // Fallback without full page refresh: switch to onboarding tab
        // and let listeners decide how to refresh progress/state.
        localStorage.setItem('activeTab', 'company-onboarding');
        window.dispatchEvent(
          new CustomEvent('tabChange', { detail: { tab: 'company-onboarding' } })
        );
        window.dispatchEvent(new CustomEvent('refreshOnboardingProgress'));
      }

    } catch (error) {
      console.error('Error publishing gig:', error);
      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
      });

      Toast.fire({
        icon: "error",
        title: error instanceof Error ? error.message : "An unknown error occurred."
      });
    }
  };

  // const renderValidationSummary = () => (
  //   <div className="mb-8 space-y-4">
  //     {hasErrors && (
  //       <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 rounded-lg p-6 shadow-sm">
  //         <div className="flex items-center gap-3 mb-4">
  //           <AlertCircle className="w-6 h-6 text-red-500" />
  //           <h3 className="font-bold text-red-800 text-lg">Issues to Resolve</h3>
  //         </div>
  //         <ul className="space-y-3">
  //           {Object.entries(validation.errors).map(([section, errors]) => (
  //             <li key={section} className="flex items-start gap-4 bg-white p-4 rounded-lg border border-red-200 shadow-sm">
  //               <span className="text-red-600 font-bold text-lg">⚠</span>
  //               <div className="flex-1">
  //                 <span className="font-bold capitalize text-red-800 text-base">{section}:</span>
  //                 <span className="ml-2 text-red-700"> {errors.join(", ")}</span>
  //                 <button
  //                   onClick={() => onEdit(section)}
  //                   className="ml-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md"
  //                 >
  //                   Fix Now
  //                 </button>
  //               </div>
  //             </li>
  //           ))}
  //         </ul>
  //       </div>
  //     )}

  //     {hasWarnings && (
  //       <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-l-4 border-yellow-500 rounded-lg p-6 shadow-sm">
  //         <div className="flex items-center gap-3 mb-4">
  //           <AlertTriangle className="w-6 h-6 text-yellow-600" />
  //           <h3 className="font-bold text-yellow-800 text-lg">Recommendations</h3>
  //         </div>
  //         <ul className="space-y-3">
  //           {Object.entries(validation.warnings).map(
  //             ([section, warnings]) => (
  //               <li key={section} className="flex items-start gap-4 bg-white p-4 rounded-lg border border-yellow-200 shadow-sm">
  //                 <span className="text-yellow-600 font-bold text-lg">💡</span>
  //                 <div className="flex-1">
  //                   <span className="font-bold capitalize text-yellow-800 text-base">{section}:</span>
  //                   <span className="ml-2 text-yellow-700"> {warnings.join(", ")}</span>
  //                   <button
  //                     onClick={() => onEdit(section)}
  //                     className="ml-4 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md"
  //                   >
  //                     Review
  //                   </button>
  //                 </div>
  //               </li>
  //             )
  //           )}
  //         </ul>
  //       </div>
  //     )}

  //     {!hasErrors && !hasWarnings && (
  //       <div className="bg-gradient-to-r from-green-50 to-green-100 border-l-4 border-green-500 rounded-lg p-6 shadow-sm">
  //         <div className="flex items-center gap-4">
  //           <CheckCircle className="w-8 h-8 text-green-500" />
  //           <div>
  //             <h3 className="font-bold text-green-800 text-xl">Ready to Publish! 🚀</h3>
  //             <p className="text-green-700 text-base mt-1">
  //               All required information has been provided and validated successfully.
  //             </p>
  //           </div>
  //         </div>
  //       </div>
  //     )}
  //   </div>
  // );

  const renderEditableSection = (title: string, section: string, icon: React.ReactNode, children: React.ReactNode) => (
    <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 overflow-hidden hover:shadow-xl transition-all duration-300">
      <div className="border-b border-white/20 px-6 py-5 flex items-center justify-between bg-gradient-to-r from-harx-500/5 to-harx-alt-500/5">
        <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-harx flex items-center gap-3">
          {icon}
          {title}
        </h2>
        {!isReadOnly && (
          <button
            onClick={() => onEdit(section)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-harx hover:opacity-90 text-white rounded-lg text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <Edit3 className="w-4 h-4" />
            Edit
          </button>
        )}
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );


  // Before return, define a variable for readable schedule time zones
  // Define a variable for the readable destination zone name
  const destinationZoneName = countryName || getTimeZoneName(data.destination_zone);

  return (
    <div className="space-y-6 bg-gradient-to-br from-white via-harx-50/30 to-harx-alt-50/30 min-h-screen p-8">
      {/* Header Back Button */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-5 py-2 text-sm font-black uppercase tracking-tighter text-gray-600 bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-all duration-300 shadow-sm"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        {!isReadOnly && (
          <button
            onClick={handlePublish}
            disabled={isSubmitting}
            className="px-8 py-3 bg-gradient-harx hover:opacity-90 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg font-semibold transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {isEditMode ? 'Updating...' : 'Publishing...'}
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                {isEditMode ? 'Update Gig' : 'Publish Gig'}
              </>
            )}
          </button>
        )}
      </div>

      {/* Main Card (Matching 1st Image) */}
      <div className="rounded-3xl bg-white border border-gray-100 shadow-sm p-10 space-y-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-xs font-black text-harx-400 uppercase tracking-widest">
              {data.category || 'OUTBOUND SALES'}
            </span>
            <h1 className="text-3xl font-black text-gray-900 leading-tight">
              {data.title || 'No title provided'}
            </h1>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left Column: Job Description */}
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-gray-900">Job Description</h2>
            <p className="text-gray-600 leading-relaxed font-medium text-lg">
              {data.description || 'No description provided'}
            </p>
            {/* Seniority Tags */}
            <div className="flex flex-wrap gap-2 mt-4">
              {data.seniority?.level && (
                <span className="px-3 py-1 bg-pink-50 text-pink-600 rounded-full text-xs font-bold">
                  {data.seniority.level}
                </span>
              )}
              {data.seniority?.yearsExperience && (
                <span className="px-3 py-1 bg-pink-50 text-pink-600 rounded-full text-xs font-bold">
                  {data.seniority.yearsExperience} Years Experience
                </span>
              )}
            </div>
          </div>

          {/* Right Column: Commission & Details */}
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-gray-900">Commission & details</h2>
            
            <div className="space-y-4">
              {/* Badges Row */}
              <div className="flex flex-wrap gap-3">
                <div className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 text-white rounded-lg text-sm font-black uppercase tracking-tight flex items-center gap-2">
                  <Phone size={14} />
                  {data.commission?.commission_per_call || 0}{getCurrencySymbol()} / APPEL
                </div>
                <div className="px-4 py-2 bg-gradient-to-r from-purple-400 to-purple-600 text-white rounded-lg text-sm font-black uppercase tracking-tight flex items-center gap-2">
                  <Repeat size={14} />
                  {data.commission?.transactionCommission || 0}{getCurrencySymbol()} / TRANSACTION
                </div>
              </div>

              {/* Bonus Badge */}
              <div className="px-4 py-2 bg-gradient-to-r from-pink-400 to-rose-500 text-white rounded-lg text-sm font-black uppercase tracking-tight inline-flex items-center gap-2">
                <Star size={14} />
                +{data.commission?.bonusAmount || 0}{getCurrencySymbol()} BONUS
                <span className="text-xs font-medium opacity-80 normal-case ml-1">
                  Chaque {data.commission?.minimumVolume?.amount || 0} appels / {data.commission?.minimumVolume?.period || 'mois'}
                </span>
              </div>

              {/* Description Box */}
              <div className="bg-gray-50 rounded-2xl p-6 text-gray-600 text-sm font-medium leading-relaxed italic border border-gray-100">
                {data.commission?.additionalDetails || "Détails supplémentaires non spécifiés."}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Other Sections (Team, Skills, etc.) moved below in a clean layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Team */}
        {data.team && (
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-harx-50 rounded-xl">
                <Users className="h-6 w-6 text-harx-500" />
              </div>
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Team Structure</h2>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-medium">Team Size</span>
                <span className="font-bold text-gray-900">{data.team.size} members</span>
              </div>
              {/* Add more team details if needed */}
            </div>
          </div>
        )}

        {/* Destination Zone */}
        {data.destination_zone && (
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-emerald-50 rounded-xl">
                <MapPin className="h-6 w-6 text-emerald-600" />
              </div>
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Destination Zone</h2>
            </div>
            <div className="flex items-center gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{destinationZoneName}</h3>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Skills */}
      {data.skills && (
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-8 mt-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-harx-50 rounded-xl">
              <Target className="h-6 w-6 text-harx-500" />
            </div>
            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Skills & Requirements</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Technical Skills */}
            {data.skills.technical && data.skills.technical.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-500 uppercase">Technical</h3>
                {data.skills.technical.map((s, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">{skillsLoading ? 'Loading...' : getSkillName(s.skill, 'technical')}</span>
                  </div>
                ))}
              </div>
            )}
            {/* Professional Skills */}
            {data.skills.professional && data.skills.professional.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-500 uppercase">Professional</h3>
                {data.skills.professional.map((s, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">{skillsLoading ? 'Loading...' : getSkillName(s.skill, 'professional')}</span>
                  </div>
                ))}
              </div>
            )}
            {/* Soft Skills */}
            {data.skills.soft && data.skills.soft.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-500 uppercase">Soft</h3>
                {data.skills.soft.map((s, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">{skillsLoading ? 'Loading...' : getSkillName(s.skill, 'soft')}</span>
                  </div>
                ))}
              </div>
            )}
            {/* Languages */}
            {data.skills.languages && data.skills.languages.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-500 uppercase">Languages</h3>
                {data.skills.languages.map((lang, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">{getLanguageName(lang.language)} ({lang.proficiency})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
