import React from 'react';
import { TFunction } from 'i18next';
import { Gig, Match } from '../../../types/matching';
import { getScoreColor, ScoreColor } from '../utils/repMatchDisplay';

type RepMatchScoreCardProps = {
    match: Match;
    matchScore: number;
    scoreColor?: ScoreColor;
    gigTitle?: string;
    isExpanded: boolean;
    onToggleDetails: () => void;
    onOpenProfile: () => void;
    rightAction?: React.ReactNode;
    selectedGig?: Gig | null;
    t: TFunction;
    getLanguageNameByCode: (languageCode: string | any) => string;
};

const scoreBadgeClass = (score: number) =>
    score >= 70 ? 'bg-green-100 text-green-800' :
    score >= 50 ? 'bg-yellow-100 text-yellow-800' :
    'bg-red-100 text-red-800';

const RepMatchScoreCard: React.FC<RepMatchScoreCardProps> = ({
    match,
    matchScore,
    scoreColor = getScoreColor(matchScore),
    gigTitle,
    isExpanded,
    onToggleDetails,
    onOpenProfile,
    rightAction,
    selectedGig,
    t,
    getLanguageNameByCode,
}) => {
    const agentInfo = match.agentInfo;
    const experienceGig = selectedGig || (gigTitle ? { seniority: { yearsExperience: undefined } } : null);

    return (
        <div
            className="relative overflow-hidden rounded-xl bg-white p-4 sm:p-5 pl-5 sm:pl-6 border transition-all duration-200 shadow-sm hover:shadow-md"
            style={{ borderColor: scoreColor.border, borderLeftWidth: '6px', borderLeftColor: scoreColor.main }}
        >
            <div className="flex items-center justify-between mb-4 gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                        <h4
                            className="text-lg font-bold text-gray-900 truncate cursor-pointer hover:text-indigo-600 transition-colors"
                            onClick={onOpenProfile}
                        >
                            {agentInfo?.name || agentInfo?.personalInfo?.name}
                        </h4>
                        <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border"
                            style={{ backgroundColor: scoreColor.soft, color: scoreColor.main, borderColor: scoreColor.border }}
                        >
                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: scoreColor.main }}></span>
                            {matchScore}% {t('matchingDashboard.matching.match')}
                        </span>
                    </div>

                    {gigTitle && (
                        <p className="text-sm text-slate-500 mb-2">
                            <span className="font-medium">{t('matchingDashboard.invited.gig')}</span> {gigTitle}
                        </p>
                    )}

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400 mt-1">
                        {(agentInfo?.timezone?.countryName || agentInfo?.location) && (
                            <span>📍 {agentInfo?.timezone?.countryName || agentInfo?.location}</span>
                        )}
                        {agentInfo?.timezone?.gmtDisplay && agentInfo.timezone.gmtDisplay !== 'Unknown' && (
                            <span>🕒 {agentInfo.timezone.gmtDisplay}</span>
                        )}
                        {agentInfo?.professionalSummary?.yearsOfExperience != null && (
                            <span>💼 {String(agentInfo.professionalSummary.yearsOfExperience).replace(/\s*years?\s*/gi, '')} {t('matchingDashboard.matching.yearsExp')}</span>
                        )}
                        {agentInfo?.personalInfo?.languages && agentInfo.personalInfo.languages.length > 0 && (
                            <span>🗣️ {agentInfo.personalInfo.languages.length} {t('matchingDashboard.matching.languages').replace(':', '')}</span>
                        )}
                    </div>

                    <div className="mt-3 h-1.5 w-full max-w-xs rounded-full overflow-hidden" style={{ backgroundColor: scoreColor.track }}>
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${matchScore}%`, backgroundColor: scoreColor.main }}></div>
                    </div>
                </div>

                {rightAction && (
                    <div className="flex-shrink-0">
                        {rightAction}
                    </div>
                )}
            </div>

            <div className="flex justify-center mt-4">
                <button
                    onClick={onToggleDetails}
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

            {isExpanded && (
                <div className="mt-6 pt-6 border-t border-gray-200 space-y-6 overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-full overflow-hidden mb-4">
                        {match.skillsMatch && (
                            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                                <div className="flex items-center justify-between mb-2">
                                    <h5 className="font-semibold text-gray-900">{t('matchingDashboard.matching.skills')}</h5>
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${scoreBadgeClass(Math.round((match.skillsMatch.score || 0) * 100))}`}>
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

                        {match.languageMatch && (
                            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                                <div className="flex items-center justify-between mb-2">
                                    <h5 className="font-semibold text-gray-900">{t('matchingDashboard.matching.languages').replace(':', '')}</h5>
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${scoreBadgeClass(Math.round((match.languageMatch.score || 0) * 100))}`}>
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

                        {match.industryMatch && (
                            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                                <div className="flex items-center justify-between mb-2">
                                    <h5 className="font-semibold text-gray-900">{t('matchingDashboard.matching.industry')}</h5>
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${scoreBadgeClass(Math.round((match.industryMatch.score || 0) * 100))}`}>
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

                        {match.experienceMatch && (
                            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                                <div className="flex items-center justify-between mb-2">
                                    <h5 className="font-semibold text-gray-900">{t('matchingDashboard.matching.experience').replace(':', '')}</h5>
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${scoreBadgeClass(Math.round((match.experienceMatch.score || 0) * 100))}`}>
                                        {Math.round((match.experienceMatch.score || 0) * 100)}%
                                    </span>
                                </div>
                                <div className="text-xs text-gray-500">
                                    <p>{t('matchingDashboard.matching.rep')} {agentInfo?.professionalSummary?.yearsOfExperience || 'N/A'} {t('matchingDashboard.matching.years')}</p>
                                    <p>{t('matchingDashboard.matching.required')} {experienceGig?.seniority?.yearsExperience || 'N/A'} {t('matchingDashboard.matching.years')}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-full overflow-hidden">
                        {match.timezoneMatch && (
                            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                                <div className="flex items-center justify-between mb-2">
                                    <h5 className="font-semibold text-gray-900">{t('matchingDashboard.matching.timezone').replace(':', '')}</h5>
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${scoreBadgeClass(Math.round((match.timezoneMatch.score || 0) * 100))}`}>
                                        {Math.round((match.timezoneMatch.score || 0) * 100)}%
                                    </span>
                                </div>
                                <div className="text-xs text-gray-500">
                                    <p>{t('matchingDashboard.matching.rep')} {agentInfo?.timezone?.gmtDisplay || 'N/A'}</p>
                                    <p>{t('matchingDashboard.matching.zone')} {agentInfo?.timezone?.timezoneName || agentInfo?.availability?.timeZone?.zoneName || 'N/A'}</p>
                                    <p>{t('matchingDashboard.matching.location')} {agentInfo?.timezone?.countryName || agentInfo?.personalInfo?.country?.name || agentInfo?.location || 'N/A'}</p>
                                </div>
                            </div>
                        )}

                        {match.regionMatch && (
                            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                                <div className="flex items-center justify-between mb-2">
                                    <h5 className="font-semibold text-gray-900">{t('matchingDashboard.matching.region').replace(':', '')}</h5>
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${scoreBadgeClass(Math.round((match.regionMatch.score || 0) * 100))}`}>
                                        {Math.round((match.regionMatch.score || 0) * 100)}%
                                    </span>
                                </div>
                                <div className="text-xs text-gray-500">
                                    <p>{t('matchingDashboard.matching.country')} {agentInfo?.timezone?.countryName || agentInfo?.personalInfo?.country?.name || 'N/A'}</p>
                                    <p>{t('matchingDashboard.matching.code')} {agentInfo?.timezone?.countryCode || agentInfo?.personalInfo?.country?.code || 'N/A'}</p>
                                </div>
                            </div>
                        )}

                        {match.availabilityMatch && (
                            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                                <div className="flex items-center justify-between mb-2">
                                    <h5 className="font-semibold text-gray-900">{t('matchingDashboard.matching.availability').replace(':', '')}</h5>
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${scoreBadgeClass(Math.round((match.availabilityMatch.score || 0) * 100))}`}>
                                        {Math.round((match.availabilityMatch.score || 0) * 100)}%
                                    </span>
                                </div>
                                <div className="text-xs text-gray-500">
                                    <p>{t('matchingDashboard.matching.schedule')} {agentInfo?.availability?.schedule?.length || 0} {t('matchingDashboard.matching.daysWeek')}</p>
                                </div>
                            </div>
                        )}

                        {match.activityMatch && (
                            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                                <div className="flex items-center justify-between mb-2">
                                    <h5 className="font-semibold text-gray-900">{t('matchingDashboard.matching.activities').replace(':', '')}</h5>
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${scoreBadgeClass(Math.round((match.activityMatch.score || 0) * 100))}`}>
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
};

export default RepMatchScoreCard;
