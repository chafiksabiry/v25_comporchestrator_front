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
  /** When set (e.g. embedded in Company Onboarding), called instead of full page navigation to /app11 */
  onPublishSuccess?: () => void | Promise<void>;
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
        const gigUrl = `company#/gigs/${editGigId}`;
        console.log('Redirecting to:', gigUrl);
        window.location.href = gigUrl;
      } else if (onPublishSuccess) {
        await onPublishSuccess();
      } else {
        window.location.href = "/app11";
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
        <button
          onClick={() => onEdit(section)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-harx hover:opacity-90 text-white rounded-lg text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <Edit3 className="w-4 h-4" />
          Edit
        </button>
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
    <div className="min-h-screen w-full h-full bg-gradient-to-br from-white via-harx-50/30 to-harx-alt-50/30 flex items-center justify-center">
      <div className="w-full h-full px-8 py-6 max-w-7xl mx-auto">

        {/* Page Header with Title and Description */}
        <div className="mb-8">

          <div className="flex items-center justify-between mb-6">
            <div className="flex gap-3">
              <button
                onClick={onBack}
                className="px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white rounded-lg font-semibold transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-2"
              >
                ← Previous
              </button>

            </div>
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
          </div>
        </div>


        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Enhanced Basic Information */}
            {renderEditableSection(
              "Basic Information",
              "basic",
              <Briefcase className="w-6 h-6 text-gray-600" />,
              <div className="space-y-6">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-4 leading-tight">
                    {data?.title || 'No title provided'}
                  </h1>
                  <p className="text-gray-700 text-lg leading-relaxed mb-6">{data?.description || 'No description provided'}</p>

                  <div className="flex flex-wrap gap-3 mb-6">
                    {data?.category && (
                      <span className="px-4 py-2 bg-harx-500/10 text-harx-500 rounded-full text-sm font-semibold border border-harx-500/30">
                        {data.category}
                      </span>
                    )}
                    {data?.seniority?.level && (
                      <span className="px-4 py-2 bg-harx-alt-500/10 text-harx-alt-500 rounded-full text-sm font-semibold border border-harx-alt-500/30">
                        {data.seniority.level}
                      </span>
                    )}
                    {data?.seniority?.yearsExperience && (
                      <span className="px-4 py-2 bg-harx-alt-500/10 text-harx-alt-500 rounded-full text-sm font-semibold border border-harx-alt-500/30">
                        {data.seniority.yearsExperience} Years Experience
                      </span>
                    )}
                    {/* Gig Status display removed */}
                  </div>

                  {/* Industries Section */}
                  {data?.industries && data.industries.length > 0 && (
                    <div className="mb-6">
                      <div className="bg-gradient-to-r from-harx-50 to-harx-alt-50 rounded-xl p-4 border border-harx-100">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-harx-100 rounded-lg">
                            <Target className="w-5 h-5 text-harx-500" />
                          </div>
                          <div>
                            <h3 className="text-lg font-medium text-harx-900">Industries</h3>
                            <p className="text-sm text-harx-700">Relevant industries for this position</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {data.industries.map((industry, index) => {
                            const industryName = getIndustryNameById(industry);
                            return industryName ? (
                              <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-harx-100 text-harx-700 text-sm rounded-full border border-harx-200">
                                {industryName}
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Additional Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {data?.destination_zone && (
                    <div className="bg-gradient-to-br from-harx-500/5 to-harx-alt-500/5 rounded-lg p-4 border border-harx-500/20">
                      <div className="flex items-center gap-3 mb-2">
                        <MapPin className="w-5 h-5 text-harx-500" />
                        <h3 className="font-semibold text-harx-500">Destination Zone</h3>
                      </div>
                      <p className="text-gray-700">{destinationZoneName}</p>
                      {/* Show selected schedule time zones if available */}
                      {/* {scheduleTimeZoneNames.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="text-xs text-gray-500">Schedule Time Zones:</span>
                          {scheduleTimeZoneNames.map((name, idx) => (
                            <span key={idx} className="px-2 py-1 bg-gradient-to-r from-[#764ba2]/20 to-[#764ba2]/30 text-[#764ba2] rounded text-xs font-medium border border-[#764ba2]/30">{name}</span>
                          ))}
                        </div>
                      )} */}
                    </div>
                  )}

                  {data?.companyId && (
                    <div className="bg-gradient-to-br from-harx-alt-500/5 to-pink-500/5 rounded-lg p-4 border border-harx-alt-500/20">
                      <div className="flex items-center gap-3 mb-2">
                        <Building className="w-5 h-5 text-harx-alt-500" />
                        <h3 className="font-semibold text-harx-alt-500">Company</h3>
                      </div>
                      <p className="text-gray-700">{getCompanyName(data.companyId)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Enhanced Commission Structure */}
            {data?.commission && renderEditableSection(
              "Commission Structure",
              "commission",
              <DollarSign className="w-6 h-6 text-gray-600" />,
              <div className="space-y-8">

                <div className="bg-gradient-to-r from-harx-50/50 to-harx-alt-50/50 rounded-xl p-6 border border-harx-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">

                    {/* Per call compensation */}
                    <div className="flex items-center justify-between p-3 bg-white/60 rounded-lg border border-harx-100/50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-harx-100 rounded-lg text-harx-600">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        </div>
                        <span className="text-gray-600 font-medium">Per call compensation</span>
                      </div>
                      <span className="font-bold text-gray-900">
                        {data.commission.commission_per_call || 0}
                        <span className="ml-1 text-gray-500 text-sm">
                          {getCurrencySymbol()}
                        </span>
                      </span>
                    </div>

                    {/* Transaction Commission */}
                    <div className="flex items-center justify-between p-3 bg-white/60 rounded-lg border border-harx-alt-100/50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-harx-alt-100 rounded-lg text-harx-alt-600">
                          <Coins className="w-5 h-5" />
                        </div>
                        <span className="text-gray-600 font-medium">Transaction Commission</span>
                      </div>
                      <span className="font-bold text-gray-900">
                        {data.commission.transactionCommission || 0}
                        <span className="ml-1 text-gray-500 text-sm">
                          {getCurrencySymbol()}
                        </span>
                      </span>
                    </div>

                    {/* Bonus & Incentives */}
                    <div className="flex items-center justify-between p-3 bg-white/60 rounded-lg border border-harx-100/50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-harx-100 rounded-lg text-harx-600">
                          <Star className="w-5 h-5" />
                        </div>
                        <span className="text-gray-600 font-medium">Bonus & Incentives</span>
                      </div>
                      <span className="font-bold text-gray-900">
                        {data.commission.bonusAmount || 0}
                        <span className="ml-1 text-gray-500 text-sm">
                          {getCurrencySymbol()}
                        </span>
                      </span>
                    </div>

                    {/* Minimum Volume Requirements */}
                    <div className="flex items-center justify-between p-3 bg-white/60 rounded-lg border border-harx-alt-100/50 col-span-1 md:col-span-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-harx-alt-100 rounded-lg text-harx-alt-600">
                          <Target className="w-5 h-5" />
                        </div>
                        <span className="text-gray-600 font-medium">Minimum Volume Requirements</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 text-lg">
                          {data?.commission?.minimumVolume?.amount || 0}
                        </span>
                        <span className="text-gray-500 text-sm bg-gray-100 px-2 py-0.5 rounded">
                          {data?.commission?.minimumVolume?.period || 'Period'}
                        </span>
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            )}

            {/* Enhanced Schedule */}
            {data?.schedule && renderEditableSection(
              "Schedule & Availability",
              "schedule",
              <Calendar className="w-6 h-6 text-gray-600" />,
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {data.schedule.schedules && data.schedule.schedules.length > 0 && (
                    <>
                      <div className="bg-harx-500/5 rounded-xl p-6 border border-harx-500/30">
                        <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-harx mb-4 flex items-center gap-3">
                          <Calendar className="w-6 h-6 text-harx-500" />
                          Working Days
                        </h3>
                        <div className="space-y-4">
                          {groupSchedules(data.schedule.schedules).map((group, index) => (
                            <div
                              key={`${group.hours.start}-${group.hours.end}-${index}`}
                              className="bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-sm border border-white/20"
                            >
                              <div className="flex flex-wrap gap-2 mb-3">
                                {group.days.map((day, dayIndex) => (
                                  <span
                                    key={dayIndex}
                                    className="px-3 py-1 bg-harx-500/10 text-harx-500 rounded-full text-sm font-semibold border border-harx-500/30"
                                  >
                                    {day}
                                  </span>
                                ))}
                              </div>
                              <div className="flex items-center gap-2 text-harx-500 font-semibold">
                                <Clock className="w-4 h-4" />
                                {group.hours.start} - {group.hours.end}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* {data.schedule.timeZones && data.schedule.timeZones.length > 0 && (
                  <div className="bg-gradient-to-r from-[#764ba2]/10 to-[#764ba2]/20 rounded-xl p-6 border border-[#764ba2]/30">
                    <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#764ba2] to-[#f093fb] mb-4 flex items-center gap-3">
                      <Globe2 className="w-6 h-6 text-[#764ba2]" />
                      Time Zones
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {data.schedule.timeZones.map((zone) => (
                        <span
                          key={zone}
                          className="px-4 py-2 bg-gradient-to-r from-[#764ba2]/20 to-[#764ba2]/30 text-[#764ba2] rounded-full text-sm font-semibold border border-[#764ba2]/30"
                        >
                          {getTimeZoneName(zone)}
                        </span>
                      ))}
                    </div>
                  </div>
                )} */}

                {data.schedule.flexibility && data.schedule.flexibility.length > 0 && (
                  <div className="bg-harx-alt-500/5 rounded-xl p-6 border border-harx-alt-500/30">
                    <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-harx-alt-500 to-pink-500 mb-4 flex items-center gap-3">
                      <Clock className="w-6 h-6 text-harx-alt-500" />
                      Flexibility Options
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {data.schedule.flexibility.map((option) => (
                        <span
                          key={option}
                          className="px-4 py-2 bg-harx-alt-500/10 text-harx-alt-500 rounded-full text-sm font-semibold border border-harx-alt-500/30"
                        >
                          {option}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column - Enhanced Sidebar */}
          <div className="space-y-8">
            {/* Enhanced Skills Summary */}
            {renderEditableSection(
              "Skills & Qualifications",
              "skills",
              <Award className="w-6 h-6 text-gray-600" />,
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-harx-500/5 to-harx-alt-500/5 rounded-lg p-4 border border-harx-500/20">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Languages className="w-5 h-5 text-harx-500" />
                        <span className="text-sm font-semibold text-harx-500">Languages:</span>
                      </div>
                      <span className="px-3 py-1 bg-harx-500/10 text-harx-500 rounded-full text-sm font-semibold border border-harx-500/30">
                        {data.skills?.languages?.length || 0}
                      </span>
                    </div>
                    {data.skills?.languages && data.skills.languages.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {data.skills.languages.map((lang, index) => (
                          <span key={index} className="px-2 py-1 bg-harx-500/10 text-harx-500 rounded text-xs font-medium border border-harx-500/30">
                            {getLanguageName(lang.language)} ({lang.proficiency})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
                {/* Actual skill names for each category */}
                <div className="space-y-4">
                  {/* Technical Skills */}
                  {data.skills?.technical && data.skills.technical.length > 0 && (
                    <div>
                      <div className="font-semibold text-harx-500 mb-1">Technical Skills:</div>
                      <ul className="flex flex-wrap gap-2">
                        {data.skills.technical.map((s, i) => (
                          <li key={i} className="px-3 py-1 bg-harx-500/10 text-harx-500 rounded text-sm">
                            {skillsLoading ? 'Loading...' : getSkillName(s.skill, 'technical')}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {/* Professional Skills */}
                  {data.skills?.professional && data.skills.professional.length > 0 && (
                    <div>
                      <div className="font-semibold text-harx-alt-500 mb-1">Professional Skills:</div>
                      <ul className="flex flex-wrap gap-2">
                        {data.skills.professional.map((s, i) => (
                          <li key={i} className="px-3 py-1 bg-harx-alt-500/10 text-harx-alt-500 rounded text-sm">
                            {skillsLoading ? 'Loading...' : getSkillName(s.skill, 'professional')}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {/* Soft Skills */}
                  {data.skills?.soft && data.skills.soft.length > 0 && (
                    <div>
                      <div className="font-semibold text-harx-alt-500 mb-1">Soft Skills:</div>
                      <ul className="flex flex-wrap gap-2">
                        {data.skills.soft.map((s, i) => (
                          <li key={i} className="px-3 py-1 bg-harx-alt-500/10 text-harx-alt-500 rounded text-sm">
                            {skillsLoading ? 'Loading...' : getSkillName(s.skill, 'soft')}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {/* Certifications section removed - no longer part of skills structure */}
                </div>
              </div>
            )}

            {/* Enhanced Team Structure */}
            {data.team && renderEditableSection(
              "Team Structure",
              "team",
              <Users className="w-6 h-6 text-gray-600" />,
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-harx-500/5 to-harx-alt-500/10 rounded-lg p-6 text-center border border-harx-500/30">
                  <Users className="w-10 h-10 text-harx-500 mx-auto mb-3" />
                  <div className="text-3xl font-bold text-gray-900 mb-2">{data.team.size}</div>
                  <div className="text-base text-gray-600 font-semibold">Team Members</div>
                </div>

                {data.team.structure && data.team.structure.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-harx mb-4 flex items-center gap-2">
                      <Target className="w-5 h-5 text-harx-500" />
                      Team Roles
                    </h3>
                    <div className="space-y-3">
                      {data.team.structure.map((role, index) => {
                        const roleInfo = predefinedOptions.team.roles.find(r => r.id === role.roleId);
                        return (
                          <div key={index} className="bg-gradient-to-br from-harx-500/5 to-harx-alt-500/5 rounded-lg p-4 border border-harx-500/20">
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-semibold text-gray-900">
                                {roleInfo ? roleInfo.name : role.roleId}
                              </div>
                              <div className="text-sm text-gray-600 font-semibold">
                                Count: {role.count}
                              </div>
                            </div>
                            <div className="text-sm text-gray-600 mb-2">
                              {roleInfo ? roleInfo.description : ''}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-600">
                              <span className="font-semibold">Seniority:</span> {role.seniority.level}
                              <span className="font-semibold">Experience:</span> {role.seniority.yearsExperience} years
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}


          </div>
        </div>
      </div>
    </div>
  );
}
