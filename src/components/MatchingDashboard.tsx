import React, { useState, useEffect } from 'react';
import {
    Users,
    Briefcase,
    Zap,
    Settings,
    ArrowLeft
} from 'lucide-react';
import {
    Rep,
    Gig,
    Match,
    MatchingWeights,
    MatchResponse
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
    saveGigWeights,
    getGigWeights,
    resetGigWeights,
    Skill,
    Language
} from '../api/matching';
import Cookies from 'js-cookie';
import axios from 'axios';

export const MatchingDashboard = () => {
    const [reps, setReps] = useState<Rep[]>([]);
    const [gigs, setGigs] = useState<Gig[]>([]);
    const [selectedGig, setSelectedGig] = useState<Gig | null>(null);
    const [matches, setMatches] = useState<Match[]>([]);
    const [matchStats, setMatchStats] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [showWeights, setShowWeights] = useState(true);
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
    const [gigHasWeights, setGigHasWeights] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [originalWeights, setOriginalWeights] = useState<MatchingWeights | null>(null);
    const [activeSection, setActiveSection] = useState<'matching' | 'invited' | 'enrollment' | 'active'>('matching');
    const [expandedReps, setExpandedReps] = useState<Set<string>>(new Set());
    const [expandedGigs, setExpandedGigs] = useState<Set<string>>(new Set());
    const [invitedAgentsList, setInvitedAgentsList] = useState<any[]>([]);
    const [enrollmentRequests, setEnrollmentRequests] = useState<any[]>([]);
    const [activeAgentsList, setActiveAgentsList] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [leftColumnWidth, setLeftColumnWidth] = useState<number>(25); // percentage
    const [isResizing, setIsResizing] = useState<boolean>(false);

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


    useEffect(() => {
        const fetchData = async () => {
            setInitialLoading(true);
            setError(null);

            try {
                console.log("Fetching data from backend...");

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

                console.log("=== BACKEND DATA ===");
                console.log("Gigs:", gigsData);
                console.log("Company Invited Agents:", invitedAgentsData);
                console.log("Enrollment Requests:", enrollmentRequestsData);

            } catch (error) {
                console.error("Error fetching data:", error);
                setError("Failed to fetch data. Please try again.");
            } finally {
                setInitialLoading(false);
            }
        };

        fetchData();
    }, []);

    // Restore selected gig from localStorage when gigs are available
    useEffect(() => {
        const savedGigId = localStorage.getItem('selectedGigId');
        if (savedGigId && gigs.length > 0 && !selectedGig) {
            console.log("Restoring selected gig from localStorage:", savedGigId);
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

        console.log('🔍 Company Invited Agents Structure:', companyInvitedAgents);
        console.log('🔍 Enrollment Requests Structure:', enrollmentRequests);
        console.log('🔍 Active Agents Structure:', activeAgentsList);

        // Directly set the lists without filtering again
        setInvitedAgentsList(companyInvitedAgents.filter((agent: { isActive: any; hasCompletedOnboarding: any; }) => !agent.isActive && !agent.hasCompletedOnboarding));
        setEnrollmentRequests(enrollmentRequests);
        // Active agents come directly from the API endpoint
        console.log('✅ Setting active agents:', activeAgentsList);
    }, [companyInvitedAgents, enrollmentRequests, activeAgentsList]);

    const handleGigSelect = async (gig: Gig) => {
        console.log('🎯 GIG SELECTED:', gig.title, 'ID:', gig._id);
        setSelectedGig(gig);
        if (gig._id) {
            localStorage.setItem('selectedGigId', gig._id);
        }
        setLoading(true);
        setError(null);
        setMatches([]);
        setMatchStats(null);
        setSearchTerm(''); // Clear search when selecting a new gig

        // Reset weights state
        setGigHasWeights(false);
        setHasUnsavedChanges(false);
        setOriginalWeights(null);

        let currentWeights = weights;

        try {
            // Try to load saved weights for this gig
            try {
                const savedWeights = await getGigWeights(gig._id || '');
                setWeights(savedWeights.matchingWeights);
                setOriginalWeights(savedWeights.matchingWeights);
                setGigHasWeights(true);
                setHasUnsavedChanges(false);
                currentWeights = savedWeights.matchingWeights;
                console.log('✅ Gig has saved weights, loaded:', savedWeights.matchingWeights);
            } catch (error: any) {
                // Handle different types of errors more gracefully
                if (error.message?.includes('No saved weights found')) {
                    console.log('ℹ️ No saved weights found for gig:', gig._id, '- Using default weights');
                } else if (error.message?.includes('Failed to fetch')) {
                    console.warn('⚠️ Network error loading weights for gig:', gig._id, '- Using current weights');
                } else {
                    console.error('❌ Unexpected error loading weights for gig:', gig._id, error);
                }
                setGigHasWeights(false);
                // Keep current weights
            }

            // Fetch invited reps for this gig
            const gigAgents = await getGigAgentsForGig(gig._id || '');
            const invitedAgentIds = new Set<string>(gigAgents.map((ga: any) => ga.agentId as string));
            setInvitedAgents(invitedAgentIds);
            console.log('📧 Invited reps for gig:', invitedAgentIds);

            // Find matches for the selected gig using current or loaded weights
            console.log("Searching for reps matching gig:", gig.title);
            console.log("🎯 WEIGHTS BEING SENT TO API:", currentWeights);

            let matchesData;
            try {
                matchesData = await findMatchesForGig(gig._id || '', currentWeights);
                console.log("=== MATCHES DATA ===", matchesData);
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
                console.log("🔍 SCORE BREAKDOWN FOR FIRST MATCH:");
                console.log("- Agent:", firstMatch.agentInfo?.name);
                console.log("- Total Score from API:", firstMatch.totalMatchingScore);
                console.log("- Skills Score:", firstMatch.skillsMatch?.score, "× Weight:", currentWeights.skills, "=", (firstMatch.skillsMatch?.score || 0) * currentWeights.skills);
                console.log("- Languages Score:", firstMatch.languageMatch?.score, "× Weight:", currentWeights.languages, "=", (firstMatch.languageMatch?.score || 0) * currentWeights.languages);
                console.log("- Industry Score:", firstMatch.industryMatch?.score, "× Weight:", currentWeights.industry, "=", (firstMatch.industryMatch?.score || 0) * currentWeights.industry);
                console.log("- Activity Score:", firstMatch.activityMatch?.score, "× Weight:", currentWeights.activities, "=", (firstMatch.activityMatch?.score || 0) * currentWeights.activities);
                console.log("- Experience Score:", firstMatch.experienceMatch?.score, "× Weight:", currentWeights.experience, "=", (firstMatch.experienceMatch?.score || 0) * currentWeights.experience);
                console.log("- Timezone Score:", firstMatch.timezoneMatch?.score, "× Weight:", currentWeights.timezone, "=", (firstMatch.timezoneMatch?.score || 0) * currentWeights.timezone);
                console.log("- Region Score:", firstMatch.regionMatch?.score, "× Weight:", currentWeights.region, "=", (firstMatch.regionMatch?.score || 0) * currentWeights.region);
                console.log("- Availability Score:", firstMatch.availabilityMatch?.score, "× Weight:", currentWeights.availability, "=", (firstMatch.availabilityMatch?.score || 0) * currentWeights.availability);

                const calculatedTotal =
                    (firstMatch.skillsMatch?.score || 0) * currentWeights.skills +
                    (firstMatch.languageMatch?.score || 0) * currentWeights.languages +
                    (firstMatch.industryMatch?.score || 0) * currentWeights.industry +
                    (firstMatch.activityMatch?.score || 0) * currentWeights.activities +
                    (firstMatch.experienceMatch?.score || 0) * currentWeights.experience +
                    (firstMatch.timezoneMatch?.score || 0) * currentWeights.timezone +
                    (firstMatch.regionMatch?.score || 0) * currentWeights.region +
                    (firstMatch.availabilityMatch?.score || 0) * currentWeights.availability;

                console.log("🧮 CALCULATED TOTAL:", calculatedTotal);
                console.log("📊 API TOTAL:", firstMatch.totalMatchingScore);
                console.log("❓ DIFFERENCE:", Math.abs(calculatedTotal - firstMatch.totalMatchingScore));
            }

            setMatches(matchesData.preferedmatches || matchesData.matches || []);
            setMatchStats(matchesData);

            // Organize agents by status after fetching matches
            setTimeout(() => organizeAgentsByStatus(), 100);

        } catch (error) {
            console.error("Error getting matches:", error);
            setError("Failed to get matches. Please try again.");
            setMatches([]);
            setMatchStats(null);
        } finally {
            setLoading(false);
        }
    };

    const handleWeightChange = (key: string, value: number) => {
        const newWeights = {
            ...weights,
            [key]: value,
        };

        setWeights(newWeights);

        // Check if weights have been modified from original
        if (originalWeights && gigHasWeights) {
            const hasChanges = Object.keys(newWeights).some(
                k => Math.abs(newWeights[k as keyof MatchingWeights] - originalWeights[k as keyof MatchingWeights]) > 0.001
            );
            setHasUnsavedChanges(hasChanges);
        }

        // Auto-search when weights change if a gig is selected (without reloading saved weights)
        if (selectedGig) {
            searchWithCurrentWeights();
        }
    };

    // New function to search with current weights without reloading from DB
    const searchWithCurrentWeights = async () => {
        if (!selectedGig) return;

        setLoading(true);
        setError(null);

        try {
            console.log("Searching with current weights (no DB reload):", weights);
            const matchesData = await findMatchesForGig(selectedGig._id || '', weights);
            console.log("=== MATCHES DATA WITH CURRENT WEIGHTS ===", matchesData);

            setMatches(matchesData.preferedmatches || matchesData.matches || []);
            setMatchStats(matchesData);

            // Fetch invited reps for this gig
            const gigAgents = await getGigAgentsForGig(selectedGig._id || '');
            const invitedAgentIds = new Set<string>(gigAgents.map((ga: any) => ga.agentId as string));
            setInvitedAgents(invitedAgentIds);

        } catch (error) {
            console.error("Error searching with current weights:", error);
            setError("Failed to get matches. Please try again.");
            setMatches([]);
            setMatchStats(null);
        } finally {
            setLoading(false);
        }
    };

    const resetWeights = () => {
        const defaultWeights: MatchingWeights = {
            experience: 0,
            skills: 0,
            industry: 0,
            languages: 0,
            availability: 0,
            timezone: 0,
            activities: 0,
            region: 0,
        };
        setWeights(defaultWeights);

        // Check if we have unsaved changes after reset
        if (originalWeights && gigHasWeights) {
            const hasChanges = Object.keys(defaultWeights).some(
                k => Math.abs(defaultWeights[k as keyof MatchingWeights] - originalWeights[k as keyof MatchingWeights]) > 0.001
            );
            setHasUnsavedChanges(hasChanges);
        }

        // Auto-search when weights are reset if a gig is selected (without reloading saved weights)
        if (selectedGig) {
            searchWithCurrentWeights();
        }
    };

    // Save weights for selected gig and search
    const saveWeightsForGig = async () => {
        console.log('🚨 SAVE WEIGHTS FOR GIG CALLED');

        if (!selectedGig) {
            console.error('No gig selected');
            setError('No gig selected');
            return;
        }

        console.log('🔄 MANUAL SAVE TRIGGERED - User clicked save button');
        setLoading(true);
        setError(null);

        try {
            // Save weights to backend
            await saveGigWeights(selectedGig._id || '', weights);
            console.log('✅ Weights saved successfully for gig:', selectedGig._id);
            setGigHasWeights(true);
            setOriginalWeights(weights);
            setHasUnsavedChanges(false);

            // Trigger new search with saved weights using the new function
            await searchWithCurrentWeights();

        } catch (error) {
            console.error('❌ Error saving weights or searching:', error);
            setError('Failed to save weights or search. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Handle creating gig-rep (inviting rep to gig)
    const handleCreateGigAgent = async (match: Match) => {
        if (!selectedGig) {
            setGigAgentError("No gig selected");
            return;
        }

        setCreatingGigAgent(true);
        setGigAgentError(null);
        setGigAgentSuccess(null);

        console.log('Creating gig-rep with data:', {
            agentId: match.agentId,
            gigId: selectedGig._id,
            match: match
        });

        // Send only the essential IDs to avoid any object processing errors
        const requestData = {
            agentId: match.agentId,
            gigId: selectedGig._id || ''
            // Removed matchDetails completely to avoid backend language processing
        };

        console.log('🚀 Sending minimal request data:', requestData);

        try {
            const response = await createGigAgent(requestData);
            console.log('Gig-Rep created successfully:', response);

            // Add rep to invited list
            setInvitedAgents((prev: any) => new Set([...prev, match.agentId]));

            // Update the match object to mark it as invited
            setMatches((prevMatches: any[]) =>
                prevMatches.map((m: { agentId: string; }) =>
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
            const companyId = Cookies.get('companyId') || '685abf28641398dc582f4c95';

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
                setMatchStats(matchesData);
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
        console.log('🔍 DEBUG: All matches data:', matches);
        console.log('🔍 DEBUG: invitedAgents Set:', invitedAgents);
        console.log('🔍 DEBUG: Company Invited Reps:', companyInvitedAgents);

        // Use company invited reps from API endpoint
        const invited = companyInvitedAgents.filter((agent: { isActive: any; hasCompletedOnboarding: any; personalInfo: { name: any; }; status: any; }) => {
            // Show all reps who are not yet active, regardless of their status
            const isInvited = !agent.isActive &&
                !agent.hasCompletedOnboarding;

            console.log(`🔍 Company Invited Rep ${agent.personalInfo?.name}:`, {
                status: agent.status,
                isActive: agent.isActive,
                hasCompletedOnboarding: agent.hasCompletedOnboarding,
                isInvited,
                fullData: agent
            });

            return isInvited;
        });

        // Use enrollment requests from API endpoint
        const enrollmentReqs = enrollmentRequests;
        console.log('📋 Enrollment Requests from API:', enrollmentReqs);

        // Use active reps from API endpoint
        const active = activeAgentsList;
        console.log('✅ Active Reps from API:', active);

        console.log('🔄 Organizing reps by status:');
        console.log('📧 Invited:', invited.length, invited.map((a: { personalInfo: { name: any; }; _id: any; }) => ({ name: a.personalInfo?.name, id: a._id })));
        console.log('📋 Enrollment Requests:', enrollmentReqs.length, enrollmentReqs.map((a: { personalInfo: { name: any; }; _id: any; }) => ({ name: a.personalInfo?.name, id: a._id })));
        console.log('✅ Active:', active.length, active.map((a: { personalInfo: { name: any; }; _id: any; }) => ({ name: a.personalInfo?.name, id: a._id })));

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
        <div className="min-h-screen bg-antigravity-bg w-full max-w-full overflow-x-hidden text-antigravity-text">
            {/* Header with Navigation Tabs */}
            <header className="bg-antigravity-primary border-b border-antigravity-primary shadow-lg">
                {/* Top Header */}
                <div className="container mx-auto px-4 py-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-white/10 rounded-lg">
                                <Users size={24} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-white">Reps Management System</h1>
                                <p className="text-blue-100 text-sm">Manage reps through their complete lifecycle</p>
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="hidden lg:flex items-center space-x-6 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-sm">
                            <div className="text-center">
                                <div className="font-bold text-lg text-white">{reps.length}</div>
                                <div className="text-blue-100 text-xs">Total Reps</div>
                            </div>
                            <div className="text-center">
                                <div className="font-bold text-lg text-white">{invitedAgentsList.length}</div>
                                <div className="text-blue-100 text-xs">Invited</div>
                            </div>
                            <div className="text-center">
                                <div className="font-bold text-lg text-white">{enrollmentRequests.length}</div>
                                <div className="text-blue-100 text-xs">Requests</div>
                            </div>
                            <div className="text-center">
                                <div className="font-bold text-lg text-white">{activeAgentsList.length}</div>
                                <div className="text-blue-100 text-xs">Active</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="border-t border-white/20">
                    <div className="container mx-auto px-4">
                        <nav className="flex space-x-0">
                            {[
                                { id: 'matching', label: 'Smart Matching System', icon: '🎯', description: 'Find & match perfect reps' },
                                { id: 'invited', label: 'Invited Reps', icon: '📧', description: 'Pending invitations' },
                                { id: 'enrollment', label: 'Enrollment Requests', icon: '📋', description: 'Rep applications' },
                                { id: 'active', label: 'Active Reps', icon: '✅', description: 'Working reps' }
                            ].map(section => (
                                <button
                                    key={section.id}
                                    onClick={() => setActiveSection(section.id as any)}
                                    className={`flex-1 px-4 py-4 text-left transition-all duration-200 border-b-4 ${activeSection === section.id
                                        ? 'border-white bg-white/10'
                                        : 'border-transparent hover:bg-white/5 text-blue-100 hover:text-white'
                                        }`}
                                >
                                    <div className="flex items-center space-x-3">
                                        <span className="text-xl">{section.icon}</span>
                                        <div>
                                            <div className={`font-medium ${activeSection === section.id ? 'text-white' : 'text-blue-100 group-hover:text-white'}`}>
                                                {section.label}
                                            </div>
                                            <div className={`text-xs opacity-80 ${activeSection === section.id ? 'text-white' : 'text-blue-200'}`}>{section.description}</div>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto p-6 w-full max-w-full overflow-hidden">

                {/* Error Message */}
                {error && (
                    <div className="mb-6 bg-red-900/20 border-l-4 border-antigravity-accent text-antigravity-accent px-4 py-3 rounded-lg shadow-md backdrop-blur-sm">
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
                            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-antigravity-primary"></div>
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                                <Zap size={24} className="text-antigravity-primary animate-pulse" />
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
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h2 className="text-2xl font-bold text-antigravity-text">🎯 Smart Matching System</h2>
                                        <p className="text-antigravity-muted">Find and match the perfect reps for your gigs</p>
                                    </div>
                                    <button
                                        onClick={() => setShowWeights(!showWeights)}
                                        className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 text-sm font-medium ${showWeights
                                            ? 'bg-antigravity-primary text-white hover:bg-indigo-700'
                                            : 'bg-white border border-antigravity-border text-antigravity-text hover:bg-gray-50'
                                            }`}
                                    >
                                        <Settings size={16} className={showWeights ? 'rotate-180' : ''} />
                                        <span>{showWeights ? 'Close Weights' : 'Adjust Weights'}</span>
                                    </button>
                                </div>

                                {/* Weights Configuration Panel */}
                                {showWeights && (
                                    <div className="bg-antigravity-surface rounded-xl shadow-lg p-6 mb-6 transform transition-all duration-300 ease-in-out border border-antigravity-border overflow-hidden">
                                        <div className="flex justify-between items-center mb-4">
                                            <div className="flex items-center space-x-3">
                                                <div className="p-2 bg-antigravity-primary/10 rounded-lg shadow-sm border border-antigravity-primary/20">
                                                    <Settings size={20} className="text-antigravity-primary" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center space-x-2">
                                                        <h2 className="text-lg font-bold text-antigravity-text">Matching Weights Configuration</h2>
                                                        {hasUnsavedChanges && (
                                                            <span className="inline-flex items-center px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm font-medium animate-pulse border border-yellow-500/30">
                                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                                                </svg>
                                                                Unsaved changes
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-antigravity-muted text-sm mt-1">Customize how each factor influences the matching algorithm</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-4">
                                                <button
                                                    onClick={resetWeights}
                                                    disabled={loading}
                                                    className="px-6 py-3 bg-gray-600 text-white hover:bg-gray-700 rounded-xl shadow-lg transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                    </svg>
                                                    <span className="font-semibold">Reset to Default</span>
                                                </button>
                                                {selectedGig && gigHasWeights && (
                                                    <button
                                                        onClick={async () => {
                                                            if (!selectedGig) return;
                                                            try {
                                                                setLoading(true);
                                                                await resetGigWeights(selectedGig._id || '');
                                                                setGigHasWeights(false);
                                                                resetWeights(); // Reset UI weights to default
                                                                console.log('✅ Gig weights reset successfully');
                                                            } catch (error) {
                                                                console.error('❌ Error resetting gig weights:', error);
                                                                setError('Failed to reset gig weights');
                                                            } finally {
                                                                setLoading(false);
                                                            }
                                                        }}
                                                        disabled={loading}
                                                        className="px-6 py-3 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 rounded-xl shadow-lg transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                        <span className="font-semibold">Delete Saved Weights</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Weights Grid */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 w-full overflow-hidden">
                                            {Object.entries(weights).map(([key, value]) => (
                                                <div key={`weight-${key}`} className="bg-antigravity-bg rounded-xl p-3 shadow-md border border-antigravity-border hover:border-antigravity-primary/50 transition-all duration-200 group w-full max-w-full">
                                                    <div className="flex justify-between items-center mb-3">
                                                        <label className="text-xs font-bold text-antigravity-muted uppercase tracking-wider">
                                                            {key}
                                                        </label>
                                                        <div className={`px-2 py-1 rounded text-xs font-bold ${Math.round(value * 100) >= 20 ? 'bg-antigravity-primary/20 text-antigravity-primary shadow-sm shadow-antigravity-primary/10' :
                                                            Math.round(value * 100) >= 10 ? 'bg-antigravity-secondary/20 text-antigravity-secondary' :
                                                                'bg-antigravity-border text-antigravity-muted'
                                                            }`}>
                                                            {Math.round(value * 100)}%
                                                        </div>
                                                    </div>

                                                    {/* Custom Slider */}
                                                    <div className="relative mb-2 px-1">
                                                        <input
                                                            type="range"
                                                            min="0"
                                                            max="1"
                                                            step="0.05"
                                                            value={value}
                                                            onChange={(e: { target: { value: string; }; }) =>
                                                                handleWeightChange(key, parseFloat(e.target.value))
                                                            }
                                                            className="w-full h-1.5 bg-antigravity-surface rounded-full appearance-none cursor-pointer slider"
                                                            style={{
                                                                background: `linear-gradient(to right, #8b5cf6 0%, #3b82f6 ${value * 100}%, #2D3748 ${value * 100}%, #2D3748 100%)`
                                                            }}
                                                        />
                                                        <div
                                                            className="absolute top-1/2 transform -translate-y-1/2 w-4 h-4 bg-antigravity-text rounded-full shadow-lg border-2 border-antigravity-primary pointer-events-none transition-all duration-200 group-hover:scale-110 group-hover:bg-white"
                                                            style={{ left: `calc(${value * 100}% - 4px)` }}
                                                        ></div>
                                                    </div>

                                                </div>
                                            ))}
                                        </div>

                                        {/* Save Button */}
                                        {selectedGig && (
                                            <div className="flex justify-center">
                                                <button
                                                    onClick={() => {
                                                        console.log('🎯 BUTTON CLICKED - User manually clicked save button');
                                                        saveWeightsForGig();
                                                    }}
                                                    disabled={loading}
                                                    className={`group relative px-6 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 shadow-lg transform hover:-translate-y-0.5 hover:shadow-xl font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed ${hasUnsavedChanges
                                                        ? 'bg-gradient-to-r from-antigravity-accent to-red-600 hover:from-red-500 hover:to-red-700 text-white animate-pulse'
                                                        : gigHasWeights
                                                            ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white'
                                                            : 'bg-gradient-to-r from-antigravity-primary to-antigravity-secondary hover:from-antigravity-secondary hover:to-antigravity-primary text-white'
                                                        }`}
                                                >
                                                    {/* Animated Background */}
                                                    <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>

                                                    {/* Icon */}
                                                    {loading ? (
                                                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                                                    ) : (
                                                        <svg className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}

                                                    {/* Text */}
                                                    <span className="relative z-10">
                                                        {loading ? 'Saving...' :
                                                            hasUnsavedChanges ? `Save Changes` :
                                                                gigHasWeights ? `Update Weights` :
                                                                    `Save Weights`}
                                                    </span>

                                                    {/* Glow Effect */}
                                                    <div className={`absolute inset-0 rounded-lg blur-lg opacity-20 group-hover:opacity-40 transition-opacity duration-200 ${hasUnsavedChanges
                                                        ? 'bg-antigravity-accent'
                                                        : gigHasWeights
                                                            ? 'bg-green-500'
                                                            : 'bg-antigravity-primary'
                                                        }`}></div>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Search Input - Only show when a gig is selected */}
                                {selectedGig && (
                                    <div className="mb-6">
                                        <div className="relative max-w-md mx-auto">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <svg className="h-5 w-5 text-antigravity-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                </svg>
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="Search reps..."
                                                value={searchTerm}
                                                onChange={(e: { target: { value: any; }; }) => setSearchTerm(e.target.value)}
                                                className="block w-full pl-10 pr-3 py-3 border border-antigravity-border rounded-lg leading-5 bg-antigravity-surface placeholder-antigravity-muted focus:outline-none focus:placeholder-antigravity-text/50 focus:ring-2 focus:ring-antigravity-primary focus:border-antigravity-primary text-sm text-antigravity-text transition-all duration-200"
                                            />
                                            {searchTerm && (
                                                <button
                                                    onClick={() => setSearchTerm('')}
                                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                                >
                                                    <svg className="h-5 w-5 text-antigravity-muted hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Two Column Layout: Gigs and Reps */}
                                <div className="resizable-container flex gap-4 w-full max-w-full overflow-hidden">
                                    {/* Left Column: Gig Selection */}
                                    <div
                                        className="bg-antigravity-surface rounded-xl shadow-lg p-6 overflow-hidden transition-all duration-200 flex-shrink-0 border border-antigravity-border"
                                        style={{ width: `${leftColumnWidth}%`, minWidth: '280px', maxWidth: '50%' }}
                                    >
                                        <h3 className="text-xl font-semibold text-antigravity-text mb-4 flex items-center space-x-2">
                                            <Briefcase size={20} className="text-antigravity-primary" />
                                            <span>Available Gigs</span>
                                        </h3>

                                        <div className="space-y-3 max-h-96 overflow-y-auto">
                                            {gigs.map((gig: Gig) => {
                                                const isGigExpanded = expandedGigs.has(gig._id || '');

                                                return (
                                                    <div key={gig._id} className={`bg-white rounded-lg border transition-all duration-200 ${selectedGig?._id === gig._id
                                                        ? "border-antigravity-primary shadow-lg bg-antigravity-primary text-white"
                                                        : "border-antigravity-border hover:border-antigravity-muted hover:bg-gray-50"
                                                        }`}>
                                                        {/* Gig Header - Clickable for selection */}
                                                        <div
                                                            className="cursor-pointer p-4"
                                                            onClick={() => handleGigSelect(gig)}
                                                        >
                                                            <div className="flex items-center space-x-3 mb-3">
                                                                <div className={`p-2 rounded-lg ${selectedGig?._id === gig._id ? "bg-white/20" : "bg-antigravity-primary/10 border border-antigravity-primary/20"
                                                                    }`}>
                                                                    <Briefcase size={16} className={`${selectedGig?._id === gig._id ? "text-white" : "text-antigravity-primary"}`} />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <h4 className={`font-bold text-sm ${selectedGig?._id === gig._id ? "text-white" : "text-antigravity-text"
                                                                        }`}>
                                                                        {gig.title}
                                                                    </h4>
                                                                    <p className={`text-xs truncate ${selectedGig?._id === gig._id ? "text-blue-100" : "text-antigravity-muted"}`}>{gig.companyName}</p>
                                                                </div>
                                                            </div>

                                                            {selectedGig?._id === gig._id && (
                                                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
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
                                                                    ? "bg-white/20 text-white hover:bg-white/30"
                                                                    : "bg-gray-100 hover:bg-gray-200 text-antigravity-text hover:text-antigravity-primary"}`}
                                                            >
                                                                <span>View Details</span>
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
                                                            <div className="px-4 pb-4 border-t border-antigravity-border bg-antigravity-bg/30 overflow-hidden">
                                                                <div className="pt-4 space-y-4 text-sm overflow-hidden">

                                                                    {/* 1. Industries */}
                                                                    {gig.industries && gig.industries.length > 0 && (
                                                                        <div>
                                                                            <p className="text-antigravity-muted font-medium mb-2">Industries:</p>
                                                                            <div className="flex flex-wrap gap-1">
                                                                                {gig.industries.map((industry: any, i: number) => {
                                                                                    const displayName = industry.name ||
                                                                                        (typeof industry === 'string' && !industry.match(/^[0-9a-fA-F]{24}$/) ? industry : 'Industry');
                                                                                    return (
                                                                                        <span key={i} className="px-2 py-1 bg-orange-500/20 text-orange-300 border border-orange-500/30 rounded text-xs">
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
                                                                            <p className="text-antigravity-muted font-medium mb-2">Activities:</p>
                                                                            <div className="flex flex-wrap gap-1">
                                                                                {gig.activities.map((activity: any, i: number) => {
                                                                                    const displayName = activity.name ||
                                                                                        (typeof activity === 'string' && !activity.match(/^[0-9a-fA-F]{24}$/) ? activity : 'Activity');
                                                                                    return (
                                                                                        <span key={i} className="px-2 py-1 bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded text-xs">
                                                                                            {displayName}
                                                                                        </span>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {/* 3. Experience */}
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-antigravity-muted font-medium">Experience:</span>
                                                                        <span className="font-semibold">{gig.seniority?.yearsExperience || 'N/A'} years</span>
                                                                    </div>

                                                                    {/* 4. Languages */}
                                                                    {gig.skills?.languages && gig.skills.languages.length > 0 && (
                                                                        <div>
                                                                            <p className="text-antigravity-muted font-medium mb-2">Languages:</p>
                                                                            <div className="flex flex-wrap gap-1">
                                                                                {gig.skills.languages.map((lang: any, i: number) => (
                                                                                    <span key={i} className="px-2 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded text-xs">
                                                                                        {getLanguageNameByCode(lang.language || lang.iso639_1 || lang)}
                                                                                        {lang.proficiency && <span className="ml-1 text-purple-200">({lang.proficiency})</span>}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {/* 5. Availability */}
                                                                    {gig.availability && (
                                                                        <div>
                                                                            <span className="text-antigravity-muted font-medium">Availability:</span>
                                                                            <p className="font-semibold">
                                                                                {gig.availability.schedule ? `${gig.availability.schedule.length} days/week` :
                                                                                    gig.availability.hoursPerWeek ? `${gig.availability.hoursPerWeek}h/week` :
                                                                                        (gig.availability as any).workingHours && typeof (gig.availability as any).workingHours === 'string' ? (gig.availability as any).workingHours :
                                                                                            'Flexible'}
                                                                            </p>
                                                                        </div>
                                                                    )}

                                                                    {/* 6. Skills - Professional */}
                                                                    {gig.skills?.professional && gig.skills.professional.length > 0 && (
                                                                        <div>
                                                                            <p className="text-antigravity-muted font-medium mb-2">Professional Skills:</p>
                                                                            <div className="flex flex-wrap gap-1">
                                                                                {gig.skills.professional.map((skillItem: any, i: number) => (
                                                                                    <span key={`prof-${i}`} className="px-2 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded text-xs">
                                                                                        {getSkillNameById(skillItem.skill || skillItem, 'professional')}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {/* 6. Skills - Technical */}
                                                                    {gig.skills?.technical && gig.skills.technical.length > 0 && (
                                                                        <div>
                                                                            <p className="text-antigravity-muted font-medium mb-2">Technical Skills:</p>
                                                                            <div className="flex flex-wrap gap-1">
                                                                                {gig.skills.technical.map((skillItem: any, i: number) => (
                                                                                    <span key={`tech-${i}`} className="px-2 py-1 bg-green-500/20 text-green-300 border border-green-500/30 rounded text-xs">
                                                                                        {getSkillNameById(skillItem.skill || skillItem, 'technical')}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {/* 6. Skills - Soft */}
                                                                    {gig.skills?.soft && gig.skills.soft.length > 0 && (
                                                                        <div>
                                                                            <p className="text-antigravity-muted font-medium mb-2">Soft Skills:</p>
                                                                            <div className="flex flex-wrap gap-1">
                                                                                {gig.skills.soft.map((skillItem: any, i: number) => (
                                                                                    <span key={`soft-${i}`} className="px-2 py-1 bg-pink-500/20 text-pink-300 border border-pink-500/30 rounded text-xs">
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
                                                                                <span className="text-antigravity-muted font-medium">Region:</span>
                                                                                <p className="font-semibold">
                                                                                    {typeof gig.region === 'string' ? gig.region : (gig.region as any).name || 'Unknown Region'}
                                                                                </p>
                                                                            </div>
                                                                        )}
                                                                        {gig.timezone && (
                                                                            <div>
                                                                                <span className="text-antigravity-muted font-medium">Timezone:</span>
                                                                                <p className="font-semibold">
                                                                                    {typeof gig.timezone === 'string'
                                                                                        ? gig.timezone
                                                                                        : (gig.timezone as any).name || (gig.timezone as any).timezoneName || 'Unknown Timezone'}
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
                                        className={`flex-shrink-0 w-1 bg-antigravity-border hover:bg-antigravity-primary cursor-col-resize transition-colors duration-200 rounded-full flex items-center justify-center group ${isResizing ? 'bg-antigravity-primary' : ''}`}
                                        onMouseDown={handleMouseDown}
                                        title="Drag to resize"
                                    >
                                        <div className="w-0.5 h-8 bg-antigravity-muted group-hover:bg-white rounded-full transition-colors duration-200"></div>
                                    </div>

                                    {/* Right Column: Matching Results */}
                                    <div
                                        className="bg-antigravity-surface rounded-xl shadow-lg p-6 overflow-hidden transition-all duration-200 flex-1 min-w-0 border border-antigravity-border"
                                    >
                                        <h3 className="text-xl font-semibold text-antigravity-text mb-4 flex items-center space-x-2">
                                            <Users size={20} className="text-antigravity-primary" />
                                            <span>{selectedGig ? `Matches for "${selectedGig.title}"` : 'Select a Gig to See Matches'}</span>
                                        </h3>

                                        {!selectedGig ? (
                                            <div className="text-center py-12">
                                                <div className="bg-antigravity-bg rounded-xl p-8 max-w-md mx-auto border border-antigravity-border">
                                                    <Briefcase size={48} className="text-antigravity-muted mx-auto mb-4" />
                                                    <p className="text-antigravity-text text-lg mb-2">No gig selected</p>
                                                    <p className="text-sm text-antigravity-muted">Choose a gig from the left to see matching reps</p>
                                                </div>
                                            </div>
                                        ) : loading ? (
                                            <div className="flex justify-center items-center py-12">
                                                <div className="relative">
                                                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-antigravity-primary"></div>
                                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                                                        <Zap size={16} className="text-antigravity-primary animate-pulse" />
                                                    </div>
                                                </div>
                                            </div>
                                        ) : filteredMatches.length > 0 ? (
                                            <div className="space-y-3 max-h-96 overflow-y-auto">
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



                                                    const matchScore = Math.round((match.totalMatchingScore || 0) * 100);
                                                    const cardBgColor = matchScore >= 70 ? 'bg-white border-green-500/30 hover:border-green-500/60 shadow-lg' :
                                                        matchScore >= 50 ? 'bg-white border-yellow-500/30 hover:border-yellow-500/60 shadow-lg' :
                                                            'bg-white border-red-500/30 hover:border-red-500/60 shadow-lg';

                                                    const isExpanded = expandedReps.has(match.agentId);

                                                    return (
                                                        <div key={`match-${match.agentId}-${index}`} className={`rounded-xl p-6 border transition-all duration-300 ${cardBgColor}`}>
                                                            {/* Rep Header */}
                                                            <div className="flex items-center justify-between mb-4">
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-3 mb-2">
                                                                        <h4
                                                                            className="text-lg font-bold text-antigravity-text truncate cursor-pointer hover:text-antigravity-primary transition-colors"
                                                                            onClick={() => toggleRepDetails(match.agentId)}
                                                                        >
                                                                            {match.agentInfo?.name}
                                                                        </h4>
                                                                        <div className={`px-4 py-2 rounded-full text-sm font-bold shadow-sm ${matchScore >= 70 ? 'bg-green-500 text-white' :
                                                                            matchScore >= 50 ? 'bg-yellow-500 text-white' :
                                                                                'bg-red-500 text-white'
                                                                            }`}>
                                                                            {matchScore}% Match
                                                                        </div>
                                                                    </div>
                                                                    <p className="text-sm text-antigravity-muted truncate">{match.agentInfo?.email}</p>
                                                                    <div className="flex items-center gap-4 text-xs text-antigravity-muted mt-1">
                                                                        {(match.agentInfo?.timezone?.countryName || match.agentInfo?.location) && (
                                                                            <span>📍 {match.agentInfo?.timezone?.countryName || match.agentInfo?.location}</span>
                                                                        )}
                                                                        {match.agentInfo?.timezone?.gmtDisplay && match.agentInfo.timezone.gmtDisplay !== 'Unknown' && (
                                                                            <span>🕒 {match.agentInfo.timezone.gmtDisplay}</span>
                                                                        )}
                                                                        {match.agentInfo?.professionalSummary?.yearsOfExperience && (
                                                                            <span>💼 {match.agentInfo.professionalSummary.yearsOfExperience.toString().replace(/\s+years?/gi, '')} years exp.</span>
                                                                        )}
                                                                        {match.agentInfo?.personalInfo?.languages && match.agentInfo.personalInfo.languages.length > 0 && (
                                                                            <span>🗣️ {match.agentInfo.personalInfo.languages.length} languages</span>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div className="flex-shrink-0 ml-4">
                                                                    {isEnrolled ? (
                                                                        <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                                                                            Enrolled
                                                                        </span>
                                                                    ) : match.alreadyEnrolled ? (
                                                                        <span className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                                                                            Already Enrolled
                                                                        </span>
                                                                    ) : isInvited ? (
                                                                        <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                                                                            Invited
                                                                        </span>
                                                                    ) : (
                                                                        <button
                                                                            className="inline-flex items-center px-3 py-1 bg-antigravity-primary text-white rounded-lg hover:bg-indigo-700 transition-all duration-200 text-sm font-medium gap-1 shadow-sm"
                                                                            onClick={() => handleCreateGigAgent(match)}
                                                                            disabled={creatingGigAgent}
                                                                        >
                                                                            <Zap className="w-4 h-4" />
                                                                            Invite
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* View Details Button */}
                                                            <div className="flex justify-center mt-4">
                                                                <button
                                                                    onClick={() => toggleRepDetails(match.agentId)}
                                                                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-lg transition-all duration-200 text-sm font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                                                                >
                                                                    <span>{isExpanded ? 'Hide Details' : 'View Details'}</span>
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
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-full overflow-hidden">

                                                                        {/* Skills Match */}
                                                                        {match.skillsMatch && (
                                                                            <div className="bg-antigravity-surface rounded-lg p-4 shadow-sm">
                                                                                <div className="flex items-center justify-between mb-2">
                                                                                    <h5 className="font-semibold text-antigravity-text">Skills Match</h5>
                                                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${Math.round((match.skillsMatch.score || 0) * 100) >= 70 ? 'bg-green-100 text-green-800' :
                                                                                        Math.round((match.skillsMatch.score || 0) * 100) >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                                                                            'bg-red-100 text-red-800'
                                                                                        }`}>
                                                                                        {Math.round((match.skillsMatch.score || 0) * 100)}%
                                                                                    </span>
                                                                                </div>
                                                                                {match.skillsMatch.details?.matchingSkills && match.skillsMatch.details.matchingSkills.length > 0 && (
                                                                                    <div className="space-y-1">
                                                                                        <p className="text-xs text-antigravity-muted mb-2">Matched Skills:</p>
                                                                                        <div className="flex flex-wrap gap-1">
                                                                                            {match.skillsMatch.details.matchingSkills.slice(0, 3).map((skill: any, i: number) => (
                                                                                                <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                                                                                    {skill.skill?.name || skill.skillName || getSkillNameById(skill._id || skill.skillId || skill, skill.category || 'professional')}
                                                                                                </span>
                                                                                            ))}
                                                                                            {match.skillsMatch.details.matchingSkills.length > 3 && (
                                                                                                <span className="px-2 py-1 bg-antigravity-bg text-antigravity-muted rounded text-xs">
                                                                                                    +{match.skillsMatch.details.matchingSkills.length - 3}
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                )}

                                                                            </div>
                                                                        )}

                                                                        {/* Languages Match */}
                                                                        {match.languageMatch && (
                                                                            <div className="bg-antigravity-surface rounded-lg p-4 shadow-sm">
                                                                                <div className="flex items-center justify-between mb-2">
                                                                                    <h5 className="font-semibold text-antigravity-text">Languages</h5>
                                                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${Math.round((match.languageMatch.score || 0) * 100) >= 70 ? 'bg-green-100 text-green-800' :
                                                                                        Math.round((match.languageMatch.score || 0) * 100) >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                                                                            'bg-red-100 text-red-800'
                                                                                        }`}>
                                                                                        {Math.round((match.languageMatch.score || 0) * 100)}%
                                                                                    </span>
                                                                                </div>
                                                                                {match.languageMatch.details?.matchingLanguages && match.languageMatch.details.matchingLanguages.length > 0 && (
                                                                                    <div className="space-y-1">
                                                                                        <p className="text-xs text-antigravity-muted mb-2">Matched Languages:</p>
                                                                                        <div className="flex flex-wrap gap-1">
                                                                                            {match.languageMatch.details.matchingLanguages.slice(0, 3).map((lang: any, i: number) => (
                                                                                                <span key={i} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                                                                                                    {lang.language?.name || lang.languageName || getLanguageNameByCode(lang.language || lang.code || lang)}
                                                                                                    {lang.agentLevel && <span className="ml-1 text-purple-800">({lang.agentLevel})</span>}
                                                                                                </span>
                                                                                            ))}
                                                                                            {match.languageMatch.details.matchingLanguages.length > 3 && (
                                                                                                <span className="px-2 py-1 bg-antigravity-bg text-antigravity-muted rounded text-xs">
                                                                                                    +{match.languageMatch.details.matchingLanguages.length - 3}
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                )}

                                                                            </div>
                                                                        )}

                                                                        {/* Industry Match */}
                                                                        {match.industryMatch && (
                                                                            <div className="bg-antigravity-surface rounded-lg p-4 shadow-sm">
                                                                                <div className="flex items-center justify-between mb-2">
                                                                                    <h5 className="font-semibold text-antigravity-text">Industry</h5>
                                                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${Math.round((match.industryMatch.score || 0) * 100) >= 70 ? 'bg-green-100 text-green-800' :
                                                                                        Math.round((match.industryMatch.score || 0) * 100) >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                                                                            'bg-red-100 text-red-800'
                                                                                        }`}>
                                                                                        {Math.round((match.industryMatch.score || 0) * 100)}%
                                                                                    </span>
                                                                                </div>
                                                                                {match.industryMatch.details?.matchingIndustries && match.industryMatch.details.matchingIndustries.length > 0 && (
                                                                                    <div className="space-y-1">
                                                                                        <p className="text-xs text-antigravity-muted mb-2">Matched Industries:</p>
                                                                                        <div className="flex flex-wrap gap-1">
                                                                                            {match.industryMatch.details.matchingIndustries.slice(0, 2).map((industry: any, i: number) => (
                                                                                                <span key={i} className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                                                                                                    {industry.industry?.name || industry.industryName || industry.name || industry}
                                                                                                </span>
                                                                                            ))}
                                                                                            {match.industryMatch.details.matchingIndustries.length > 2 && (
                                                                                                <span className="px-2 py-1 bg-antigravity-bg text-antigravity-muted rounded text-xs">
                                                                                                    +{match.industryMatch.details.matchingIndustries.length - 2}
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                )}

                                                                            </div>
                                                                        )}

                                                                        {/* Experience Match */}
                                                                        {match.experienceMatch && (
                                                                            <div className="bg-antigravity-surface rounded-lg p-4 shadow-sm">
                                                                                <div className="flex items-center justify-between mb-2">
                                                                                    <h5 className="font-semibold text-antigravity-text">Experience</h5>
                                                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${Math.round((match.experienceMatch.score || 0) * 100) >= 70 ? 'bg-green-100 text-green-800' :
                                                                                        Math.round((match.experienceMatch.score || 0) * 100) >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                                                                            'bg-red-100 text-red-800'
                                                                                        }`}>
                                                                                        {Math.round((match.experienceMatch.score || 0) * 100)}%
                                                                                    </span>
                                                                                </div>
                                                                                <div className="text-xs text-antigravity-muted">
                                                                                    <p>Rep: {match.agentInfo?.professionalSummary?.yearsOfExperience || 'N/A'} years</p>
                                                                                    <p>Required: {selectedGig?.seniority?.yearsExperience || 'N/A'} years</p>
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                    </div>

                                                                    {/* Second Row */}
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-full overflow-hidden">

                                                                        {/* Timezone Match */}
                                                                        {match.timezoneMatch && (
                                                                            <div className="bg-antigravity-surface rounded-lg p-4 shadow-sm">
                                                                                <div className="flex items-center justify-between mb-2">
                                                                                    <h5 className="font-semibold text-antigravity-text">Timezone</h5>
                                                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${Math.round((match.timezoneMatch.score || 0) * 100) >= 70 ? 'bg-green-100 text-green-800' :
                                                                                        Math.round((match.timezoneMatch.score || 0) * 100) >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                                                                            'bg-red-100 text-red-800'
                                                                                        }`}>
                                                                                        {Math.round((match.timezoneMatch.score || 0) * 100)}%
                                                                                    </span>
                                                                                </div>
                                                                                <div className="text-xs text-antigravity-muted">
                                                                                    <p>Rep: {match.agentInfo?.timezone?.gmtDisplay || 'N/A'}</p>
                                                                                    <p>Zone: {match.agentInfo?.timezone?.timezoneName || match.agentInfo?.availability?.timeZone?.zoneName || 'N/A'}</p>
                                                                                    <p>Location: {match.agentInfo?.timezone?.countryName || match.agentInfo?.personalInfo?.country?.name || match.agentInfo?.location || 'N/A'}</p>
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        {/* Region Match */}
                                                                        {match.regionMatch && (
                                                                            <div className="bg-antigravity-surface rounded-lg p-4 shadow-sm">
                                                                                <div className="flex items-center justify-between mb-2">
                                                                                    <h5 className="font-semibold text-antigravity-text">Region</h5>
                                                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${Math.round((match.regionMatch.score || 0) * 100) >= 70 ? 'bg-green-100 text-green-800' :
                                                                                        Math.round((match.regionMatch.score || 0) * 100) >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                                                                            'bg-red-100 text-red-800'
                                                                                        }`}>
                                                                                        {Math.round((match.regionMatch.score || 0) * 100)}%
                                                                                    </span>
                                                                                </div>
                                                                                <div className="text-xs text-antigravity-muted">
                                                                                    <p>Country: {match.agentInfo?.timezone?.countryName || match.agentInfo?.personalInfo?.country?.name || 'N/A'}</p>
                                                                                    <p>Code: {match.agentInfo?.timezone?.countryCode || match.agentInfo?.personalInfo?.country?.code || 'N/A'}</p>
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        {/* Availability Match */}
                                                                        {match.availabilityMatch && (
                                                                            <div className="bg-antigravity-surface rounded-lg p-4 shadow-sm">
                                                                                <div className="flex items-center justify-between mb-2">
                                                                                    <h5 className="font-semibold text-antigravity-text">Availability</h5>
                                                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${Math.round((match.availabilityMatch.score || 0) * 100) >= 70 ? 'bg-green-100 text-green-800' :
                                                                                        Math.round((match.availabilityMatch.score || 0) * 100) >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                                                                            'bg-red-100 text-red-800'
                                                                                        }`}>
                                                                                        {Math.round((match.availabilityMatch.score || 0) * 100)}%
                                                                                    </span>
                                                                                </div>
                                                                                <div className="text-xs text-antigravity-muted">
                                                                                    <p>Schedule: {match.agentInfo?.availability?.schedule?.length || 0} days/week</p>
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        {/* Activity Match */}
                                                                        {match.activityMatch && (
                                                                            <div className="bg-antigravity-surface rounded-lg p-4 shadow-sm">
                                                                                <div className="flex items-center justify-between mb-2">
                                                                                    <h5 className="font-semibold text-antigravity-text">Activities</h5>
                                                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${Math.round((match.activityMatch.score || 0) * 100) >= 70 ? 'bg-green-100 text-green-800' :
                                                                                        Math.round((match.activityMatch.score || 0) * 100) >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                                                                            'bg-red-100 text-red-800'
                                                                                        }`}>
                                                                                        {Math.round((match.activityMatch.score || 0) * 100)}%
                                                                                    </span>
                                                                                </div>
                                                                                {match.activityMatch.details?.matchingActivities && match.activityMatch.details.matchingActivities.length > 0 && (
                                                                                    <div className="space-y-1">
                                                                                        <p className="text-xs text-antigravity-muted mb-2">Matched Activities:</p>
                                                                                        <div className="flex flex-wrap gap-1">
                                                                                            {match.activityMatch.details.matchingActivities.slice(0, 2).map((activity: any, i: number) => (
                                                                                                <span key={i} className="px-2 py-1 bg-teal-100 text-teal-700 rounded text-xs font-medium">
                                                                                                    {activity.activity?.name || activity.activityName || activity.name || activity}
                                                                                                </span>
                                                                                            ))}
                                                                                            {match.activityMatch.details.matchingActivities.length > 2 && (
                                                                                                <span className="px-2 py-1 bg-antigravity-bg text-antigravity-muted rounded text-xs">
                                                                                                    +{match.activityMatch.details.matchingActivities.length - 2}
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
                                                    <svg className="w-12 h-12 text-antigravity-muted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                    </svg>
                                                    <p className="text-antigravity-text mb-2">No reps found for "{searchTerm}"</p>
                                                    <p className="text-sm text-antigravity-muted">Try adjusting your search terms</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-8">
                                                <div className="bg-antigravity-surface rounded-xl p-6 max-w-md mx-auto">
                                                    <Briefcase size={24} className="text-antigravity-muted mx-auto mb-2" />
                                                    <p className="text-antigravity-text">No matches found for this gig.</p>
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
                        )}

                        {/* 2. INVITED REPS */}
                        {activeSection === 'invited' && (
                            <div className="space-y-6">
                                <div className="flex items-center space-x-3 mb-2">
                                    <h2 className="text-2xl font-bold text-antigravity-text">📧 Invited Reps</h2>
                                    <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium border border-yellow-200">
                                        {invitedAgentsList.length} Pending
                                    </span>
                                </div>
                                <p className="text-antigravity-muted">Reps who have been invited but haven't responded yet</p>

                                <div className="bg-antigravity-surface rounded-xl shadow-lg p-6">
                                    {invitedAgentsList.length > 0 ? (
                                        <div className="space-y-4">
                                            {invitedAgentsList.map((agent: { _id: any; personalInfo: { name: any; email: any; }; gigId: { title: any; }; gig: { title: any; }; }, index: any) => {
                                                console.log('🔍 Invited Agent Data:', agent);

                                                return (
                                                    <div key={`invited-${agent._id}-${index}`} className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 hover:shadow-md transition-all duration-200">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex-1">
                                                                <h3 className="text-lg font-bold text-gray-900">{agent.personalInfo?.name}</h3>
                                                                <p className="text-antigravity-muted">{agent.personalInfo?.email}</p>
                                                                <div className="mt-2 space-y-1">
                                                                    <p className="text-sm text-yellow-600 font-medium bg-yellow-100/50 inline-block px-2 py-0.5 rounded">
                                                                        Invited • Waiting for response
                                                                    </p>
                                                                    {(agent.gigId?.title || agent.gig?.title) && (
                                                                        <p className="text-sm text-antigravity-muted">
                                                                            <span className="font-medium">Gig:</span> {agent.gigId?.title || agent.gig?.title}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center space-x-2">
                                                                <span className="inline-flex items-center px-3 py-2 bg-yellow-900/40 text-yellow-300 rounded-lg text-sm font-medium">
                                                                    📧 Pending
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12">
                                            <div className="bg-antigravity-bg rounded-xl p-8 max-w-md mx-auto border border-antigravity-border">
                                                <div className="text-6xl mb-4">📧</div>
                                                <p className="text-antigravity-text text-lg mb-2">No pending invitations</p>
                                                <p className="text-sm text-antigravity-muted">All invitations have been responded to.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 3. ENROLLMENT REQUESTS */}
                        {activeSection === 'enrollment' && (
                            <div className="space-y-6">
                                <div className="flex items-center space-x-3 mb-2">
                                    <h2 className="text-2xl font-bold text-antigravity-text">📋 Enrollment Requests</h2>
                                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium border border-blue-200">
                                        {enrollmentRequests.length} Requests
                                    </span>
                                </div>
                                <p className="text-antigravity-muted">Reps who accepted invitations and are requesting to join</p>

                                <div className="bg-antigravity-surface rounded-xl shadow-lg p-6">
                                    {enrollmentRequests.length > 0 ? (
                                        <div className="space-y-4">
                                            {enrollmentRequests.map((agent: { _id: string; agentId: { personalInfo: { name: any; email: any; }; }; enrollmentStatus: any; gigId: { title: any; }; gig: { title: any; }; notes: any; }, index: any) => (
                                                <div key={`enrollment-${agent._id}-${index}`} className="bg-blue-50 border border-blue-200 rounded-xl p-5 hover:shadow-md transition-all duration-200">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex-1">
                                                            <h3 className="text-lg font-bold text-gray-900">{agent.agentId?.personalInfo?.name}</h3>
                                                            <p className="text-antigravity-muted">{agent.agentId?.personalInfo?.email}</p>
                                                            <div className="mt-2 space-y-1">
                                                                <p className="text-sm text-blue-600 font-medium">
                                                                    <span className="font-medium">Status:</span> {agent.enrollmentStatus}
                                                                </p>
                                                                {(agent.gigId?.title || agent.gig?.title) && (
                                                                    <p className="text-sm text-antigravity-muted">
                                                                        <span className="font-medium">Gig:</span> {agent.gigId?.title || agent.gig?.title}
                                                                    </p>
                                                                )}
                                                                {agent.notes && (
                                                                    <p className="text-sm text-antigravity-muted italic">
                                                                        "{agent.notes}"
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center space-x-2">
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
                                                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 text-sm font-medium"
                                                            >
                                                                ✅ Approve
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
                                                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 text-sm font-medium"
                                                            >
                                                                ❌ Reject
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12">
                                            <div className="bg-antigravity-bg rounded-xl p-8 max-w-md mx-auto border border-antigravity-border">
                                                <div className="text-6xl mb-4">📋</div>
                                                <p className="text-antigravity-text text-lg mb-2">No enrollment requests</p>
                                                <p className="text-sm text-antigravity-muted">No reps are waiting for approval.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 4. ACTIVE REPS */}
                        {activeSection === 'active' && (
                            <div className="space-y-6">
                                <div className="flex items-center space-x-3 mb-2">
                                    <h2 className="text-2xl font-bold text-antigravity-text">✅ Active Reps</h2>
                                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium border border-green-200">
                                        {activeAgentsList.length} Active
                                    </span>
                                </div>
                                <p className="text-antigravity-muted">Reps who are approved and actively working</p>

                                <div className="bg-antigravity-surface rounded-xl shadow-lg p-6">
                                    {activeAgentsList.length > 0 ? (
                                        <div className="space-y-4">
                                            {activeAgentsList.map((agent: { _id: any; agentId: { personalInfo: { name: any; email: any; languages: string | any[]; }; professionalSummary: { yearsOfExperience: any; currentRole: any; keyExpertise: any[]; }; availability: { schedule: string | any[]; }; onboardingProgress: { currentPhase: number; }; }; gigId: { title: any; }; gig: { title: any; }; }, index: any) => (
                                                <div key={`active-${agent._id}-${index}`} className="bg-green-50 border border-green-200 rounded-xl p-5 hover:shadow-md transition-all duration-200">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-3 mb-2">
                                                                <h3 className="text-lg font-bold text-gray-900">{agent.agentId?.personalInfo?.name}</h3>
                                                                <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium border border-green-200">
                                                                    ✅ Active
                                                                </span>
                                                            </div>
                                                            <p className="text-antigravity-muted mb-2">{agent.agentId?.personalInfo?.email}</p>

                                                            <div className="mt-3 space-y-2">
                                                                {(agent.gigId?.title || agent.gig?.title) && (
                                                                    <div className="mb-2">
                                                                        <p className="text-sm text-antigravity-muted">
                                                                            <span className="font-medium">Gig:</span> {agent.gigId?.title || agent.gig?.title}
                                                                        </p>
                                                                    </div>
                                                                )}
                                                                <div className="flex items-center gap-4 text-sm">
                                                                    <span className="text-antigravity-muted">
                                                                        <span className="font-medium">Experience:</span> {agent.agentId?.professionalSummary?.yearsOfExperience} years
                                                                    </span>
                                                                    <span className="text-antigravity-muted">
                                                                        <span className="font-medium">Role:</span> {agent.agentId?.professionalSummary?.currentRole}
                                                                    </span>
                                                                </div>

                                                                <div className="flex flex-wrap gap-2">
                                                                    {agent.agentId?.professionalSummary?.keyExpertise?.slice(0, 5).map((skill: any, i: any) => (
                                                                        <span key={i} className="px-2 py-1 bg-green-900/30 text-green-300 rounded text-xs">
                                                                            {skill}
                                                                        </span>
                                                                    ))}
                                                                    {agent.agentId?.professionalSummary?.keyExpertise?.length > 5 && (
                                                                        <span className="px-2 py-1 bg-antigravity-bg text-antigravity-muted rounded text-xs">
                                                                            +{agent.agentId.professionalSummary.keyExpertise.length - 5} more
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                <div className="flex flex-wrap gap-4 text-sm text-antigravity-muted">
                                                                    <div>
                                                                        <span className="font-medium">Availability:</span> {agent.agentId?.availability?.schedule?.length} days/week
                                                                    </div>
                                                                    <div>
                                                                        <span className="font-medium">Status:</span> {agent.agentId?.onboardingProgress?.currentPhase === 4 ? 'Fully Onboarded' : 'In Progress'}
                                                                    </div>
                                                                    <div>
                                                                        <span className="font-medium">Languages:</span> {agent.agentId?.personalInfo?.languages?.length || 0}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-col items-end space-y-2">
                                                            <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200 text-sm font-medium">
                                                                Manage Profile
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12">
                                            <div className="bg-antigravity-bg rounded-xl p-8 max-w-md mx-auto border border-antigravity-border">
                                                <div className="text-6xl mb-4">✅</div>
                                                <p className="text-antigravity-text text-lg mb-2">No active reps</p>
                                                <p className="text-sm text-antigravity-muted">Start by finding matches and inviting reps.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}

export default MatchingDashboard;
