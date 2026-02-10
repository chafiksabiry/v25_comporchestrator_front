import React, { useEffect, useState } from 'react';
import {
    ArrowLeft,
    Mail,
    Phone,
    MapPin,
    Clock,
    Globe,
    Award,
    BookOpen,
    Briefcase,
    Star,
    CheckCircle2,
    Share2,
    Linkedin,
    Twitter,
    Download,
    Play,
    Calendar,
    Shield,
    Target,
    Video,
    Zap
} from 'lucide-react';
import { createGigAgent } from '../api/matching';

interface AgentDetailsPageProps {
    agentId?: string; // Optional prop if used directly
    onBack?: () => void;
    gigId?: string;
}

export default function AgentDetailsPage({ agentId: propAgentId, onBack, gigId: propGigId }: AgentDetailsPageProps) {
    const [agent, setAgent] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'experience' | 'skills'>('overview');
    const [isAvailable, setIsAvailable] = useState(false);

    // Priority: Prop -> URL -> LocalStorage
    const [gigId, setGigId] = useState<string | null>(() => {
        // Always check for gigId, regardless of how agentId (propAgentId) is provided
        if (propGigId) return propGigId; // Check prop first if it exists in interface

        const params = new URLSearchParams(window.location.search);
        const urlGigId = params.get('gigId');
        if (urlGigId) return urlGigId;

        const stored = localStorage.getItem('selectedGigId');
        return stored || null;
    });

    const [inviteStatus, setInviteStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
    const [inviteMessage, setInviteMessage] = useState<string | null>(null);

    // Use prop or URL param (manual parsing as fallback)
    const [idToUse, setIdToUse] = useState<string | undefined>(propAgentId);

    useEffect(() => {
        if (propAgentId) {
            setIdToUse(propAgentId);
        } else {
            // Priority: URL Query Param -> URL Path -> LocalStorage
            const searchParams = new URLSearchParams(window.location.search);
            const urlGigId = searchParams.get('gigId');

            if (urlGigId) {
                console.log("Found gigId in URL:", urlGigId);
                setGigId(urlGigId);
            } else {
                // Fallback to local storage if not in URL
                if (!gigId) {
                    const storedGigId = localStorage.getItem('selectedGigId');
                    if (storedGigId) setGigId(storedGigId);
                }
            }

            // Fallback: try to get ID from URL if not provided via prop
            try {
                // Handle /agent-details/:id
                const match = window.location.pathname.match(/\/agent-details\/([a-zA-Z0-9]+)/);
                if (match && match[1]) {
                    setIdToUse(match[1]);
                } else {
                    // Also handle query param ?agentId=... if needed
                    const urlAgentId = searchParams.get('agentId');
                    if (urlAgentId) setIdToUse(urlAgentId);
                }
            } catch (e) {
                console.warn("Could not parse agent ID from URL");
            }
        }
    }, [propAgentId]);

    useEffect(() => {
        const fetchAgent = async () => {
            if (!idToUse) return;
            try {
                setLoading(true);
                const response = await fetch(`${import.meta.env.VITE_MATCHING_API_URL || 'http://localhost:5011/api'}/agents/${idToUse}`);
                if (!response.ok) throw new Error('Failed to fetch agent details');
                const data = await response.json();
                setAgent(data);

                // Calculate availability once data is loaded
                checkAvailability(data);
            } catch (err) {
                console.error("Error fetching agent:", err);
                setError("Failed to load agent details. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        fetchAgent();
    }, [idToUse]);

    // Helper function to check availability
    const checkAvailability = (agentData: any) => {
        if (!agentData?.availability?.schedule || !agentData?.availability?.timeZone) {
            setIsAvailable(false);
            return;
        }

        try {
            // Get current UTC time
            const now = new Date();
            const utc = now.getTime() + (now.getTimezoneOffset() * 60000);

            // Adjust to agent's timezone
            // gmtOffset is in seconds
            const agentTime = new Date(utc + (agentData.availability.timeZone.gmtOffset * 1000));

            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const currentDayName = days[agentTime.getDay()];

            // Find schedule for today using the agent's local day
            const todaySchedule = agentData.availability.schedule.find((s: any) => s.day === currentDayName);

            if (todaySchedule?.hours) {
                const currentMinutes = agentTime.getHours() * 60 + agentTime.getMinutes();

                const [startH, startM] = todaySchedule.hours.start.split(':').map(Number);
                const [endH, endM] = todaySchedule.hours.end.split(':').map(Number);

                const startTotal = startH * 60 + startM;
                const endTotal = endH * 60 + endM;

                setIsAvailable(currentMinutes >= startTotal && currentMinutes < endTotal);
            } else {
                setIsAvailable(false);
            }
        } catch (e) {
            console.error("Error calculating availability", e);
            setIsAvailable(false);
        }
    };

    const handleInviteToGig = async () => {
        if (!gigId || !agent) return;

        setInviteStatus('sending');
        setInviteMessage(null);

        try {
            // Need to pass the agent ID and gig ID
            await createGigAgent({
                agentId: agent._id || agent.id,
                gigId: gigId
            });

            setInviteStatus('success');
            setInviteMessage('Agent invited successfully');

            // Reset status after a delay
            setTimeout(() => {
                setInviteStatus('idle');
                setInviteMessage(null);
            }, 3000);

        } catch (err) {
            console.error("Error inviting agent:", err);
            setInviteStatus('error');
            setInviteMessage('Failed to invite agent');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    <div className="mt-4 text-center text-indigo-600 font-medium">Loading Profile...</div>
                </div>
            </div>
        );
    }

    if (error || !agent) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-100">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Shield className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile Unavailable</h2>
                    <p className="text-gray-500 mb-6">{error || "We couldn't find the agent you're looking for."}</p>
                    <button
                        onClick={onBack}
                        className="px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors font-medium w-full"
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    // Helper data accessors
    const info = agent.personalInfo || {};
    const prof = agent.professionalSummary || {};
    const skills = agent.skills || {};
    const availability = agent.availability || {};
    const assessment = skills.contactCenter?.[0]?.assessmentResults;
    // Check if phase 4 (subscription) is completed or explicitly verified
    const isVerified = agent.onboardingProgress?.currentPhase === 4 || agent.status === 'completed';

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-800">
            {/* Top Navigation Bar */}
            <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <button
                        onClick={onBack}
                        className="flex items-center text-slate-500 hover:text-indigo-600 transition-colors font-medium"
                    >
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        Back to Search
                    </button>
                    <div className="flex items-center gap-4">
                        {/* Status Indicator */}
                        <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full border flex items-center transition-colors ${agent.status === 'available'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : 'bg-slate-50 text-slate-500 border-slate-200'
                                }`}>
                                <div className={`w-1.5 h-1.5 rounded-full mr-2 ${agent.status === 'available' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                                    }`}></div>
                                {agent.status === 'available' ? 'Available Now' : 'Offline'}
                            </span>
                        </div>

                        {/* Invite Button */}
                        {gigId && (
                            <button
                                onClick={handleInviteToGig}
                                disabled={inviteStatus === 'sending' || inviteStatus === 'success'}
                                className={`flex items-center justify-center px-4 py-2 rounded-lg font-semibold shadow-sm transition-all transform active:scale-95 ${inviteStatus === 'success'
                                    ? 'bg-green-600 hover:bg-green-700 text-white'
                                    : 'bg-[#0F172A] hover:bg-[#1E293B] text-white'
                                    }`}
                            >
                                {inviteStatus === 'sending' ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white mr-2"></div>
                                        Sending...
                                    </>
                                ) : inviteStatus === 'success' ? (
                                    <>
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        Invite Sent
                                    </>
                                ) : (
                                    <>
                                        <Zap className="w-4 h-4 mr-2 text-yellow-400" />
                                        Invite to Gig
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-8 border-t border-gray-100">
                    {[
                        { id: 'overview', label: 'Overview', icon: <Video className="w-4 h-4" /> },
                        { id: 'experience', label: 'Experience', icon: <Briefcase className="w-4 h-4" /> },
                        { id: 'skills', label: 'Skills & Assessment', icon: <Award className="w-4 h-4" /> }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`group py-4 px-1 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${activeTab === tab.id
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-200'
                                }`}
                        >
                            {/* {tab.icon} */}
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content Column */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Header Profile Section */}
                        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                            <div className="flex flex-col md:flex-row gap-8 items-start">
                                {/* Avatar */}
                                <div className="relative group shrink-0">
                                    <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl overflow-hidden shadow-xl ring-4 ring-white bg-slate-100">
                                        <img
                                            src={info?.photo?.url || info?.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(info?.name || 'User')}&background=random`}
                                            alt={info?.name}
                                            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                                        />
                                    </div>
                                    {isVerified && (
                                        <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-1.5 rounded-full ring-4 ring-white shadow-lg" title="Verified Agent">
                                            <CheckCircle2 className="w-5 h-5" />
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-col gap-1 mb-6">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <h1 className="text-3xl md:text-3xl font-bold text-slate-900 tracking-tight">
                                                {info?.name}
                                            </h1>
                                            {info?.country && (
                                                <span className="text-2xl opacity-80 hover:opacity-100 transition-opacity cursor-help" title={info.country}>
                                                    {info.country === 'France' ? '🇫🇷' : '🌍'}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-2xl">
                                            {prof?.headline || 'Sales Representative'}
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap gap-3 text-sm">
                                        {prof?.yearsOfExperience !== undefined && (
                                            <div className="flex items-center bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/60 text-slate-700">
                                                <Briefcase className="w-4 h-4 mr-2 text-indigo-500" />
                                                <span className="font-bold mr-1">{prof.yearsOfExperience}</span> Years Exp.
                                            </div>
                                        )}
                                        {availability?.timezone?.gmtDisplay && (
                                            <div className="flex items-center bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/60 text-slate-700">
                                                <Globe className="w-4 h-4 mr-2 text-indigo-500" />
                                                {availability.timezone.gmtDisplay} ({availability.timezone.timezoneName})
                                            </div>
                                        )}
                                        <div className="flex items-center bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/60 text-slate-700">
                                            <MapPin className="w-4 h-4 mr-2 text-indigo-500" />
                                            {info?.location || 'Remote'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {inviteMessage && inviteStatus === 'error' && (
                                <div className="mt-6 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg text-sm">
                                    {inviteMessage}
                                </div>
                            )}
                        </div>

                        {/* About Section */}
                        {activeTab === 'overview' && (
                            <div className="space-y-8">
                                <section className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                                    <h2 className="text-xl font-bold text-slate-900 mb-4">About</h2>
                                    <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                                        {prof.profileDescription || "No description provided."}
                                    </p>

                                    {/* Video Presentation */}
                                    {info.presentationVideo?.url && (
                                        <div className="mt-8">
                                            <h3 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider flex items-center">
                                                <Video className="w-4 h-4 mr-2" />
                                                Video Introduction
                                            </h3>
                                            <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-video group shadow-xl ring-1 ring-slate-900/5">
                                                <video
                                                    src={info.presentationVideo.url}
                                                    controls
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </section>

                                {/* Key Expertise */}
                                <section className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                                    <h2 className="text-xl font-bold text-slate-900 mb-6">Key Expertise</h2>
                                    <div className="flex flex-wrap gap-2">
                                        {prof.keyExpertise?.map((skill: string, i: number) => (
                                            <span key={i} className="px-4 py-2 bg-slate-50 text-slate-700 rounded-lg text-sm font-medium border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 transition-colors cursor-default">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </section>

                                {/* Notable Companies */}
                                {prof.notableCompanies?.length > 0 && (
                                    <section className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                                        <h2 className="text-xl font-bold text-slate-900 mb-6">Notable Experience</h2>
                                        <div className="flex flex-wrap gap-4">
                                            {prof.notableCompanies.map((company: string, i: number) => (
                                                <div key={i} className="flex items-center px-5 py-3 bg-white rounded-xl text-slate-700 font-semibold border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                                    <Briefcase className="w-4 h-4 mr-3 text-indigo-500" />
                                                    {company}
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}
                            </div>
                        )}

                        {/* Experience Tab */}
                        {activeTab === 'experience' && (
                            <div className="space-y-8">
                                <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                                    <div className="space-y-12">
                                        {agent.experience?.map((exp: any, i: number) => (
                                            <div key={i} className="relative pl-8 border-l-2 border-slate-100 last:border-0 pb-12 last:pb-0">
                                                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-4 border-indigo-600 shadow-sm"></div>
                                                <div className="mb-2">
                                                    <h3 className="text-lg font-bold text-slate-900">{exp.title}</h3>
                                                    <div className="flex items-center text-indigo-600 font-medium mt-1">
                                                        <span className="text-slate-500 mr-2 font-normal">at</span> {exp.company}
                                                    </div>
                                                </div>
                                                <p className="text-sm text-slate-400 mb-4 font-mono uppercase tracking-wide">
                                                    {exp.startDate ? new Date(exp.startDate).getFullYear() : ''} - {exp.endDate === 'present' ? 'Present' : (exp.endDate ? new Date(exp.endDate).getFullYear() : '')}
                                                </p>
                                                <ul className="space-y-3">
                                                    {exp.responsibilities?.map((resp: string, j: number) => (
                                                        <li key={j} className="text-slate-600 text-sm leading-relaxed flex items-start group">
                                                            <span className="mr-3 mt-1.5 w-1.5 h-1.5 bg-indigo-300 rounded-full shrink-0 group-hover:bg-indigo-600 transition-colors"></span>
                                                            {resp}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Skills Tab */}
                        {activeTab === 'skills' && (
                            <div className="space-y-8">
                                {/* Assessments */}
                                {assessment && (
                                    <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 overflow-hidden relative">
                                        <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
                                            <Award className="w-64 h-64" />
                                        </div>
                                        <h2 className="text-xl font-bold text-slate-900 mb-8 flex items-center">
                                            <Shield className="w-6 h-6 mr-3 text-indigo-600" />
                                            HARX Verification Assessment
                                        </h2>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                                            {Object.entries(assessment.keyMetrics || {}).map(([key, value]: [string, any]) => (
                                                <div key={key} className="bg-slate-50 rounded-2xl p-5 text-center border border-slate-100">
                                                    <div className="text-3xl font-bold text-indigo-600 mb-2">{value}%</div>
                                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{key}</div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="space-y-8">
                                            <div>
                                                <h4 className="font-semibold text-slate-900 mb-4 flex items-center">
                                                    <CheckCircle2 className="w-5 h-5 mr-2 text-emerald-500" />
                                                    Demonstrated Strengths
                                                </h4>
                                                <div className="grid gap-3">
                                                    {assessment.strengths?.map((str: string, i: number) => (
                                                        <div key={i} className="bg-emerald-50/50 text-emerald-800 text-sm px-5 py-3 rounded-xl border border-emerald-100/50">
                                                            {str}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-slate-900 mb-4 flex items-center">
                                                    <Target className="w-5 h-5 mr-2 text-orange-500" />
                                                    Areas for Development
                                                </h4>
                                                <div className="grid gap-3">
                                                    {assessment.improvements?.map((imp: string, i: number) => (
                                                        <div key={i} className="bg-orange-50/50 text-orange-800 text-sm px-5 py-3 rounded-xl border border-orange-100/50">
                                                            {imp}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Reviewer Feedback */}
                                        <div className="mt-8 pt-8 border-t border-gray-100">
                                            <h4 className="text-sm font-bold text-slate-900 mb-2">Evaluator's Note</h4>
                                            <p className="text-slate-600 italic border-l-4 border-indigo-200 pl-4 py-1">
                                                "{assessment.feedback}"
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Technical Skills */}
                                <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                                    <h3 className="text-lg font-bold text-slate-900 mb-6">Technical Proficiency</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {skills.technical?.map((skill: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                                                <span className="font-medium text-slate-700">{skill.skill?.name || 'Technical Skill'}</span>
                                                <div className="flex gap-1">
                                                    {[...Array(5)].map((_, stars) => (
                                                        <div
                                                            key={stars}
                                                            className={`w-2 h-2 rounded-full ${stars < (skill.level || 0) ? 'bg-indigo-500' : 'bg-slate-200'}`}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-8">
                        {/* Contact Card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">Contact Information</h3>
                            <div className="space-y-5">
                                <div className="flex items-start">
                                    <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 mr-4 shrink-0">
                                        <Mail className="w-5 h-5" />
                                    </div>
                                    <div className="overflow-hidden">
                                        <div className="text-xs text-slate-500 mb-0.5">Email Address</div>
                                        <div className="text-sm font-semibold text-slate-900 truncate" title={info.email}>{info.email}</div>
                                    </div>
                                </div>
                                <div className="flex items-start">
                                    <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 mr-4 shrink-0">
                                        <Phone className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-500 mb-0.5">Phone Number</div>
                                        <div className="text-sm font-semibold text-slate-900">{info.phone}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-gray-100 flex gap-3">
                                <button className="flex-1 py-2 bg-[#0077b5]/10 text-[#0077b5] rounded-lg hover:bg-[#0077b5]/20 flex justify-center transition-colors">
                                    <Linkedin className="w-5 h-5" />
                                </button>
                                {/* <button className="flex-1 py-2 bg-[#1DA1F2]/10 text-[#1DA1F2] rounded-lg hover:bg-[#1DA1F2]/20 flex justify-center transition-colors">
                                    <Twitter className="w-5 h-5" />
                                </button> */}
                            </div>
                        </div>

                        {/* Languages */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">Languages</h3>
                            <div className="space-y-4">
                                {info.languages?.map((lang: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between group">
                                        <div className="flex items-center">
                                            <span className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-lg text-xs font-bold text-slate-600 mr-3 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                                {lang.language?.code?.toUpperCase()}
                                            </span>
                                            <span className="font-medium text-slate-700">{lang.language?.name}</span>
                                        </div>
                                        <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                                            {lang.proficiency}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Availability */}
                        <div className="bg-[#0F172A] rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Calendar className="w-32 h-32" />
                            </div>
                            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-6 flex items-center relative z-10">
                                <Clock className="w-4 h-4 mr-2" />
                                Weekly Schedule
                            </h3>
                            <div className="space-y-3 relative z-10">
                                {availability.schedule?.map((slot: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center text-sm py-2.5 border-b border-white/10 last:border-0 hover:bg-white/5 px-2 rounded transition-colors -mx-2">
                                        <span className="text-slate-300 font-medium">{slot.day}</span>
                                        <span className="font-mono text-indigo-300 bg-indigo-500/20 px-2 py-1 rounded text-xs border border-indigo-500/30">
                                            {slot.hours?.start} - {slot.hours?.end}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {availability.flexibility?.length > 0 && (
                                <div className="mt-6 pt-4 border-t border-white/10 relative z-10">
                                    <div className="flex flex-wrap gap-2">
                                        {availability.flexibility.map((flex: string, i: number) => (
                                            <span key={i} className="text-xs bg-white/10 px-2 py-1 rounded text-slate-300">
                                                {flex}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
