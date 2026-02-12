import React, { useState, useEffect } from 'react';
import { AIRecommendation, Project, Rep, TimeSlot } from '../../types/scheduler';
import { getProjectRecommendations } from '../../services/schedulerAiService';
import { Sparkles, Brain, ArrowRight } from 'lucide-react';

interface AIRecommendationsProps {
    rep: Rep;
    projects: Project[];
    slots: TimeSlot[];
    onSelectProject: (projectId: string) => void;
}

export function AIRecommendations({ rep, projects, slots, onSelectProject }: AIRecommendationsProps) {
    const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        // Generate recommendations when rep changes
        setLoading(true);

        // Small delay to simulate AI processing
        const timer = setTimeout(() => {
            const newRecommendations = getProjectRecommendations(rep, projects, slots);
            setRecommendations(newRecommendations);
            setLoading(false);
        }, 800);

        return () => clearTimeout(timer);
    }, [rep, projects, slots]);

    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow p-4 animate-pulse">
                <div className="flex items-center mb-4">
                    <div className="w-6 h-6 bg-blue-100 rounded-full mr-2"></div>
                    <div className="h-5 bg-blue-100 rounded w-48"></div>
                </div>
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 bg-gray-100 rounded"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center mb-4">
                <Brain className="w-5 h-5 text-purple-600 mr-2" />
                <h2 className="text-lg font-semibold text-gray-800">AI Project Recommendations</h2>
            </div>

            {recommendations.length > 0 ? (
                <div className="space-y-3">
                    {recommendations.slice(0, 3).map(recommendation => {
                        const project = projects.find(p => p.id === recommendation.projectId);
                        if (!project) return null;

                        return (
                            <div
                                key={recommendation.projectId}
                                className="border rounded-lg p-3 hover:bg-blue-50 transition-colors cursor-pointer"
                                onClick={() => onSelectProject(recommendation.projectId)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <div
                                            className="w-3 h-3 rounded-full mr-2"
                                            style={{ backgroundColor: project.color }}
                                        ></div>
                                        <h3 className="font-medium">{project.name}</h3>
                                    </div>
                                    <div className="flex items-center">
                                        <div className="text-xs font-medium px-2 py-1 rounded-full bg-purple-100 text-purple-800 flex items-center">
                                            <Sparkles className="w-3 h-3 mr-1" />
                                            {Math.round(recommendation.confidence * 100)}% match
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-gray-400 ml-2" />
                                    </div>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">{recommendation.reason}</p>
                                <div className="mt-2 flex flex-wrap gap-1">
                                    {project.skills.map(skill => (
                                        <span
                                            key={skill}
                                            className={`text-xs px-2 py-0.5 rounded-full ${rep.specialties.some(s =>
                                                s.toLowerCase().includes(skill.toLowerCase()) ||
                                                skill.toLowerCase().includes(s.toLowerCase())
                                            )
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-gray-100 text-gray-800'
                                                }`}
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-6 text-gray-500">
                    No recommendations available yet
                </div>
            )}
        </div>
    );
}
