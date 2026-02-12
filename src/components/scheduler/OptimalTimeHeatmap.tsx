import React, { useState, useEffect } from 'react';
import { Rep, TimeSlot } from '../../types/scheduler';
import { predictOptimalTimes } from '../../services/schedulerAiService';
import { Clock } from 'lucide-react';

interface OptimalTimeHeatmapProps {
    rep: Rep;
    slots: TimeSlot[];
    onSelectHour: (hour: number) => void;
}

export function OptimalTimeHeatmap({ rep, slots, onSelectHour }: OptimalTimeHeatmapProps) {
    const [optimalTimes, setOptimalTimes] = useState<{ hour: number; score: number }[]>([]);

    useEffect(() => {
        // Generate predictions
        const predictions = predictOptimalTimes(rep, slots);
        setOptimalTimes(predictions);
    }, [rep, slots]);

    const getColorClass = (score: number): string => {
        if (score >= 0.8) return 'bg-green-500 text-white';
        if (score >= 0.6) return 'bg-green-200 text-green-800';
        if (score >= 0.4) return 'bg-yellow-200 text-yellow-800';
        if (score >= 0.2) return 'bg-orange-200 text-orange-800';
        return 'bg-gray-100 text-gray-500';
    };

    const getLabel = (score: number): string => {
        if (score >= 0.8) return 'Optimal';
        if (score >= 0.6) return 'Good';
        if (score >= 0.4) return 'Fair';
        return 'Low';
    };

    return (
        <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center mb-4">
                <Clock className="w-5 h-5 text-blue-600 mr-2" />
                <h2 className="text-lg font-semibold text-gray-800">Optimal Scheduling Times</h2>
            </div>

            <div className="grid grid-cols-6 gap-2">
                {optimalTimes.map(({ hour, score }) => (
                    <button
                        key={hour}
                        onClick={() => onSelectHour(hour)}
                        className={`p-2 rounded-lg flex flex-col items-center justify-center transition-colors hover:opacity-80 ${getColorClass(score)}`}
                    >
                        <span className="text-sm font-bold">{hour}:00</span>
                        <span className="text-xs mt-1">{getLabel(score)}</span>
                    </button>
                ))}
            </div>

            <div className="mt-4 flex items-center justify-center space-x-4 text-xs text-gray-500">
                <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-sm mr-1"></div>
                    <span>Best</span>
                </div>
                <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-200 rounded-sm mr-1"></div>
                    <span>Good</span>
                </div>
                <div className="flex items-center">
                    <div className="w-3 h-3 bg-yellow-200 rounded-sm mr-1"></div>
                    <span>Fair</span>
                </div>
                <div className="flex items-center">
                    <div className="w-3 h-3 bg-gray-100 rounded-sm mr-1"></div>
                    <span>Avoid</span>
                </div>
            </div>
        </div>
    );
}
