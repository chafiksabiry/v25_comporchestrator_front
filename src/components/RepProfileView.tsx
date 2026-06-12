import React, { useState } from 'react';
import { X, MapPin, Target, Briefcase, Clock, ChevronLeft, Video, ShieldCheck, AlertTriangle, Languages as LanguagesIcon, CheckCircle2 } from 'lucide-react';

interface RepProfileViewProps {
    profile: any;
    onClose: () => void;
}

type LocalizedText = string | { en?: string; fr?: string };

const localize = (value: LocalizedText | undefined): string => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return value.fr || value.en || '';
};

export const RepProfileView: React.FC<RepProfileViewProps> = ({ profile, onClose }) => {
    const [activeTab, setActiveTab] = useState<'profile' | 'experience' | 'availability'>('profile');

    if (!profile) return null;

    const calculateOverallScore = () => {
        if (!profile.skills?.contactCenter?.length || !profile.skills.contactCenter[0]?.assessmentResults?.keyMetrics) return 'N/A';
        const { professionalism = 0, effectiveness = 0, customerFocus = 0 } = profile.skills.contactCenter[0].assessmentResults.keyMetrics;
        return Math.floor((professionalism + effectiveness + customerFocus) / 3);
    };

    const getCountryDisplayName = () => {
        const country = profile.personalInfo?.country;
        if (country) {
            if (typeof country === 'string') {
                if (!/^[0-9a-fA-F]{24}$/.test(country)) return country;
            } else if (typeof country === 'object') {
                if (country.name) return country.name;
                if (country.countryName) return country.countryName;
                if (country.zoneName) return country.zoneName;
            }
        }
        if (profile.timezone?.countryName) return profile.timezone.countryName;
        if (profile.location) return profile.location;
        if (profile.country) {
            if (typeof profile.country === 'string') return profile.country;
            if (typeof profile.country === 'object' && profile.country.countryName) return profile.country.countryName;
        }
        return 'Not specified';
    };

    const formatYear = (value: any) => {
        if (!value) return '';
        if (value === 'present') return 'Present';
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? String(value) : d.getFullYear().toString();
    };

    const experiences: any[] = Array.isArray(profile.experience) ? profile.experience : [];
    const availability = profile.availability || {};
    const schedule: any[] = Array.isArray(availability.schedule) ? availability.schedule : [];
    const flexibility: string[] = Array.isArray(availability.flexibility) ? availability.flexibility : [];
    const timezoneName =
        availability.timeZone?.zoneName ||
        availability.timezone?.timezoneName ||
        profile.timezone?.timezoneName ||
        null;
    const timezoneCountry =
        availability.timeZone?.countryName ||
        availability.timezone?.countryName ||
        profile.timezone?.countryName ||
        null;

    const fraudRiskStyles: Record<string, { badge: string; label: string }> = {
        low: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Risque faible' },
        medium: { badge: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Risque moyen' },
        high: { badge: 'bg-red-50 text-red-700 border-red-200', label: 'Risque élevé' },
        unknown: { badge: 'bg-slate-100 text-slate-600 border-slate-200', label: 'Inconnu' },
    };

    const renderVideoAnalysis = (exp: any) => {
        const analysis = exp.videoAnalysis;
        const fraud = exp.videoFraudCheck;
        const relevance = exp.videoRelevance;
        const langAssessment = exp.videoLanguageAssessment;

        return (
            <div className="mt-4 space-y-4 rounded-2xl border border-indigo-100 bg-indigo-50/30 p-4">
                <div className="flex items-center gap-2 text-indigo-700">
                    <Video className="w-4 h-4" />
                    <span className="text-xs font-black uppercase tracking-widest">AI Video Analysis</span>
                    {exp.videoAnalyzedAt && (
                        <span className="ml-auto text-[10px] font-medium text-slate-400">
                            {new Date(exp.videoAnalyzedAt).toLocaleDateString()}
                        </span>
                    )}
                </div>

                {exp.videoUrl && (
                    <div className="relative overflow-hidden rounded-xl bg-slate-950 shadow-md ring-1 ring-slate-900/5">
                        <video src={exp.videoUrl} controls className="aspect-video w-full object-cover" />
                    </div>
                )}

                {analysis?.summary && (
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="flex items-center justify-between mb-2">
                            <h5 className="text-xs font-black uppercase tracking-widest text-slate-400">Summary</h5>
                            {typeof analysis.overallConfidence === 'number' && (
                                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                                    {analysis.overallConfidence}% confiance
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed">{localize(analysis.summary)}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Relevance */}
                    {relevance && (
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                            <div className="flex items-center gap-2 mb-1">
                                <CheckCircle2 className={`w-4 h-4 ${relevance.onTopic ? 'text-emerald-500' : 'text-amber-500'}`} />
                                <span className="text-xs font-bold text-slate-600">Pertinence</span>
                                {typeof relevance.score === 'number' && (
                                    <span className="ml-auto text-xs font-bold text-slate-500">{relevance.score}%</span>
                                )}
                            </div>
                            {!relevance.onTopic && relevance.reason && (
                                <p className="text-xs text-slate-500 leading-relaxed">{localize(relevance.reason)}</p>
                            )}
                        </div>
                    )}

                    {/* Fraud check */}
                    {fraud && (
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                            <div className="flex items-center gap-2 mb-1">
                                {fraud.fraudRisk === 'low' ? (
                                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                ) : (
                                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                                )}
                                <span className="text-xs font-bold text-slate-600">Anti-fraude</span>
                                <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full border ${(fraudRiskStyles[fraud.fraudRisk] || fraudRiskStyles.unknown).badge}`}>
                                    {(fraudRiskStyles[fraud.fraudRisk] || fraudRiskStyles.unknown).label}
                                </span>
                            </div>
                            {fraud.identityChecked && (
                                <p className="text-xs text-slate-500">
                                    Identité : {fraud.identityMatch === true ? '✅ correspond' : fraud.identityMatch === false ? '❌ ne correspond pas' : 'non vérifiée'}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Language assessment */}
                {langAssessment?.assessable && (langAssessment.languages?.length ?? 0) > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <LanguagesIcon className="w-4 h-4 text-indigo-500" />
                            <h5 className="text-xs font-black uppercase tracking-widest text-slate-400">Évaluation linguistique</h5>
                        </div>
                        <div className="space-y-2">
                            {langAssessment.languages.map((lang: any, i: number) => (
                                <div key={i} className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-medium text-slate-700">
                                        {lang.languageName || lang.language?.name || 'Langue'}
                                        {lang.cefr && <span className="ml-2 text-xs font-bold text-indigo-600">{lang.cefr}</span>}
                                    </span>
                                    {typeof lang.overallScore === 'number' && (
                                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">{lang.overallScore}%</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {exp.videoTranscription && (
                    <details className="rounded-xl border border-slate-200 bg-white p-4">
                        <summary className="text-xs font-black uppercase tracking-widest text-slate-400 cursor-pointer">Transcription</summary>
                        <p className="mt-3 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{exp.videoTranscription}</p>
                    </details>
                )}
            </div>
        );
    };

    const renderProfileTab = () => (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* About Section */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-xl font-black text-gray-900 tracking-tight mb-5">About</h2>
                {profile.professionalSummary?.profileDescription ? (
                    <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{profile.professionalSummary.profileDescription}</p>
                ) : (
                    <p className="text-slate-500 italic">No professional summary provided</p>
                )}
            </div>
        </div>
    );

    const renderExperienceTab = () => (
        <div className="bg-white rounded-3xl p-6 lg:p-8 shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-black text-gray-900 tracking-tight mb-6">Work History</h2>
            {experiences.length > 0 ? (
                <div className="space-y-10">
                    {experiences.map((exp: any, i: number) => (
                        <div key={i} className="relative pl-8 border-l-2 border-slate-100 last:border-0 pb-2">
                            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-4 border-indigo-500 shadow-sm"></div>
                            <div className="mb-1">
                                <h3 className="text-lg font-bold text-slate-900">{exp.title || exp.role}</h3>
                                <div className="flex items-center text-indigo-600 font-medium">
                                    <span className="text-slate-500 mr-2 font-normal">at</span> {exp.company}
                                </div>
                            </div>
                            <p className="text-xs text-slate-400 mb-3 font-mono uppercase tracking-wide">
                                {formatYear(exp.startDate)} {exp.startDate ? '—' : ''} {formatYear(exp.endDate) || 'Present'}
                            </p>

                            {exp.description && (
                                <p className="text-sm text-slate-600 italic mb-3">"{exp.description}"</p>
                            )}

                            {exp.responsibilities?.length > 0 && (
                                <ul className="space-y-2 mb-2">
                                    {exp.responsibilities.map((resp: string, j: number) => (
                                        <li key={j} className="text-slate-600 text-sm leading-relaxed flex items-start">
                                            <span className="mr-3 mt-1.5 w-1.5 h-1.5 bg-indigo-300 rounded-full shrink-0"></span>
                                            {resp}
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {(exp.videoUrl || exp.videoAnalysis) ? (
                                renderVideoAnalysis(exp)
                            ) : (
                                <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-400">
                                    <Video className="w-4 h-4" />
                                    Aucune vidéo analysée pour cette expérience
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-slate-500 font-medium">No experience history listed yet</p>
                </div>
            )}
        </div>
    );

    const renderAvailabilityTab = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white rounded-3xl p-6 lg:p-8 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-6">
                    <Clock className="w-5 h-5 text-indigo-500" />
                    <h2 className="text-xl font-black text-gray-900 tracking-tight">Weekly Schedule</h2>
                </div>

                {schedule.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {schedule.map((slot: any, i: number) => (
                            <div key={i} className="flex justify-between items-center rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                                <span className="text-sm font-bold text-slate-700">{slot.day}</span>
                                <span className="font-mono text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-md">
                                    {slot.hours?.start} - {slot.hours?.end}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <p className="text-slate-500 font-medium">No availability schedule provided</p>
                    </div>
                )}

                {(timezoneName || timezoneCountry) && (
                    <div className="mt-5 flex items-center gap-2 text-sm text-slate-600">
                        <MapPin className="w-4 h-4 text-indigo-400" />
                        <span className="font-medium">{timezoneName}{timezoneName && timezoneCountry ? ' · ' : ''}{timezoneCountry}</span>
                    </div>
                )}

                {flexibility.length > 0 && (
                    <div className="mt-6 pt-5 border-t border-gray-100">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Flexibility</h4>
                        <div className="flex flex-wrap gap-2">
                            {flexibility.map((flex: string, i: number) => (
                                <span key={i} className="text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1.5 rounded-lg">
                                    {flex}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    const tabs: { id: typeof activeTab; label: string }[] = [
        { id: 'profile', label: 'Profile' },
        { id: 'experience', label: 'Experience' },
        { id: 'availability', label: 'Availability' },
    ];

    return (
        <div className="bg-[#f8fafc] w-full h-full overflow-y-auto rounded-3xl relative border border-gray-100">
            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-6 right-6 p-2 bg-white/80 hover:bg-white text-gray-500 hover:text-gray-700 rounded-full shadow-sm border border-gray-100 transition-colors z-10"
            >
                <X size={20} />
            </button>

            <div className="px-6 py-6 lg:px-10 lg:py-8 space-y-6">
                {/* Header */}
                <div>
                    <button
                        onClick={onClose}
                        className="flex items-center text-indigo-500 hover:text-indigo-600 font-medium mb-4 transition-colors"
                    >
                        <ChevronLeft size={20} className="mr-1" />
                        <span>Back</span>
                    </button>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-1">Representative Profile</h1>
                    <p className="text-slate-500 font-medium tracking-tight">View details and background</p>
                </div>

                {/* Navbar */}
                <div className="flex space-x-2 border-b border-gray-200">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            className={`py-2 px-4 font-bold text-sm transition-colors ${activeTab === tab.id ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Identity Section (always visible) */}
                <div className="bg-white rounded-3xl p-6 lg:p-8 shadow-sm border border-gray-100">
                    <div className="flex flex-col md:flex-row gap-8 items-start">
                        {/* Photo */}
                        <div className="w-32 h-32 rounded-[24px] shadow-lg border-4 border-white bg-slate-200/50 overflow-hidden shrink-0">
                            {profile.personalInfo?.photo?.url || profile.photo?.url || profile.photo ? (
                                <img
                                    src={profile.personalInfo?.photo?.url || profile.photo?.url || profile.photo}
                                    alt="Profile"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-4xl font-black text-gray-300 bg-gray-50 uppercase">
                                    {profile.personalInfo?.name?.charAt(0) || profile.name?.charAt(0) || '?'}
                                </div>
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 w-full">
                            <div className="mb-4">
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight">{profile.personalInfo?.name || profile.name}</h2>
                                <p className="text-sm font-bold text-indigo-500 uppercase tracking-widest italic">{profile.professionalSummary?.currentRole || profile.currentRole || 'Representative'}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Country</label>
                                    <div className="flex items-center gap-2 py-1.5 px-3 bg-slate-50 rounded-xl border border-gray-100">
                                        <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                                        <span className="text-sm font-bold text-slate-900">{getCountryDisplayName()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-gray-100 shadow-sm">
                                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-indigo-500">
                                        <Target size={20} />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">REPS Score</div>
                                        <div className="text-xl font-black text-indigo-900 tracking-tighter leading-none mt-0.5">{calculateOverallScore()} / 100</div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-gray-100 shadow-sm">
                                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-emerald-500">
                                        <Briefcase size={20} />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Status</div>
                                        <div className="text-xl font-black text-emerald-900 tracking-tighter leading-none mt-0.5">
                                            {profile.status === 'completed' ? 'Verified' : 'Pending'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tab Content */}
                <div className="mt-6">
                    {activeTab === 'profile' && renderProfileTab()}
                    {activeTab === 'experience' && renderExperienceTab()}
                    {activeTab === 'availability' && renderAvailabilityTab()}
                </div>
            </div>
        </div>
    );
};

export default RepProfileView;
