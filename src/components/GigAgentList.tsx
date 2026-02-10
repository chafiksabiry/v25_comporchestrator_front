import React, { useState, useEffect } from 'react';
import { GigAgent } from '../types/matching';
import GigAgentDetails from './GigAgentDetails';

interface GigAgentListProps {
    gigId?: string;
    agentId?: string;
}

const GigAgentList: React.FC<GigAgentListProps> = ({ gigId, agentId }) => {
    const [gigAgents, setGigAgents] = useState<GigAgent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedGigAgent, setSelectedGigAgent] = useState<GigAgent | null>(null);

    useEffect(() => {
        fetchGigAgents();
    }, [gigId, agentId]);

    const fetchGigAgents = async () => {
        try {
            setLoading(true);
            const MATCHING_API_URL = import.meta.env.VITE_MATCHING_API_URL || 'https://v25matchingbackend-production.up.railway.app/api';

            let url = `${MATCHING_API_URL}/gig-agents`;
            if (gigId) {
                url = `${MATCHING_API_URL}/gig-agents/gig/${gigId}`;
            } else if (agentId) {
                url = `${MATCHING_API_URL}/gig-agents/agent/${agentId}`;
            }

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Failed to fetch gig agents');
            }

            const data = await response.json();
            setGigAgents(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'accepted': return 'text-green-600 bg-green-100';
            case 'rejected': return 'text-red-600 bg-red-100';
            case 'completed': return 'text-blue-600 bg-blue-100';
            case 'cancelled': return 'text-gray-600 bg-gray-100';
            default: return 'text-yellow-600 bg-yellow-100';
        }
    };

    const getMatchStatusColor = (status: string) => {
        switch (status) {
            case 'perfect_match': return 'text-green-600 bg-green-100';
            case 'partial_match': return 'text-yellow-600 bg-yellow-100';
            case 'no_match': return 'text-red-600 bg-red-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const formatScore = (score: number) => {
        return `${Math.round(score * 100)}%`;
    };

    const getScoreColor = (score: number) => {
        if (score >= 0.8) return 'text-green-600';
        if (score >= 0.6) return 'text-yellow-600';
        return 'text-red-600';
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">Erreur</h3>
                        <div className="mt-2 text-sm text-red-700">{error}</div>
                    </div>
                </div>
            </div>
        );
    }

    if (gigAgents.length === 0) {
        return (
            <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune assignation trouvée</h3>
                <p className="mt-1 text-sm text-gray-500">
                    {gigId ? "Aucun agent n'a été assigné à ce gig." : "Cet agent n'a pas d'assignations."}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Modal pour les détails */}
            {selectedGigAgent && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
                        <GigAgentDetails
                            gigAgent={selectedGigAgent}
                            onClose={() => setSelectedGigAgent(null)}
                        />
                    </div>
                </div>
            )}

            {/* Liste des assignations */}
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                    {gigAgents.map((gigAgent) => (
                        <li key={gigAgent._id} className="px-6 py-4 hover:bg-gray-50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className="flex-shrink-0">
                                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                            <span className="text-sm font-medium text-blue-600">
                                                {gigAgent.agentId.substring(0, 2).toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center space-x-2">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                Agent: {gigAgent.agentId}
                                            </p>
                                            <span className="text-gray-400">•</span>
                                            <p className="text-sm text-gray-500 truncate">
                                                Gig: {gigAgent.gigId}
                                            </p>
                                        </div>
                                        <div className="flex items-center space-x-4 mt-1">
                                            <div className="flex items-center space-x-2">
                                                <span className="text-xs text-gray-500">Score:</span>
                                                <span className={`text-sm font-medium ${getScoreColor(gigAgent.matchScore)}`}>
                                                    {formatScore(gigAgent.matchScore)}
                                                </span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <span className="text-xs text-gray-500">Match:</span>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMatchStatusColor(gigAgent.matchStatus)}`}>
                                                    {gigAgent.matchStatus.replace('_', ' ')}
                                                </span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <span className="text-xs text-gray-500">Statut:</span>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(gigAgent.status)}`}>
                                                    {gigAgent.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => setSelectedGigAgent(gigAgent)}
                                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        Voir détails
                                    </button>
                                    {gigAgent.emailSent && (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                            Invited
                                        </span>
                                    )}
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Statistiques */}
            <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Statistiques</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{gigAgents.length}</div>
                        <div className="text-sm text-gray-500">Total</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                            {gigAgents.filter(ga => ga.status === 'accepted').length}
                        </div>
                        <div className="text-sm text-gray-500">Acceptées</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">
                            {gigAgents.filter(ga => ga.status === 'pending').length}
                        </div>
                        <div className="text-sm text-gray-500">En attente</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                            {gigAgents.filter(ga => ga.status === 'rejected').length}
                        </div>
                        <div className="text-sm text-gray-500">Rejetées</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GigAgentList;
