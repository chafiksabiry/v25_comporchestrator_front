import React, { useState, useEffect } from 'react';
import {
    Users,
    Briefcase,
    Zap
} from 'lucide-react';
import {
    Rep,
    Gig,
    Match,
    MatchingWeights
} from '../types/matching';
import {
    getReps,
    getGigs,
    getGigsByCompanyId,
    findMatchesForGig,
    createGigAgent,
    getGigAgentsForGig,
    getInvitedAgentsForCompany,
    getEnrollmentRequestsForCompany,
    getActiveAgentsForCompany,
    acceptEnrollmentRequest,
    rejectEnrollmentRequest,
    getAllSkills,
    getLanguages,
    getGigWeights,
    Skill,
    Language
} from '../api/matching';
import Cookies from 'js-cookie';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import RepProfileView from './RepProfileView';
import { connectCompanyEnrollmentRequestsSocket } from '../lib/enrollmentRequestsSocket';
import { playNotificationSound } from '../utils/notificationSound';

export type MatchingDashboardProps = {
  /** When embedded in Company Onboarding (step 13), closes the step — tab is already company-onboarding. */
  onBackToOnboarding?: () => void | Promise<void>;
};

export const MatchingDashboard = ({ onBackToOnboarding }: MatchingDashboardProps = {}) => {
    const { t } = useTranslation();
    const onBackToOnboardingRef = React.useRef(onBackToOnboarding);
    onBackToOnboardingRef.current = onBackToOnboarding;
    const [reps, setReps] = useState<Rep[]>([]);
    const [gigs, setGigs] = useState<Gig[]>([]);
    const [selectedGig, setSelectedGig] = useState<Gig | null>(null);
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [weights, setWeights] = useState<MatchingWeights>({
        experience: 0,
        skills: 0,
        industry: 0,
        languages: 0,
        availability: 0,
        timezone: 0,
        activities: 0,
        region: 0,
    });
    const [error, setError] = useState<string | null>(null);
    const [invitedAgents, setInvitedAgents] = useState<Set<string>>(new Set());
    const [companyInvitedAgents, setCompanyInvitedAgents] = useState<any[]>([]);
    const [creatingGigAgent, setCreatingGigAgent] = useState(false);
    const [gigAgentSuccess, setGigAgentSuccess] = useState<string | null>(null);
    const [gigAgentError, setGigAgentError] = useState<string | null>(null);
    const [skills, setSkills] = useState<{
        professional: Skill[];
        technical: Skill[];
        soft: Skill[];
    }>({ professional: [], technical: [], soft: [] });
    const [languages, setLanguages] = useState<Language[]>([]);
    const [activeSection, setActiveSection] = useState<'matching' | 'invited' | 'enrollment' | 'active'>('matching');
    const [expandedReps, setExpandedReps] = useState<Set<string>>(new Set());
    const [expandedGigs, setExpandedGigs] = useState<Set<string>>(new Set());
    const [invitedAgentsList, setInvitedAgentsList] = useState<any[]>([]);
    const [enrollmentRequests, setEnrollmentRequests] = useState<any[]>([]);
    const [activeAgentsList, setActiveAgentsList] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [leftColumnWidth, setLeftColumnWidth] = useState<number>(25); // percentage
    const [isResizing, setIsResizing] = useState<boolean>(false);
    
    const [selectedAgentProfile, setSelectedAgentProfile] = useState<any>(null);
    const [loadingProfile, setLoadingProfile] = useState(false);

    const handleAgentClick = async (agentId: string) => {
        try {
            setLoadingProfile(true);
            const REP_API_URL = 'https://v25repscreationwizardbackend-production.up.railway.app/api';
            const token = localStorage.getItem('token');
            const response = await fetch(`${REP_API_URL}/profiles/${agentId}`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            if (!response.ok) {
                throw new Error('Failed to fetch profile');
            }
            const data = await response.json();
            setSelectedAgentProfile(data);
        } catch (err) {
            console.error('Error fetching profile:', err);
            alert('Impossible de charger le profil de l\'agent.');
        } finally {
            setLoadingProfile(false);
        }
    };

    // Handle column resizing
    const handleMouseDown = (e: React.MouseEvent) => {
        setIsResizing(true);
        e.preventDefault();
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isResizing) return;

        const container = document.querySelector('.resizable-container');
        if (!container) return;

        const containerRect = container.getBoundingClientRect();
        const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

        // Limit width between 20% and 50% to prevent overflow
        const clampedWidth = Math.max(20, Math.min(50, newWidth));
        setLeftColumnWidth(clampedWidth);
    };

    const handleMouseUp = () => {
        setIsResizing(false);
    };

    // Add event listeners for resizing
    React.useEffect(() => {
        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    // Filter functions

    const filteredMatches = matches.filter((match: { agentInfo: { name: string; email: string; personalInfo: { name: string; email: string; }; }; }) =>
        match.agentInfo?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        match.agentInfo?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        match.agentInfo?.personalInfo?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        match.agentInfo?.personalInfo?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Fetch data from real backend

    // Refetch the company's invited / requested / active lists (used by the
    // live WebSocket so the "requests" panel updates without a page reload).
    const refreshCompanyLists = React.useCallback(async () => {
        const companyId = Cookies.get('companyId') || '685abf28641398dc582f4c95';
        if (!companyId) return;
        try {
            const [invitedAgentsData, enrollmentRequestsData, activeAgentsData] = await Promise.all([
                getInvitedAgentsForCompany(companyId),
                getEnrollmentRequestsForCompany(companyId),
                getActiveAgentsForCompany(companyId)
            ]);
            setCompanyInvitedAgents(invitedAgentsData);
            setEnrollmentRequests(enrollmentRequestsData);
            setActiveAgentsList(activeAgentsData);
        } catch (error) {
            console.error('Error refreshing company lists:', error);
        }
    }, []);

    // Live updates: a rep applied to one of this company's gigs → refresh the
    // "requests" list in real time (and on reconnect to catch missed events).
    useEffect(() => {
        const companyId = Cookies.get('companyId') || '685abf28641398dc582f4c95';
        const dispose = connectCompanyEnrollmentRequestsSocket(
            (data) => {
                // New application from a rep → play the notification chime.
                if (data?.type === 'request_received') {
                    playNotificationSound();
                }
                void refreshCompanyLists();
            },
            { companyId, onConnect: () => { void refreshCompanyLists(); } }
        );
        return dispose;
    }, [refreshCompanyLists]);

    useEffect(() => {
        const fetchData = async () => {
            setInitialLoading(true);
            setError(null);

            try {
                

                const companyId = Cookies.get('companyId') || '685abf28641398dc582f4c95';

                // Load essential data first
                const [gigsData, invitedAgentsData, enrollmentRequestsData, activeAgentsData] = await Promise.all([
                    companyId ? getGigsByCompanyId(companyId) : getGigs(),
                    getInvitedAgentsForCompany(companyId),
                    getEnrollmentRequestsForCompany(companyId),
                    getActiveAgentsForCompany(companyId)
                ]);

                // Set essential data
                setGigs(gigsData);
                setCompanyInvitedAgents(invitedAgentsData);
                setEnrollmentRequests(enrollmentRequestsData);
                setActiveAgentsList(activeAgentsData);

                // Then load secondary data
                const [representativesData, skillsData, languagesData] = await Promise.all([
                    getReps(),
                    getAllSkills(),
                    getLanguages()
                ]);

                // Set secondary data
                setReps(representativesData);
                setSkills(skillsData);
                setLanguages(languagesData);

                
                
                
                

            } catch (error) {
                console.error("Error fetching data:", error);
                setError("Failed to fetch data. Please try again.");
            } finally {
                setInitialLoading(false);
            }
        };

        fetchData();

        // Embedded in onboarding: parent must clear activeStep. Standalone Matching tab: tabChange only.
        window.dispatchEvent(new CustomEvent('setGlobalBack', {
            detail: {
                label: 'Back to Onboarding',
                action: () => {
                    void onBackToOnboardingRef.current?.();
                    localStorage.setItem('activeTab', 'company-onboarding');
                    window.dispatchEvent(
                        new CustomEvent('tabChange', { detail: { tab: 'company-onboarding' } })
                    );
                }
            }
        }));

        return () => {
            window.dispatchEvent(new CustomEvent('setGlobalBack', { detail: null }));
        };
    }, []);

    // Restore selected gig from localStorage when gigs are available
    useEffect(() => {
        const savedGigId = localStorage.getItem('selectedGigId');
        if (savedGigId && gigs.length > 0 && !selectedGig) {
            
            const savedGig = gigs.find((g: Gig) => g._id === savedGigId);
            if (savedGig) {
                handleGigSelect(savedGig);
            }
        }
    }, [gigs]);

    // Update agent lists when data changes
    useEffect(() => {
        // Skip if no data yet
        if (!companyInvitedAgents || !enrollmentRequests || !activeAgentsList) return;

        
        
        

        // Directly set the lists without filtering again
        setInvitedAgentsList(companyInvitedAgents.filter((agent: { isActive: any; hasCompletedOnboarding: any; }) => !agent.isActive && !agent.hasCompletedOnboarding));
        setEnrollmentRequests(enrollmentRequests);
        // Active agents come directly from the API endpoint
        
    }, [companyInvitedAgents, enrollmentRequests, activeAgentsList]);

    const handleGigSelect = async (gig: Gig) => {
        
        setSelectedGig(gig);
        if (gig._id) {
            localStorage.setItem('selectedGigId', gig._id);
        }
        setLoading(true);
        setError(null);
        setMatches([]);
        setSearchTerm(''); // Clear search when selecting a new gig

        let currentWeights = weights;

        try {
            // Try to load saved weights for this gig
            try {
                const savedWeights = await getGigWeights(gig._id || '');
                setWeights(savedWeights.matchingWeights);
                currentWeights = savedWeights.matchingWeights;
                
            } catch (error: any) {
                // Handle different types of errors more gracefully
                if (error.message?.includes('No saved weights found')) {
                    
                } else if (error.message?.includes('Failed to fetch')) {
                    console.warn('⚠️ Network error loading weights for gig:', gig._id, '- Using current weights');
                } else {
                    console.error('❌ Unexpected error loading weights for gig:', gig._id, error);
                }
                // Keep current weights
            }

            // Fetch invited reps for this gig
            const gigAgents = await getGigAgentsForGig(gig._id || '');
            const invitedAgentIds = new Set<string>(gigAgents.map((ga: any) => ga.agentId as string));
            setInvitedAgents(invitedAgentIds);
            

            // Find matches for the selected gig using current or loaded weights
            
            

            let matchesData;
            try {
                matchesData = await findMatchesForGig(gig._id || '', currentWeights);
                
            } catch (error: any) {
                console.error("❌ Error finding matches for gig:", error);

                // Provide user-friendly error message
                if (error.message?.includes('Failed to fetch')) {
                    console.error("🌐 Network error: Unable to connect to matching service");
                } else if (error.message?.includes('500')) {
                    console.error("🔧 Server error: Matching service encountered an internal error");
                } else {
                    console.error("❓ Unexpected error:", error.message);
                }

                // Set empty matches data to prevent crashes
                matchesData = {
                    preferedmatches: [],
                    totalMatches: 0,
                    perfectMatches: 0,
                    partialMatches: 0,
                    noMatches: 0
                };
            }

            // Debug first match score calculation
            if (matchesData.preferedmatches && matchesData.preferedmatches.length > 0) {
                const firstMatch = matchesData.preferedmatches[0];
                
                
                
                
                
                
                
                
                
                
                

                const calculatedTotal =
                    (firstMatch.skillsMatch?.score || 0) * currentWeights.skills +
                    (firstMatch.languageMatch?.score || 0) * currentWeights.languages +
                    (firstMatch.industryMatch?.score || 0) * currentWeights.industry +
                    (firstMatch.activityMatch?.score || 0) * currentWeights.activities +
                    (firstMatch.experienceMatch?.score || 0) * currentWeights.experience +
                    (firstMatch.timezoneMatch?.score || 0) * currentWeights.timezone +
                    (firstMatch.regionMatch?.score || 0) * currentWeights.region +
                    (firstMatch.availabilityMatch?.score || 0) * currentWeights.availability;

                
                
                
            }

            setMatches(matchesData.preferedmatches || matchesData.matches || []);

            // Organize agents by status after fetching matches
            setTimeout(() => organizeAgentsByStatus(), 100);

        } catch (error) {
            console.error("Error getting matches:", error);
            setError("Failed to get matches. Please try again.");
            setMatches([]);
        } finally {
            setLoading(false);
        }
    };

    // Handle creating gig-rep (inviting rep to gig)
    const handleCreateGigAgent = async (match: Match) => {
        const companyId = Cookies.get('companyId') || '685abf28641398dc582f4c95';

        if (!selectedGig) {
            setGigAgentError("No gig selected");
            return;
        }

        setCreatingGigAgent(true);
        setGigAgentError(null);
        setGigAgentSuccess(null);

        

        // Send only the essential IDs to avoid any object processing errors
        const requestData = {
            agentId: match.agentId,
            gigId: selectedGig._id || ''
            // Removed matchDetails completely to avoid backend language processing
        };

        

        try {
            const response = await createGigAgent(requestData);
            

            // Update onboarding progress - Phase 4, Step 10 (MATCH HARX REPS)
            // When at least one invitation is sent, mark the step as completed
            if (companyId) {
                try {
                    const onboardingApiUrl = import.meta.env.VITE_COMPANY_API_URL || 'https://v25searchcompanywizardbackend-production.up.railway.app/api';
                    await axios.put(
                        `${onboardingApiUrl}/onboarding/companies/${companyId}/onboarding/phases/4/steps/13`,
                        { status: 'completed' }
                    );
                    window.dispatchEvent(new CustomEvent('stepCompleted', {
                        detail: { stepId: 13, phaseId: 4, status: 'completed' }
                    }));
                } catch (onboardingError) {
                    console.error('Error updating onboarding progress:', onboardingError);
                }
            }

            // Add rep to invited list
            setInvitedAgents((prev: any) => new Set([...prev, match.agentId]));

            // Update the match object to mark it as invited
            setMatches((prevMatches: Match[]) =>
                prevMatches.map((m: Match) =>
                    m.agentId === match.agentId
                        ? { ...m, isInvited: true }
                        : m
                )
            );

            setGigAgentSuccess(`Successfully invited ${match.agentInfo?.name} to ${selectedGig.title}`);

            // Clear success message after 3 seconds
            setTimeout(() => {
                setGigAgentSuccess(null);
            }, 3000);

            // Refresh only essential data
            // companyId is already declared at the top of this function

            // Fetch only what we need
            const [invitedAgentsData, enrollmentRequestsData, activeAgentsData] = await Promise.all([
                getInvitedAgentsForCompany(companyId),
                getEnrollmentRequestsForCompany(companyId),
                getActiveAgentsForCompany(companyId)
            ]);

            // Update essential state
            setCompanyInvitedAgents(invitedAgentsData);
            setEnrollmentRequests(enrollmentRequestsData);
            setActiveAgentsList(activeAgentsData);

            // If a gig is selected, refresh its matches
            if (selectedGig) {
                const matchesData = await findMatchesForGig(selectedGig._id || '', weights);
                setMatches(matchesData.preferedmatches || matchesData.matches || []);
            }

        } catch (error) {
            console.error('Error creating gig-rep:', error);
            setGigAgentError('Failed to invite rep to gig. Please try again.');
        } finally {
            setCreatingGigAgent(false);
        }
    };

    // Helper functions to organize reps by status
    const organizeAgentsByStatus = () => {
        
        
        

        // Use company invited reps from API endpoint
        const invited = companyInvitedAgents.filter((agent: { isActive: any; hasCompletedOnboarding: any; personalInfo: { name: any; }; status: any; }) => {
            // Show all reps who are not yet active, regardless of their status
            const isInvited = !agent.isActive &&
                !agent.hasCompletedOnboarding;

            

            return isInvited;
        });

        // Use enrollment requests from API endpoint
        const enrollmentReqs = enrollmentRequests;
        

        // Use active reps from API endpoint
        const active = activeAgentsList;
        

        
        
        
        

        setInvitedAgentsList(invited);
        setEnrollmentRequests(enrollmentReqs);
        setActiveAgentsList(active);
    };

    // Helper functions to get skill and language names
    const getSkillNameById = (skillId: string | any, skillType: 'professional' | 'technical' | 'soft') => {
        if (!skillId) return 'Unknown Skill';

        // If it's already an object with name, return the name
        if (typeof skillId === 'object' && skillId.name) {
            return skillId.name;
        }

        // Convert to string if it's an ObjectId
        const idString = typeof skillId === 'string' ? skillId : skillId.toString();

        // Don't display ObjectIds
        if (idString.match(/^[0-9a-fA-F]{24}$/)) {
            const skillArray = skills[skillType];
            const skill = skillArray.find((s: { _id: any; }) => s._id === idString);
            return skill ? skill.name : `${skillType.charAt(0).toUpperCase() + skillType.slice(1)} Skill`;
        }

        return idString;
    };

    const getLanguageNameByCode = (languageCode: string | any) => {
        if (!languageCode) return 'Unknown Language';

        // If it's already an object with name, return the name
        if (typeof languageCode === 'object' && languageCode.name) {
            return languageCode.name;
        }

        // Convert to string if it's an ObjectId
        const codeString = typeof languageCode === 'string' ? languageCode : languageCode.toString();

        // Don't display ObjectIds
        if (codeString.match(/^[0-9a-fA-F]{24}$/)) {
            let language = languages.find((l: { _id: any; }) => l._id === codeString);
            if (language) return language.name;
            return 'Language';
        }

        // Try to find by code
        let language = languages.find((l: { code: any; }) => l.code === codeString);

        if (!language) {
            language = languages.find((l: { _id: any; }) => l._id === codeString);
        }

        if (!language) {
            language = languages.find((l: { name: string; }) => l.name?.toLowerCase() === codeString.toLowerCase());
        }

        return language ? language.name : codeString;
    };

    // Toggle rep details expansion
    const toggleRepDetails = (agentId: string) => {
        setExpandedReps((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(agentId)) {
                newSet.delete(agentId);
            } else {
                newSet.add(agentId);
            }
            return newSet;
        });
    };

    // Toggle gig details expansion
    const toggleGigDetails = (gigId: string) => {
        setExpandedGigs((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(gigId)) {
                newSet.delete(gigId);
            } else {
                newSet.add(gigId);
            }
            return newSet;
        });
    };
    return (
        <div className="min-h-full w-full max-w-full overflow-visible text-slate-900 flex flex-col rounded-3xl bg-gradient-rep-page">
            {loadingProfile && !selectedAgentProfile && (
                <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-slate-900/30 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl px-8 py-6 flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
                        <p className="text-sm font-medium text-slate-600">{t('matchingDashboard.enrollment.viewProfile')}…</p>
                    </div>
                </div>
            )}
            {selectedAgentProfile ? (
                <div className="w-full p-4">
                    <RepProfileView
                        profile={selectedAgentProfile}
                        onClose={() => setSelectedAgentProfile(null)}
                    />
                </div>
            ) : (
                <>
                    {/* Header with Navigation Tabs */}
                    <header className="bg-gradient-rep-header border-b border-indigo-100/80 shadow-sm rounded-t-3xl">
                {/* Top Header */}
                <div className="container mx-auto px-4 py-5">
                    <div className="flex justify-between items-center gap-4">
                        <div className="flex items-center space-x-3">
                            <div className="p-2.5 bg-gradient-rep-accent rounded-xl shadow-sm shadow-indigo-200/50">
                                <Users size={22} className="text-white" />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-lg sm:text-2xl font-bold text-slate-800 leading-tight">{t('matchingDashboard.header.title')}</h1>
                                <p className="text-slate-500 text-xs sm:text-sm">{t('matchingDashboard.header.subtitle')}</p>
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="hidden lg:flex items-center gap-3">
                            {[
                                { value: reps.length, label: t('matchingDashboard.header.totalReps'), accent: 'text-slate-800 bg-white border-slate-200' },
                                { value: invitedAgentsList.length, label: t('matchingDashboard.header.invited'), accent: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
                                { value: enrollmentRequests.length, label: t('matchingDashboard.header.requests'), accent: 'text-sky-700 bg-sky-50 border-sky-100' },
                                { value: activeAgentsList.length, label: t('matchingDashboard.header.active'), accent: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
                            ].map((stat) => (
                                <div key={stat.label} className={`text-center px-4 py-2 rounded-xl border shadow-sm ${stat.accent}`}>
                                    <div className="font-bold text-lg leading-none">{stat.value}</div>
                                    <div className="text-[11px] font-medium opacity-80 mt-1">{stat.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="border-t border-indigo-100/60 bg-white/40">
                    <div className="container mx-auto px-4">
                        <nav className="flex gap-1 sm:gap-2 py-2 overflow-x-auto">
                            {[
                                { id: 'matching', label: t('matchingDashboard.tabs.matching'), icon: '🎯', description: t('matchingDashboard.tabs.matchingDesc'), badge: 0 },
                                { id: 'invited', label: t('matchingDashboard.tabs.invited'), icon: '📧', description: t('matchingDashboard.tabs.invitedDesc'), badge: invitedAgentsList.length },
                                { id: 'enrollment', label: t('matchingDashboard.tabs.enrollment'), icon: '📋', description: t('matchingDashboard.tabs.enrollmentDesc'), badge: enrollmentRequests.length },
                                { id: 'active', label: t('matchingDashboard.tabs.active'), icon: '✅', description: t('matchingDashboard.tabs.activeDesc'), badge: 0 }
                            ].map(section => (
                                <button
                                    key={section.id}
                                    onClick={() => setActiveSection(section.id as any)}
                                    className={`flex-1 min-w-[120px] px-3 sm:px-4 py-3 text-center sm:text-left transition-all duration-200 rounded-xl border ${activeSection === section.id
                                        ? 'border-indigo-200 bg-white shadow-md shadow-indigo-100/50 text-indigo-700'
                                        : 'border-transparent hover:bg-white/70 text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    <div className="flex flex-col sm:flex-row items-center sm:space-x-3 gap-1 sm:gap-0">
                                        <span className="relative text-lg sm:text-xl">
                                            {section.icon}
                                            {section.badge > 0 && (
                                                <span className="absolute -top-2 -right-2.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-indigo-500 text-white text-[10px] font-bold leading-none ring-2 ring-white shadow-sm">
                                                    {section.badge > 99 ? '99+' : section.badge}
                                                </span>
                                            )}
                                        </span>
                                        <div className="min-w-0">
                                            <div className={`font-semibold text-xs sm:text-sm leading-tight ${activeSection === section.id ? 'text-indigo-700' : 'text-slate-600'}`}>
                                                {section.label}
                                            </div>
                                            <div className={`hidden md:block text-xs ${activeSection === section.id ? 'text-slate-500' : 'text-slate-400'}`}>{section.description}</div>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="p-4 sm:p-6 w-full max-w-full">

                {/* Error Message */}
                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl shadow-sm">
                        <p className="flex items-center">
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            {error}
                        </p>
                    </div>
                )}

                {/* Loading Indicators */}
                {initialLoading && (
                    <div className="flex justify-center items-center py-20">
                        <div className="relative">
                            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                                <Zap size={24} className="text-indigo-600 animate-pulse" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Section Content */}
                {!initialLoading && (
                    <>
                        {/* 1. SMART MATCHING SYSTEM */}
                        {activeSection === 'matching' && (
                            <div className="space-y-6">


                                {/* Two Column Layout: Gigs and Reps */}
                                <div className="resizable-container flex flex-col lg:flex-row gap-5 w-full max-w-full items-start">
                                    {/* Left Column: Gig Selection */}
                                    <div
                                        className="bg-white/90 rounded-2xl shadow-sm p-4 sm:p-5 transition-all duration-200 flex-shrink-0 border border-slate-200/80 flex flex-col max-lg:!w-full max-lg:!min-w-0 max-lg:!max-w-full"
                                        style={{ width: `${leftColumnWidth}%`, minWidth: '280px', maxWidth: '50%' }}
                                    >
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                                <div className="p-2 bg-indigo-50 rounded-lg">
                                                    <Briefcase size={18} className="text-indigo-500" />
                                                </div>
                                                <span>{t('matchingDashboard.matching.availableGigs')}</span>
                                            </h3>
                                            <span className="bg-indigo-50 text-indigo-600 py-1 px-2.5 rounded-full text-xs font-semibold border border-indigo-100">
                                                {gigs.length}
                                            </span>
                                        </div>

                                        <div className="space-y-2.5">
                                            {gigs.map((gig: Gig) => {
                                                const isGigExpanded = expandedGigs.has(gig._id || '');

                                                return (
                                                    <div key={gig._id} className={`group relative rounded-xl border transition-all duration-200 ${selectedGig?._id === gig._id
                                                        ? "border-indigo-300 bg-indigo-50/80 shadow-md ring-1 ring-indigo-200"
                                                        : "bg-slate-50/50 border-slate-200/80 hover:border-indigo-200 hover:bg-white hover:shadow-sm"
                                                        }`}>
                                                        {/* Gig Header - Clickable for selection */}
                                                        <div
                                                            className="cursor-pointer p-4"
                                                            onClick={() => handleGigSelect(gig)}
                                                        >
                                                            <div className="flex items-center space-x-3 mb-2">
                                                                <div className={`p-2 rounded-lg transition-colors duration-200 ${selectedGig?._id === gig._id
                                                                    ? "bg-gradient-rep-accent shadow-sm"
                                                                    : "bg-white group-hover:bg-indigo-50 border border-slate-100"
                                                                    }`}>
                                                                    <Briefcase size={16} className={`${selectedGig?._id === gig._id ? "text-white" : "text-indigo-500"}`} />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <h4 className={`font-semibold text-sm mb-0.5 ${selectedGig?._id === gig._id ? "text-indigo-800" : "text-slate-800"
                                                                        }`}>
                                                                        {gig.title}
                                                                    </h4>
                                                                    <p className={`text-xs truncate ${selectedGig?._id === gig._id ? "text-indigo-600/80" : "text-slate-500"}`}>{gig.companyName}</p>
                                                                </div>
                                                            </div>

                                                            {selectedGig?._id === gig._id && (
                                                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm">
                                                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* View Details Button */}
                                                        <div className="px-4 pb-4">
                                                            <button
                                                                onClick={(e: { stopPropagation: () => void; }) => {
                                                                    e.stopPropagation();
                                                                    toggleGigDetails(gig._id || '');
                                                                }}
                                                                className={`w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${selectedGig?._id === gig._id
                                                                    ? "bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                                                                    : "bg-white border border-slate-200 text-slate-600 hover:border-indigo-200 hover:text-indigo-600"}`}
                                                            >
                                                                <span>{t('matchingDashboard.matching.viewDetails')}</span>
                                                                <svg
                                                                    className={`w-4 h-4 transform transition-transform duration-200 ${isGigExpanded ? 'rotate-180' : ''}`}
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    viewBox="0 0 24 24"
                                                                >
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                                </svg>
                                                            </button>
                                                        </div>

                                                        {/* Expanded Details */}
                                                        {isGigExpanded && (
                                                            <div className="px-4 pb-4 border-t border-gray-200 bg-white overflow-hidden">
                                                                <div className="pt-4 space-y-4 text-sm overflow-hidden text-gray-800">

                                                                    {/* 1. Industries */}
                                                                    {gig.industries && gig.industries.length > 0 && (
                                                                        <div>
                                                                            <p className="text-gray-500 font-medium mb-2">{t('matchingDashboard.matching.industries')}</p>
                                                                            <div className="flex flex-wrap gap-1">
                                                                                {gig.industries.map((industry: any, i: number) => {
                                                                                    const displayName = industry.name ||
                                                                                        (typeof industry === 'string' && !industry.match(/^[0-9a-fA-F]{24}$/) ? industry : 'Industry');
                                                                                    return (
                                                                                        <span key={i} className="px-2 py-1 px-2.5 py-1 bg-indigo-50 text-indigo-600 border border-indigo-100/30 rounded-lg text-xs font-bold transition-all duration-200">
                                                                                            {displayName}
                                                                                        </span>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {/* 2. Activities */}
                                                                    {gig.activities && gig.activities.length > 0 && (
                                                                        <div>
                                                                            <p className="text-gray-500 font-medium mb-2">{t('matchingDashboard.matching.activities')}</p>
                                                                            <div className="flex flex-wrap gap-1">
                                                                                {gig.activities.map((activity: any, i: number) => {
                                                                                    const displayName = activity.name ||
                                                                                        (typeof activity === 'string' && !activity.match(/^[0-9a-fA-F]{24}$/) ? activity : 'Activity');
                                                                                    return (
                                                                                        <span key={i} className="px-2 py-1 px-2.5 py-1 bg-sky-50 text-sky-700 border border-sky-100/30 rounded-lg text-xs font-bold transition-all duration-200">
                                                                                            {displayName}
                                                                                        </span>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {/* 3. Experience */}
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-gray-500 font-medium">{t('matchingDashboard.matching.experience')}</span>
                                                                        <span className="font-semibold text-gray-900">{gig.seniority?.yearsExperience || 'N/A'} {t('matchingDashboard.matching.years')}</span>
                                                                    </div>

                                                                    {/* 4. Languages */}
                                                                    {gig.skills?.languages && gig.skills.languages.length > 0 && (
                                                                        <div>
                                                                            <p className="text-gray-500 font-medium mb-2">{t('matchingDashboard.matching.languages')}</p>
                                                                            <div className="flex flex-wrap gap-1">
                                                                                {gig.skills.languages.map((lang: any, i: number) => (
                                                                                    <span key={i} className="px-2 py-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200/30 rounded-lg text-xs font-bold">
                                                                                        {getLanguageNameByCode(lang.language || lang.iso639_1 || lang)}
                                                                                        {lang.proficiency && <span className="ml-1 text-purple-800">({lang.proficiency})</span>}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {/* 5. Availability */}
                                                                    {gig.availability && (
                                                                        <div>
                                                                            <span className="text-gray-500 font-medium">{t('matchingDashboard.matching.availability')}</span>
                                                                            <p className="font-semibold text-gray-900">
                                                                                {gig.availability.schedule ? `${gig.availability.schedule.length} ${t('matchingDashboard.matching.daysWeek')}` :
                                                                                    gig.availability.hoursPerWeek ? `${gig.availability.hoursPerWeek}${t('matchingDashboard.matching.hoursWeek')}` :
                                                                                        (gig.availability as any).workingHours && typeof (gig.availability as any).workingHours === 'string' ? (gig.availability as any).workingHours :
                                                                                            t('matchingDashboard.matching.flexible')}
                                                                            </p>
                                                                        </div>
                                                                    )}

                                                                    {/* 6. Skills - Professional */}
                                                                    {gig.skills?.professional && gig.skills.professional.length > 0 && (
                                                                        <div>
                                                                            <p className="text-gray-500 font-medium mb-2">{t('matchingDashboard.matching.professionalSkills')}</p>
                                                                            <div className="flex flex-wrap gap-1">
                                                                                {gig.skills.professional.map((skillItem: any, i: number) => (
                                                                                    <span key={`prof-${i}`} className="px-2 py-1 px-2.5 py-1 bg-indigo-50 text-indigo-600 border border-indigo-100/30 rounded-lg text-xs font-bold">
                                                                                        {getSkillNameById(skillItem.skill || skillItem, 'professional')}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {/* 6. Skills - Technical */}
                                                                    {gig.skills?.technical && gig.skills.technical.length > 0 && (
                                                                        <div>
                                                                            <p className="text-gray-500 font-medium mb-2">{t('matchingDashboard.matching.technicalSkills')}</p>
                                                                            <div className="flex flex-wrap gap-1">
                                                                                {gig.skills.technical.map((skillItem: any, i: number) => (
                                                                                    <span key={`tech-${i}`} className="px-2 py-1 px-2.5 py-1 bg-sky-50 text-sky-700 border border-sky-100/30 rounded-lg text-xs font-bold">
                                                                                        {getSkillNameById(skillItem.skill || skillItem, 'technical')}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {/* 6. Skills - Soft */}
                                                                    {gig.skills?.soft && gig.skills.soft.length > 0 && (
                                                                        <div>
                                                                            <p className="text-gray-500 font-medium mb-2">{t('matchingDashboard.matching.softSkills')}</p>
                                                                            <div className="flex flex-wrap gap-1">
                                                                                {gig.skills.soft.map((skillItem: any, i: number) => (
                                                                                    <span key={`soft-${i}`} className="px-2 py-1 px-2.5 py-1 bg-indigo-50 text-indigo-500 border border-indigo-100/30 rounded-lg text-xs font-bold">
                                                                                        {getSkillNameById(skillItem.skill || skillItem, 'soft')}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}


                                                                    {/* Region & Timezone */}
                                                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                                                        {gig.region && (
                                                                            <div>
                                                                                <span className="text-slate-500 font-medium">{t('matchingDashboard.matching.region')}</span>
                                                                                <p className="font-semibold text-slate-900">
                                                                                    {typeof gig.region === 'string' ? gig.region : (gig.region as any).name || t('matchingDashboard.matching.unknownRegion')}
                                                                                </p>
                                                                            </div>
                                                                        )}
                                                                        {gig.timezone && (
                                                                            <div>
                                                                                <span className="text-slate-500 font-medium">{t('matchingDashboard.matching.timezone')}</span>
                                                                                <p className="font-semibold text-slate-900">
                                                                                    {typeof gig.timezone === 'string'
                                                                                        ? gig.timezone
                                                                                        : (gig.timezone as any).name || (gig.timezone as any).timezoneName || t('matchingDashboard.matching.unknownTimezone')}
                                                                                </p>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Resize Handle */}
                                    <div
                                        className={`hidden lg:flex flex-shrink-0 w-1 bg-antigravity-border hover:bg-indigo-500 cursor-col-resize transition-colors duration-200 rounded-full items-center justify-center group ${isResizing ? 'bg-indigo-500' : ''}`}
                                        onMouseDown={handleMouseDown}
                                        title="Drag to resize"
                                    >
                                        <div className="w-0.5 h-8 bg-antigravity-muted group-hover:bg-white rounded-full transition-colors duration-200"></div>
                                    </div>

                                    {/* Right Column: Matching Results */}
                                    <div
                                        className="bg-white/90 rounded-2xl shadow-sm p-4 sm:p-5 transition-all duration-200 flex-1 min-w-0 w-full border border-slate-200/80 flex flex-col"
                                    >
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                                            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center space-x-2 min-w-0">
                                                        <Users size={20} className="text-indigo-500 shrink-0" />
                                                        <span className="truncate">{selectedGig ? `${t('matchingDashboard.matching.matchesFor')} "${selectedGig.title}"` : t('matchingDashboard.matching.selectGig')}</span>
                                                    </h3>
                                            
                                            {selectedGig && (
                                                <div className="relative w-full sm:w-64 sm:shrink-0">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                        </svg>
                                                    </div>
                                                    <input
                                                        type="text"
                                                        placeholder={t('matchingDashboard.matching.searchReps')}
                                                        value={searchTerm}
                                                        onChange={(e: any) => setSearchTerm(e.target.value)}
                                                        className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs text-slate-900 transition-all shadow-sm"
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            {!selectedGig ? (
                                            <div className="text-center py-12">
                                                <div className="bg-slate-50/50 rounded-xl p-8 max-w-md mx-auto border border-slate-200">
                                                    <Briefcase size={48} className="text-slate-500 mx-auto mb-4" />
                                                    <p className="text-slate-900 text-lg mb-2">{t('matchingDashboard.matching.noGigSelected')}</p>
                                                    <p className="text-sm text-slate-500">{t('matchingDashboard.matching.chooseGigDesc')}</p>
                                                </div>
                                            </div>
                                        ) : loading ? (
                                            <div className="flex justify-center items-center py-12">
                                                <div className="relative">
                                                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                                                        <Zap size={16} className="text-indigo-600 animate-pulse" />
                                                    </div>
                                                </div>
                                            </div>
                                        ) : filteredMatches.length > 0 ? (
                                            <div className="space-y-3">
                                                {filteredMatches.map((match: Match, index: any) => {
                                                    // Check if agent is already enrolled in this specific gig
                                                    const isAlreadyEnrolledInThisGig = activeAgentsList.some(
                                                        (agent: any) => {
                                                            const agentId = agent.agentId?._id || agent.agentId;
                                                            const gigId = agent.gigId?._id || agent.gigId;
                                                            return agentId === match.agentId && gigId === selectedGig?._id;
                                                        }
                                                    );

                                                    const isInvited = match.isInvited !== undefined ? match.isInvited : invitedAgents.has(match.agentId);
                                                    const isEnrolled = isAlreadyEnrolledInThisGig ||
                                                        match.isEnrolled ||
                                                        match.status === 'accepted' ||
                                                        match.agentResponse === 'accepted' ||
                                                        match.enrollmentStatus === 'accepted' ||
                                                        match.agentInfo?.status === 'accepted';

                                                    // Rep applied to this gig (status 'requested') — show a distinct
                                                    // "Applied" status instead of the Invite button, and let the
                                                    // company jump straight to the enrollment requests tab.
                                                    const hasRequested = (
                                                        match.status === 'requested' ||
                                                        match.enrollmentStatus === 'requested' ||
                                                        match.agentResponse === 'requested'
                                                    ) || enrollmentRequests.some((req: any) => {
                                                        const reqAgentId = req.agentId?._id || req.agentId;
                                                        const reqGigId = req.gigId?._id || req.gigId || req.gig?._id || req.gig;
                                                        const sameAgent = String(reqAgentId) === String(match.agentId);
                                                        const sameGig = !selectedGig?._id || String(reqGigId) === String(selectedGig._id);
                                                        return sameAgent && sameGig;
                                                    });



                                                    const matchScore = Math.round((match.totalMatchingScore || 0) * 100);
                                                    const cardBgColor = matchScore >= 70 ? 'bg-emerald-50/40 border-emerald-200/60 hover:border-emerald-300' :
                                                        matchScore >= 50 ? 'bg-amber-50/40 border-amber-200/60 hover:border-amber-300' :
                                                            'bg-slate-50 border-slate-200 hover:border-slate-300';

                                                    const isExpanded = expandedReps.has(match.agentId);

                                                    return (
                                                        <div key={`match-${match.agentId}-${index}`} className={`rounded-xl p-4 sm:p-5 border transition-all duration-200 shadow-sm hover:shadow-md ${cardBgColor}`}>
                                                            {/* Rep Header */}
                                                            <div className="flex items-center justify-between mb-4">
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-3 mb-2">
                                                                        <h4
                                                                            className="text-lg font-bold text-gray-900 truncate cursor-pointer hover:text-indigo-600 transition-colors"
                                                                            onClick={() => setSelectedAgentProfile(match.agentInfo)}
                                                                        >
                                                                            {match.agentInfo?.name}
                                                                        </h4>
                                                                        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${matchScore >= 70 ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                                                                            matchScore >= 50 ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                                                                                'bg-slate-100 text-slate-600 border border-slate-200'
                                                                            }`}>
                                                                            {matchScore}% {t('matchingDashboard.matching.match')}
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-4 text-xs text-gray-400 mt-1">
                                                                        {(match.agentInfo?.timezone?.countryName || match.agentInfo?.location) && (
                                                                            <span>📍 {match.agentInfo?.timezone?.countryName || match.agentInfo?.location}</span>
                                                                        )}
                                                                        {match.agentInfo?.timezone?.gmtDisplay && match.agentInfo.timezone.gmtDisplay !== 'Unknown' && (
                                                                            <span>🕒 {match.agentInfo.timezone.gmtDisplay}</span>
                                                                        )}
                                                                        {match.agentInfo?.professionalSummary?.yearsOfExperience && (
                                                                            <span>💼 {match.agentInfo.professionalSummary.yearsOfExperience.toString().replace(/\s*years?\s*/gi, '')} {t('matchingDashboard.matching.yearsExp')}</span>
                                                                        )}
                                                                        {match.agentInfo?.personalInfo?.languages && match.agentInfo.personalInfo.languages.length > 0 && (
                                                                            <span>🗣️ {match.agentInfo.personalInfo.languages.length} {t('matchingDashboard.matching.languages').replace(':', '')}</span>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div className="flex-shrink-0 ml-4">
                                                                    {isEnrolled ? (
                                                                        <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                                                                            {t('matchingDashboard.matching.enrolled')}
                                                                        </span>
                                                                    ) : match.alreadyEnrolled ? (
                                                                        <span className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                                                                            {t('matchingDashboard.matching.alreadyEnrolled')}
                                                                        </span>
                                                                    ) : hasRequested ? (
                                                                        <button
                                                                            onClick={() => setActiveSection('enrollment')}
                                                                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium border border-amber-200 hover:bg-amber-200 transition-all duration-200"
                                                                            title={t('matchingDashboard.matching.reviewRequest')}
                                                                        >
                                                                            ⌛ {t('matchingDashboard.matching.requested')}
                                                                        </button>
                                                                    ) : isInvited ? (
                                                                        <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                                                                            {t('matchingDashboard.matching.invited')}
                                                                        </span>
                                                                    ) : (
                                                                        <button
                                                                            className="inline-flex items-center px-3 py-1.5 bg-gradient-rep-accent text-white rounded-lg hover:opacity-90 transition-all duration-200 text-sm font-medium gap-1 shadow-sm"
                                                                            onClick={() => handleCreateGigAgent(match)}
                                                                            disabled={creatingGigAgent}
                                        >
                                                                            <Zap className="w-4 h-4" />
                                                                            {t('matchingDashboard.matching.invite')}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* View Details Button */}
                                                            <div className="flex justify-center mt-4">
                                                                <button
                                                                    onClick={() => toggleRepDetails(match.agentId)}
                                                                    className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-600 rounded-lg transition-all duration-200 text-sm font-medium shadow-sm hover:shadow"
                                                                >
                                                                    <span>{isExpanded ? t('matchingDashboard.matching.hideDetails') : t('matchingDashboard.matching.viewDetails')}</span>
                                                                    <svg
                                                                        className={`w-4 h-4 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                                                        fill="none"
                                                                        stroke="currentColor"
                                                                        viewBox="0 0 24 24"
                                                                    >
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                                    </svg>
                                                                </button>
                                                            </div>

                                                            {/* Expanded Details */}
                                                            {isExpanded && (
                                                                <div className="mt-6 pt-6 border-t border-gray-200 space-y-6 overflow-hidden">
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-full overflow-hidden mb-4">
                                                                        {/* Skills Match */}
                                                                        {match.skillsMatch && (
                                                                            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                                                                                <div className="flex items-center justify-between mb-2">
                                                                                    <h5 className="font-semibold text-gray-900">{t('matchingDashboard.matching.skills')}</h5>
                                                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${Math.round((match.skillsMatch.score || 0) * 100) >= 70 ? 'bg-green-100 text-green-800' :
                                                                                        Math.round((match.skillsMatch.score || 0) * 100) >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                                                                            'bg-red-100 text-red-800'
                                                                                        }`}>
                                                                                        {Math.round((match.skillsMatch.score || 0) * 100)}%
                                                                                    </span>
                                                                                </div>
                                                                                {match.skillsMatch.details?.matchingSkills && match.skillsMatch.details.matchingSkills.length > 0 && (
                                                                                    <div className="space-y-1">
                                                                                        <p className="text-xs text-gray-500 mb-2">{t('matchingDashboard.matching.matchedSkills')}</p>
                                                                                        <div className="flex flex-wrap gap-1">
                                                                                            {match.skillsMatch.details.matchingSkills.slice(0, 3).map((skill: any, i: number) => (
                                                                                                <span key={i} className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded text-xs font-medium border border-indigo-100">
                                                                                                    {skill.skill?.name || skill.skillName || skill.name || skill}
                                                                                                </span>
                                                                                            ))}
                                                                                            {match.skillsMatch.details.matchingSkills.length > 3 && (
                                                                                                <span className="px-2 py-1 bg-gray-50 text-gray-400 rounded text-xs border border-gray-100">
                                                                                                    +{match.skillsMatch.details.matchingSkills.length - 3} {t('matchingDashboard.matching.more')}
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}

                                                                        {/* Language Match */}
                                                                        {match.languageMatch && (
                                                                            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                                                                                <div className="flex items-center justify-between mb-2">
                                                                                    <h5 className="font-semibold text-gray-900">{t('matchingDashboard.matching.languages').replace(':', '')}</h5>
                                                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${Math.round((match.languageMatch.score || 0) * 100) >= 70 ? 'bg-green-100 text-green-800' :
                                                                                        Math.round((match.languageMatch.score || 0) * 100) >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                                                                            'bg-red-100 text-red-800'
                                                                                        }`}>
                                                                                        {Math.round((match.languageMatch.score || 0) * 100)}%
                                                                                    </span>
                                                                                </div>
                                                                                {match.languageMatch.details?.matchingLanguages && match.languageMatch.details.matchingLanguages.length > 0 && (
                                                                                    <div className="space-y-1">
                                                                                        <p className="text-xs text-gray-500 mb-2">{t('matchingDashboard.matching.matchedLanguages')}</p>
                                                                                        <div className="flex flex-wrap gap-1">
                                                                                            {match.languageMatch.details.matchingLanguages.slice(0, 3).map((lang: any, i: number) => (
                                                                                                <span key={i} className="px-2 py-1 bg-sky-50 text-sky-700 rounded text-xs font-medium border border-sky-100">
                                                                                                    {lang.language?.name || lang.languageName || getLanguageNameByCode(lang.language || lang.code || lang)}
                                                                                                    {lang.agentLevel && <span className="ml-1 text-sky-800">({lang.agentLevel})</span>}
                                                                                                </span>
                                                                                            ))}
                                                                                            {match.languageMatch.details.matchingLanguages.length > 3 && (
                                                                                                <span className="px-2 py-1 bg-gray-50 text-gray-400 rounded text-xs border border-gray-100">
                                                                                                    +{match.languageMatch.details.matchingLanguages.length - 3} {t('matchingDashboard.matching.more')}
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}

                                                                        {/* Industry Match */}
                                                                        {match.industryMatch && (
                                                                            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                                                                                <div className="flex items-center justify-between mb-2">
                                                                                    <h5 className="font-semibold text-gray-900">{t('matchingDashboard.matching.industry')}</h5>
                                                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${Math.round((match.industryMatch.score || 0) * 100) >= 70 ? 'bg-green-100 text-green-800' :
                                                                                        Math.round((match.industryMatch.score || 0) * 100) >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                                                                            'bg-red-100 text-red-800'
                                                                                        }`}>
                                                                                        {Math.round((match.industryMatch.score || 0) * 100)}%
                                                                                    </span>
                                                                                </div>
                                                                                {match.industryMatch.details?.matchingIndustries && match.industryMatch.details.matchingIndustries.length > 0 && (
                                                                                    <div className="space-y-1">
                                                                                        <p className="text-xs text-gray-500 mb-2">{t('matchingDashboard.matching.matchedIndustries')}</p>
                                                                                        <div className="flex flex-wrap gap-1">
                                                                                            {match.industryMatch.details.matchingIndustries.slice(0, 2).map((industry: any, i: number) => (
                                                                                                <span key={i} className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs font-medium border border-blue-100">
                                                                                                    {industry.industry?.name || industry.industryName || industry.name || industry}
                                                                                                </span>
                                                                                            ))}
                                                                                            {match.industryMatch.details.matchingIndustries.length > 2 && (
                                                                                                <span className="px-2 py-1 bg-gray-50 text-gray-400 rounded text-xs border border-gray-100">
                                                                                                    +{match.industryMatch.details.matchingIndustries.length - 2} {t('matchingDashboard.matching.more')}
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}

                                                                        {/* Experience Match */}
                                                                        {match.experienceMatch && (
                                                                            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                                                                                <div className="flex items-center justify-between mb-2">
                                                                                    <h5 className="font-semibold text-gray-900">{t('matchingDashboard.matching.experience').replace(':', '')}</h5>
                                                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${Math.round((match.experienceMatch.score || 0) * 100) >= 70 ? 'bg-green-100 text-green-800' :
                                                                                        Math.round((match.experienceMatch.score || 0) * 100) >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                                                                            'bg-red-100 text-red-800'
                                                                                        }`}>
                                                                                        {Math.round((match.experienceMatch.score || 0) * 100)}%
                                                                                    </span>
                                                                                </div>
                                                                                <div className="text-xs text-gray-500">
                                                                                    <p>{t('matchingDashboard.matching.rep')} {match.agentInfo?.professionalSummary?.yearsOfExperience || 'N/A'} {t('matchingDashboard.matching.years')}</p>
                                                                                    <p>{t('matchingDashboard.matching.required')} {selectedGig?.seniority?.yearsExperience || 'N/A'} {t('matchingDashboard.matching.years')}</p>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* Second Row */}
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-full overflow-hidden">
                                                                        {/* Timezone Match */}
                                                                        {match.timezoneMatch && (
                                                                            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                                                                                <div className="flex items-center justify-between mb-2">
                                                                                    <h5 className="font-semibold text-gray-900">{t('matchingDashboard.matching.timezone').replace(':', '')}</h5>
                                                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${Math.round((match.timezoneMatch.score || 0) * 100) >= 70 ? 'bg-green-100 text-green-800' :
                                                                                        Math.round((match.timezoneMatch.score || 0) * 100) >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                                                                            'bg-red-100 text-red-800'
                                                                                        }`}>
                                                                                        {Math.round((match.timezoneMatch.score || 0) * 100)}%
                                                                                    </span>
                                                                                </div>
                                                                                <div className="text-xs text-gray-500">
                                                                                    <p>{t('matchingDashboard.matching.rep')} {match.agentInfo?.timezone?.gmtDisplay || 'N/A'}</p>
                                                                                    <p>{t('matchingDashboard.matching.zone')} {match.agentInfo?.timezone?.timezoneName || match.agentInfo?.availability?.timeZone?.zoneName || 'N/A'}</p>
                                                                                    <p>{t('matchingDashboard.matching.location')} {match.agentInfo?.timezone?.countryName || match.agentInfo?.personalInfo?.country?.name || match.agentInfo?.location || 'N/A'}</p>
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        {/* Region Match */}
                                                                        {match.regionMatch && (
                                                                            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                                                                                <div className="flex items-center justify-between mb-2">
                                                                                    <h5 className="font-semibold text-gray-900">{t('matchingDashboard.matching.region').replace(':', '')}</h5>
                                                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${Math.round((match.regionMatch.score || 0) * 100) >= 70 ? 'bg-green-100 text-green-800' :
                                                                                        Math.round((match.regionMatch.score || 0) * 100) >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                                                                            'bg-red-100 text-red-800'
                                                                                        }`}>
                                                                                        {Math.round((match.regionMatch.score || 0) * 100)}%
                                                                                    </span>
                                                                                </div>
                                                                                <div className="text-xs text-gray-500">
                                                                                    <p>{t('matchingDashboard.matching.country')} {match.agentInfo?.timezone?.countryName || match.agentInfo?.personalInfo?.country?.name || 'N/A'}</p>
                                                                                    <p>{t('matchingDashboard.matching.code')} {match.agentInfo?.timezone?.countryCode || match.agentInfo?.personalInfo?.country?.code || 'N/A'}</p>
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        {/* Availability Match */}
                                                                        {match.availabilityMatch && (
                                                                            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                                                                                <div className="flex items-center justify-between mb-2">
                                                                                    <h5 className="font-semibold text-gray-900">{t('matchingDashboard.matching.availability').replace(':', '')}</h5>
                                                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${Math.round((match.availabilityMatch.score || 0) * 100) >= 70 ? 'bg-green-100 text-green-800' :
                                                                                        Math.round((match.availabilityMatch.score || 0) * 100) >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                                                                            'bg-red-100 text-red-800'
                                                                                        }`}>
                                                                                        {Math.round((match.availabilityMatch.score || 0) * 100)}%
                                                                                    </span>
                                                                                </div>
                                                                                <div className="text-xs text-gray-500">
                                                                                    <p>{t('matchingDashboard.matching.schedule')} {match.agentInfo?.availability?.schedule?.length || 0} {t('matchingDashboard.matching.daysWeek')}</p>
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        {/* Activity Match */}
                                                                        {match.activityMatch && (
                                                                            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                                                                                <div className="flex items-center justify-between mb-2">
                                                                                    <h5 className="font-semibold text-gray-900">{t('matchingDashboard.matching.activities').replace(':', '')}</h5>
                                                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${Math.round((match.activityMatch.score || 0) * 100) >= 70 ? 'bg-green-100 text-green-800' :
                                                                                        Math.round((match.activityMatch.score || 0) * 100) >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                                                                            'bg-red-100 text-red-800'
                                                                                        }`}>
                                                                                        {Math.round((match.activityMatch.score || 0) * 100)}%
                                                                                    </span>
                                                                                </div>
                                                                                {match.activityMatch.details?.matchingActivities && match.activityMatch.details.matchingActivities.length > 0 && (
                                                                                    <div className="space-y-1">
                                                                                        <p className="text-xs text-gray-500 mb-2">{t('matchingDashboard.matching.matchedActivities')}</p>
                                                                                        <div className="flex flex-wrap gap-1">
                                                                                            {match.activityMatch.details.matchingActivities.slice(0, 2).map((activity: any, i: number) => (
                                                                                                <span key={i} className="px-2 py-1 bg-teal-50 text-teal-700 rounded text-xs font-medium border border-teal-100">
                                                                                                    {activity.activity?.name || activity.activityName || activity.name || activity}
                                                                                                </span>
                                                                                            ))}
                                                                                            {match.activityMatch.details.matchingActivities.length > 2 && (
                                                                                                <span className="px-2 py-1 bg-gray-50 text-gray-400 rounded text-xs border border-gray-100">
                                                                                                    +{match.activityMatch.details.matchingActivities.length - 2} {t('matchingDashboard.matching.more')}
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : searchTerm ? (
                                            <div className="text-center py-8">
                                                <div className="bg-antigravity-surface rounded-xl p-6 max-w-md mx-auto">
                                                    <svg className="w-12 h-12 text-slate-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                    </svg>
                                                    <p className="text-slate-900 mb-2">{t('matchingDashboard.matching.noRepsFound')} "{searchTerm}"</p>
                                                    <p className="text-sm text-slate-500">{t('matchingDashboard.matching.tryAdjusting')}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-8">
                                                <div className="bg-antigravity-surface rounded-xl p-6 max-w-md mx-auto">
                                                    <Briefcase size={24} className="text-slate-500 mx-auto mb-2" />
                                                    <p className="text-slate-900">{t('matchingDashboard.matching.noMatchesFound')}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Success/Error Messages */}
                                        {gigAgentSuccess && (
                                            <div className="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
                                                <div className="flex items-center">
                                                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                    {gigAgentSuccess}
                                                </div>
                                            </div>
                                        )}

                                        {gigAgentError && (
                                            <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                                                <div className="flex items-center">
                                                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                    </svg>
                                                    {gigAgentError}
                                                </div>
                                            </div>
                                        )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {/* 2. INVITED REPS */}
                        {activeSection === 'invited' && (
                            <div className="space-y-6">

                                <div className="bg-white/90 rounded-2xl shadow-sm p-4 sm:p-6 border border-slate-200/80">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                                        <div className="flex items-center space-x-3">
                                            <h2 className="text-lg sm:text-xl font-bold text-slate-800">📧 {t('matchingDashboard.invited.title')}</h2>
                                            <span className="px-3 py-1 bg-sky-100 text-sky-700 rounded-full text-xs font-medium border border-sky-200 whitespace-nowrap">
                                                {invitedAgentsList.length} {t('matchingDashboard.invited.pending')}
                                            </span>
                                        </div>
                                        <div className="relative w-full sm:w-64">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                </svg>
                                            </div>
                                            <input
                                                type="text"
                                                placeholder={t('matchingDashboard.invited.search')}
                                                value={searchTerm}
                                                onChange={(e: any) => setSearchTerm(e.target.value)}
                                                className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs text-slate-900 transition-all shadow-sm"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        {invitedAgentsList.filter((a: any) => 
                                            (a.personalInfo?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                                            (a.personalInfo?.email || '').toLowerCase().includes(searchTerm.toLowerCase())
                                        ).length > 0 ? (
                                        <div className="space-y-3">
                                            {(invitedAgentsList || []).filter((a: any) => 
                                                (a.personalInfo?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                                                (a.personalInfo?.email || '').toLowerCase().includes(searchTerm.toLowerCase())
                                            ).map((agent: any, index: number) => {
                                                if (!agent) return null;
                                                

                                                return (
                                                    <div
                                                        key={`invited-${agent._id || index}`}
                                                        onClick={() => { if (agent._id) handleAgentClick(agent._id); }}
                                                        title={t('matchingDashboard.enrollment.viewProfile')}
                                                        className="bg-amber-50/60 border border-amber-200/70 rounded-xl p-4 sm:p-5 hover:shadow-sm hover:border-amber-300 transition-all duration-200 cursor-pointer"
                                                    >
                                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                            <div className="flex-1 min-w-0">
                                                                <h3 className="text-lg font-bold text-gray-900 break-words hover:text-indigo-600 transition-colors">{agent.personalInfo?.name || t('matchingDashboard.invited.unnamedAgent')}</h3>
                                                                <div className="mt-2 space-y-1">
                                                                    <p className="text-sm text-amber-700 font-medium bg-amber-100/60 inline-block px-2 py-0.5 rounded">
                                                                        {t('matchingDashboard.invited.waitingResponse')}
                                                                    </p>
                                                                    {(agent.gigId?.title || agent.gig?.title) && (
                                                                        <p className="text-sm text-slate-500">
                                                                            <span className="font-medium">{t('matchingDashboard.invited.gig')}</span> {agent.gigId?.title || agent.gig?.title}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center space-x-2 sm:shrink-0">
                                                                <span className="inline-flex items-center px-3 py-2 bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-sm font-medium whitespace-nowrap">
                                                                    📧 {t('matchingDashboard.invited.pending')}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12">
                                            <div className="bg-slate-50/50 rounded-xl p-8 max-w-md mx-auto border border-slate-200">
                                                <div className="text-6xl mb-4">📧</div>
                                                <p className="text-slate-900 text-lg mb-2">{t('matchingDashboard.invited.noPending')}</p>
                                                <p className="text-sm text-slate-500">{t('matchingDashboard.invited.allResponded')}</p>
                                            </div>
                                        </div>
                                    )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 3. ENROLLMENT REQUESTS */}
                        {activeSection === 'enrollment' && (
                            <div className="space-y-6">

                                <div className="bg-white/90 rounded-2xl shadow-sm p-4 sm:p-6 border border-slate-200/80">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                                        <div className="flex items-center space-x-3">
                                            <h2 className="text-lg sm:text-xl font-bold text-slate-800">📋 {t('matchingDashboard.enrollment.title')}</h2>
                                            <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-medium border border-indigo-100 whitespace-nowrap">
                                                {enrollmentRequests.length} {t('matchingDashboard.enrollment.requests')}
                                            </span>
                                        </div>
                                        <div className="relative w-full sm:w-64">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                </svg>
                                            </div>
                                            <input
                                                type="text"
                                                placeholder={t('matchingDashboard.enrollment.search')}
                                                value={searchTerm}
                                                onChange={(e: any) => setSearchTerm(e.target.value)}
                                                className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs text-slate-900 transition-all shadow-sm"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        {enrollmentRequests.filter((a: any) => 
                                            (a.agentId?.personalInfo?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                                            (a.agentId?.personalInfo?.email || '').toLowerCase().includes(searchTerm.toLowerCase())
                                        ).length > 0 ? (
                                        <div className="space-y-3">
                                            {(enrollmentRequests || []).filter((a: any) => 
                                                (a.agentId?.personalInfo?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                                                (a.agentId?.personalInfo?.email || '').toLowerCase().includes(searchTerm.toLowerCase())
                                            ).map((agent: any, index: number) => agent && (
                                                <div key={`enrollment-${agent._id || index}`} className="bg-sky-50/60 border border-sky-200/70 rounded-xl p-4 sm:p-5 hover:shadow-sm transition-all duration-200">
                                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                                        <div className="flex-1 min-w-0">
                                                            <h3
                                                                className="text-lg font-bold text-gray-900 cursor-pointer hover:text-indigo-600 transition-colors inline-flex items-center gap-1.5 break-words"
                                                                onClick={() => {
                                                                    const repId = agent.agentId?._id || agent.agentId;
                                                                    if (repId) handleAgentClick(repId);
                                                                }}
                                                                title={t('matchingDashboard.enrollment.viewProfile')}
                                                            >
                                                                {agent.agentId?.personalInfo?.name || t('matchingDashboard.invited.unnamedAgent')}
                                                            </h3>
                                                            <div className="mt-2 space-y-1">
                                                                <p className="text-sm text-blue-600 font-medium">
                                                                    <span className="font-medium">{t('matchingDashboard.enrollment.status')}</span> {agent.enrollmentStatus || 'Pending'}
                                                                </p>
                                                                {(agent.gigId?.title || agent.gig?.title) && (
                                                                    <p className="text-sm text-slate-500">
                                                                        <span className="font-medium">{t('matchingDashboard.invited.gig')}</span> {agent.gigId?.title || agent.gig?.title}
                                                                    </p>
                                                                )}
                                                                {agent.notes && (
                                                                    <p className="text-sm text-slate-500 italic">
                                                                        "{agent.notes}"
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap lg:shrink-0">
                                                            <button
                                                                onClick={() => {
                                                                    const repId = agent.agentId?._id || agent.agentId;
                                                                    if (repId) handleAgentClick(repId);
                                                                }}
                                                                disabled={loadingProfile}
                                                                className="flex-1 lg:flex-none justify-center px-4 py-2 bg-white text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-all duration-200 text-sm font-medium flex items-center gap-1.5 disabled:opacity-60 whitespace-nowrap"
                                                            >
                                                                👁️ {t('matchingDashboard.enrollment.viewProfile')}
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    try {
                                                                        await acceptEnrollmentRequest(agent._id, "Welcome to the team! We are delighted to have you.");
                                                                        // Refresh data
                                                                        const companyId = Cookies.get('companyId') || '';
                                                                        const [invitedAgentsData, enrollmentRequestsData, activeAgentsData] = await Promise.all([
                                                                            getInvitedAgentsForCompany(companyId),
                                                                            getEnrollmentRequestsForCompany(companyId),
                                                                            getActiveAgentsForCompany(companyId)
                                                                        ]);
                                                                        setCompanyInvitedAgents(invitedAgentsData);
                                                                        setEnrollmentRequests(enrollmentRequestsData);
                                                                        setActiveAgentsList(activeAgentsData);
                                                                    } catch (error) {
                                                                        console.error('Error accepting enrollment request:', error);
                                                                        // TODO: Show error toast
                                                                    }
                                                                }}
                                                                className="flex-1 lg:flex-none px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 text-sm font-medium whitespace-nowrap"
                                                            >
                                                                ✅ {t('matchingDashboard.enrollment.approve')}
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    try {
                                                                        await rejectEnrollmentRequest(agent._id, "Sorry, we cannot proceed with your application at this time.");
                                                                        // Refresh data
                                                                        const companyId = Cookies.get('companyId') || '';
                                                                        const [invitedAgentsData, enrollmentRequestsData, activeAgentsData] = await Promise.all([
                                                                            getInvitedAgentsForCompany(companyId),
                                                                            getEnrollmentRequestsForCompany(companyId),
                                                                            getActiveAgentsForCompany(companyId)
                                                                        ]);
                                                                        setCompanyInvitedAgents(invitedAgentsData);
                                                                        setEnrollmentRequests(enrollmentRequestsData);
                                                                        setActiveAgentsList(activeAgentsData);
                                                                    } catch (error) {
                                                                        console.error('Error rejecting enrollment request:', error);
                                                                        // TODO: Show error toast
                                                                    }
                                                                }}
                                                                className="flex-1 lg:flex-none px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 text-sm font-medium whitespace-nowrap"
                                                            >
                                                                ❌ {t('matchingDashboard.enrollment.reject')}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12">
                                            <div className="bg-slate-50/50 rounded-xl p-8 max-w-md mx-auto border border-slate-200">
                                                <div className="text-6xl mb-4">📋</div>
                                                <p className="text-slate-900 text-lg mb-2">{t('matchingDashboard.enrollment.noRequests')}</p>
                                                <p className="text-sm text-slate-500">{t('matchingDashboard.enrollment.noWaiting')}</p>
                                            </div>
                                        </div>
                                    )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 4. ACTIVE REPS */}
                        {activeSection === 'active' && (
                            <div className="space-y-6">

                                <div className="bg-white/90 rounded-2xl shadow-sm p-4 sm:p-6 border border-slate-200/80">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                                        <div className="flex items-center space-x-3">
                                            <h2 className="text-lg sm:text-xl font-bold text-slate-800">✅ {t('matchingDashboard.active.title')}</h2>
                                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium border border-green-200 whitespace-nowrap">
                                                {activeAgentsList.length} {t('matchingDashboard.active.active')}
                                            </span>
                                        </div>
                                        <div className="relative w-full sm:w-64">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                </svg>
                                            </div>
                                            <input
                                                type="text"
                                                placeholder={t('matchingDashboard.active.search')}
                                                value={searchTerm}
                                                onChange={(e: any) => setSearchTerm(e.target.value)}
                                                className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs text-slate-900 transition-all shadow-sm"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        {activeAgentsList.filter((a: any) => 
                                            (a.agentId?.personalInfo?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                                            (a.agentId?.personalInfo?.email || '').toLowerCase().includes(searchTerm.toLowerCase())
                                        ).length > 0 ? (
                                        <div className="space-y-3">
                                            {(activeAgentsList || []).filter((a: any) => 
                                                (a.agentId?.personalInfo?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                                                (a.agentId?.personalInfo?.email || '').toLowerCase().includes(searchTerm.toLowerCase())
                                            ).map((agent: any, index: number) => agent && (
                                                <div key={`active-${agent._id || index}`} className="bg-emerald-50/60 border border-emerald-200/70 rounded-xl p-4 sm:p-5 hover:shadow-sm hover:border-emerald-300 transition-all duration-200">
                                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-3 mb-2">
                                                                <h3
                                                                    className="text-lg font-bold text-gray-900 cursor-pointer hover:text-indigo-600 transition-colors inline-flex items-center gap-1.5"
                                                                    onClick={() => {
                                                                        const repId = agent.agentId?._id || agent.agentId;
                                                                        if (repId) handleAgentClick(repId);
                                                                    }}
                                                                    title={t('matchingDashboard.enrollment.viewProfile')}
                                                                >{agent.agentId?.personalInfo?.name || t('matchingDashboard.invited.unnamedAgent')}</h3>
                                                                <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium border border-green-200">
                                                                    ✅ {t('matchingDashboard.active.active')}
                                                                </span>
                                                            </div>
                                                            <div className="mt-3 space-y-2">
                                                                {(agent.gigId?.title || agent.gig?.title) && (
                                                                    <div className="mb-2">
                                                                        <p className="text-sm text-slate-500">
                                                                            <span className="font-medium">{t('matchingDashboard.invited.gig')}</span> {agent.gigId?.title || agent.gig?.title}
                                                                        </p>
                                                                    </div>
                                                                )}
                                                                <div className="flex items-center gap-4 text-sm">
                                                                    <span className="text-slate-500">
                                                                        <span className="font-medium">{t('matchingDashboard.active.experience')}</span> {agent.agentId?.professionalSummary?.yearsOfExperience || 0} {t('matchingDashboard.matching.years')}
                                                                    </span>
                                                                    <span className="text-slate-500">
                                                                        <span className="font-medium">{t('matchingDashboard.active.role')}</span> {agent.agentId?.professionalSummary?.currentRole || t('matchingDashboard.active.na')}
                                                                    </span>
                                                                </div>

                                                                <div className="flex flex-wrap gap-2">
                                                                    {(agent.agentId?.professionalSummary?.keyExpertise || []).slice(0, 5).map((skill: any, i: any) => (
                                                                        <span key={i} className="px-2 py-1 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-xs">
                                                                            {skill}
                                                                        </span>
                                                                    ))}
                                                                    {agent.agentId?.professionalSummary?.keyExpertise?.length > 5 && (
                                                                        <span className="px-2 py-1 bg-slate-50/50 text-slate-500 rounded text-xs">
                                                                            +{agent.agentId.professionalSummary.keyExpertise.length - 5} more
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                                                                    <div>
                                                                        <span className="font-medium">{t('matchingDashboard.active.availability')}</span> {agent.agentId?.availability?.schedule?.length || 0} {t('matchingDashboard.matching.daysWeek')}
                                                                    </div>
                                                                    <div>
                                                                        <span className="font-medium">{t('matchingDashboard.active.status')}</span> {agent.agentId?.onboardingProgress?.currentPhase === 4 ? t('matchingDashboard.active.fullyOnboarded') : t('matchingDashboard.active.inProgress')}
                                                                    </div>
                                                                    <div>
                                                                        <span className="font-medium">{t('matchingDashboard.active.languages')}</span> {agent.agentId?.personalInfo?.languages?.length || 0}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-col items-stretch lg:items-end gap-2 lg:shrink-0">
                                                            <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200 text-sm font-medium whitespace-nowrap">
                                                                {t('matchingDashboard.active.manageProfile')}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12">
                                            <div className="bg-slate-50/50 rounded-xl p-8 max-w-md mx-auto border border-slate-200">
                                                <div className="text-6xl mb-4">✅</div>
                                                <p className="text-slate-900 text-lg mb-2">{t('matchingDashboard.active.noActive')}</p>
                                                <p className="text-sm text-slate-500">{t('matchingDashboard.active.startFinding')}</p>
                                            </div>
                                        </div>
                                    )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>
                </>
            )}
        </div>
    );
}

export default MatchingDashboard;
