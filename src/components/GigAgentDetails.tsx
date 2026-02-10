import React from 'react';
import { GigAgent } from '../types/matching';

interface GigAgentDetailsProps {
    gigAgent: GigAgent;
    onClose?: () => void;
}

const GigAgentDetails: React.FC<GigAgentDetailsProps> = ({ gigAgent, onClose }) => {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'perfect_match': return 'text-green-600 bg-green-100';
            case 'partial_match': return 'text-yellow-600 bg-yellow-100';
            case 'no_match': return 'text-red-600 bg-red-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 0.8) return 'text-green-600';
        if (score >= 0.6) return 'text-yellow-600';
        return 'text-red-600';
    };

    const formatScore = (score: number) => {
        return `${Math.round(score * 100)}%`;
    };

    return (
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Détails de l'assignation</h2>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Informations générales */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-700 mb-2">Statut global</h3>
                    <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(gigAgent.matchStatus)}`}>
                        {gigAgent.matchStatus.replace('_', ' ')}
                    </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-700 mb-2">Score global</h3>
                    <div className={`text-2xl font-bold ${getScoreColor(gigAgent.matchScore)}`}>
                        {formatScore(gigAgent.matchScore)}
                    </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-700 mb-2">Statut assignation</h3>
                    <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${gigAgent.status === 'accepted' ? 'text-green-600 bg-green-100' :
                            gigAgent.status === 'rejected' ? 'text-red-600 bg-red-100' :
                                'text-yellow-600 bg-yellow-100'
                        }`}>
                        {gigAgent.status}
                    </div>
                </div>
            </div>

            {/* Détails de matching */}
            <div className="space-y-6">
                {/* Languages */}
                <div className="border rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">
                        Langues ({formatScore(gigAgent.matchDetails.languageMatch.score)})
                    </h3>
                    <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-3 ${getStatusColor(gigAgent.matchDetails.languageMatch.details.matchStatus)}`}>
                        {gigAgent.matchDetails.languageMatch.details.matchStatus.replace('_', ' ')}
                    </div>

                    {gigAgent.matchDetails.languageMatch.details.matchingLanguages.length > 0 && (
                        <div className="mb-3">
                            <h4 className="font-medium text-green-700 mb-2">Langues correspondantes:</h4>
                            <div className="space-y-1">
                                {gigAgent.matchDetails.languageMatch.details.matchingLanguages.map((lang, index) => (
                                    <div key={index} className="text-sm text-green-600">
                                        ✓ {lang.languageName} (Requis: {lang.requiredLevel}, Agent: {lang.agentLevel})
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {gigAgent.matchDetails.languageMatch.details.missingLanguages.length > 0 && (
                        <div className="mb-3">
                            <h4 className="font-medium text-red-700 mb-2">Langues manquantes:</h4>
                            <div className="space-y-1">
                                {gigAgent.matchDetails.languageMatch.details.missingLanguages.map((lang, index) => (
                                    <div key={index} className="text-sm text-red-600">
                                        ✗ {lang.languageName} (Requis: {lang.requiredLevel})
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Skills */}
                <div className="border rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">
                        Compétences ({formatScore(gigAgent.matchDetails.skillsMatch.score)})
                    </h3>
                    <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-3 ${getStatusColor(gigAgent.matchDetails.skillsMatch.details.matchStatus)}`}>
                        {gigAgent.matchDetails.skillsMatch.details.matchStatus.replace('_', ' ')}
                    </div>

                    {gigAgent.matchDetails.skillsMatch.details.matchingSkills.length > 0 && (
                        <div className="mb-3">
                            <h4 className="font-medium text-green-700 mb-2">Compétences correspondantes:</h4>
                            <div className="space-y-1">
                                {gigAgent.matchDetails.skillsMatch.details.matchingSkills.map((skill, index) => (
                                    <div key={index} className="text-sm text-green-600">
                                        ✓ {skill.skillName} ({skill.type}) - Requis: {skill.requiredLevel}, Agent: {skill.agentLevel}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {gigAgent.matchDetails.skillsMatch.details.missingSkills.length > 0 && (
                        <div className="mb-3">
                            <h4 className="font-medium text-red-700 mb-2">Compétences manquantes:</h4>
                            <div className="space-y-1">
                                {gigAgent.matchDetails.skillsMatch.details.missingSkills.map((skill, index) => (
                                    <div key={index} className="text-sm text-red-600">
                                        ✗ {skill.skillName} ({skill.type}) - Niveau requis: {skill.requiredLevel}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Industry */}
                <div className="border rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">
                        Industrie ({formatScore(gigAgent.matchDetails.industryMatch.score)})
                    </h3>
                    <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-3 ${getStatusColor(gigAgent.matchDetails.industryMatch.details.matchStatus)}`}>
                        {gigAgent.matchDetails.industryMatch.details.matchStatus.replace('_', ' ')}
                    </div>

                    {gigAgent.matchDetails.industryMatch.details.matchingIndustries.length > 0 && (
                        <div className="mb-3">
                            <h4 className="font-medium text-green-700 mb-2">Industries correspondantes:</h4>
                            <div className="space-y-1">
                                {gigAgent.matchDetails.industryMatch.details.matchingIndustries.map((industry, index) => (
                                    <div key={index} className="text-sm text-green-600">
                                        ✓ {industry.industryName} (Agent: {industry.agentIndustryName})
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Experience */}
                <div className="border rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">
                        Expérience ({formatScore(gigAgent.matchDetails.experienceMatch.score)})
                    </h3>
                    <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-3 ${getStatusColor(gigAgent.matchDetails.experienceMatch.matchStatus)}`}>
                        {gigAgent.matchDetails.experienceMatch.matchStatus.replace('_', ' ')}
                    </div>

                    <div className="text-sm text-gray-700">
                        <p>Expérience requise: {gigAgent.matchDetails.experienceMatch.details.gigRequiredExperience} ans</p>
                        <p>Expérience de l'agent: {gigAgent.matchDetails.experienceMatch.details.agentExperience} ans</p>
                        <p>Différence: {gigAgent.matchDetails.experienceMatch.details.difference} ans</p>
                        <p className="mt-2 italic">{gigAgent.matchDetails.experienceMatch.details.reason}</p>
                    </div>
                </div>

                {/* Availability */}
                <div className="border rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">
                        Disponibilité ({formatScore(gigAgent.matchDetails.availabilityMatch.score)})
                    </h3>
                    <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-3 ${getStatusColor(gigAgent.matchDetails.availabilityMatch.matchStatus)}`}>
                        {gigAgent.matchDetails.availabilityMatch.matchStatus.replace('_', ' ')}
                    </div>

                    {gigAgent.matchDetails.availabilityMatch.details.matchingDays.length > 0 && (
                        <div className="mb-3">
                            <h4 className="font-medium text-green-700 mb-2">Jours correspondants:</h4>
                            <div className="space-y-1">
                                {gigAgent.matchDetails.availabilityMatch.details.matchingDays.map((day, index) => (
                                    <div key={index} className="text-sm text-green-600">
                                        ✓ {day.day} - Gig: {day.gigHours.start}-{day.gigHours.end}, Agent: {day.agentHours.start}-{day.agentHours.end}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {gigAgent.matchDetails.availabilityMatch.details.missingDays.length > 0 && (
                        <div className="mb-3">
                            <h4 className="font-medium text-red-700 mb-2">Jours manquants:</h4>
                            <div className="space-y-1">
                                {gigAgent.matchDetails.availabilityMatch.details.missingDays.map((day, index) => (
                                    <div key={index} className="text-sm text-red-600">
                                        ✗ {day}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Timezone */}
                <div className="border rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">
                        Fuseau horaire ({formatScore(gigAgent.matchDetails.timezoneMatch.score)})
                    </h3>
                    <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-3 ${getStatusColor(gigAgent.matchDetails.timezoneMatch.matchStatus)}`}>
                        {gigAgent.matchDetails.timezoneMatch.matchStatus.replace('_', ' ')}
                    </div>

                    <div className="text-sm text-gray-700">
                        <p>Fuseau du gig: {gigAgent.matchDetails.timezoneMatch.details.gigTimezone}</p>
                        <p>Fuseau de l'agent: {gigAgent.matchDetails.timezoneMatch.details.agentTimezone}</p>
                        <p className="mt-2 italic">{gigAgent.matchDetails.timezoneMatch.details.reason}</p>
                    </div>
                </div>

                {/* Region */}
                <div className="border rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">
                        Région ({formatScore(gigAgent.matchDetails.regionMatch.score)})
                    </h3>
                    <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-3 ${getStatusColor(gigAgent.matchDetails.regionMatch.matchStatus)}`}>
                        {gigAgent.matchDetails.regionMatch.matchStatus.replace('_', ' ')}
                    </div>

                    <div className="text-sm text-gray-700">
                        <p>Zone de destination: {gigAgent.matchDetails.regionMatch.details.gigDestinationZone}</p>
                        <p>Pays de l'agent: {gigAgent.matchDetails.regionMatch.details.agentCountryCode}</p>
                        <p className="mt-2 italic">{gigAgent.matchDetails.regionMatch.details.reason}</p>
                    </div>
                </div>
            </div>

            {/* Informations supplémentaires */}
            <div className="mt-6 pt-6 border-t">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Informations supplémentaires</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                    <div>
                        <p><strong>Email envoyé:</strong> {gigAgent.emailSent ? 'Oui' : 'Non'}</p>
                        {gigAgent.emailSentAt && (
                            <p><strong>Date d'envoi:</strong> {new Date(gigAgent.emailSentAt).toLocaleString()}</p>
                        )}
                        <p><strong>Réponse de l'agent:</strong> {gigAgent.agentResponse}</p>
                        {gigAgent.agentResponseAt && (
                            <p><strong>Date de réponse:</strong> {new Date(gigAgent.agentResponseAt).toLocaleString()}</p>
                        )}
                    </div>
                    <div>
                        <p><strong>Priorité:</strong> {gigAgent.priority}</p>
                        {gigAgent.deadline && (
                            <p><strong>Date limite:</strong> {new Date(gigAgent.deadline).toLocaleDateString()}</p>
                        )}
                        <p><strong>Créé le:</strong> {new Date(gigAgent.createdAt).toLocaleString()}</p>
                        <p><strong>Mis à jour le:</strong> {new Date(gigAgent.updatedAt).toLocaleString()}</p>
                    </div>
                </div>

                {gigAgent.notes && (
                    <div className="mt-4">
                        <p><strong>Notes:</strong></p>
                        <p className="text-gray-600 italic">{gigAgent.notes}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GigAgentDetails;
