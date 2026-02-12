import React, { useState, useEffect } from 'react';
import { TimeSlot, WorkloadPrediction } from '../../types/scheduler';
import { predictWorkload } from '../../services/schedulerAiService';
import { LineChart, Calendar } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

interface WorkloadPredictionProps {
    slots: TimeSlot[];
}

export function WorkloadPredictionComponent({ slots }: WorkloadPredictionProps) {
    const [predictions, setPredictions] = useState<WorkloadPrediction[]>([]);

    useEffect(() => {
        const newPredictions = predictWorkload(slots);
        setPredictions(newPredictions);
    }, [slots]);

    const chartData = {
        labels: predictions.map(p => {
            const date = new Date(p.date);
            return `${date.getDate()}/${date.getMonth() + 1}`;
        }),
        datasets: [
            {
                label: 'Predicted Hours',
                data: predictions.map(p => p.predictedHours),
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.5)',
                tension: 0.3,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const,
            },
            title: {
                display: false,
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Hours'
                }
            }
        }
    };

    return (
        <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center mb-4">
                <LineChart className="w-5 h-5 text-purple-600 mr-2" />
                <h2 className="text-lg font-semibold text-gray-800">Workload Prediction</h2>
            </div>

            <div className="h-64">
                <Line data={chartData} options={chartOptions} />
            </div>

            <div className="mt-4 bg-purple-50 p-3 rounded-lg flex items-start">
                <Calendar className="w-5 h-5 text-purple-600 mr-2 mt-0.5" />
                <div>
                    <h4 className="font-medium text-purple-900">AI Insight</h4>
                    <p className="text-sm text-purple-800 mt-1">
                        Based on historical trends, next week appears to have heavier workload on Tuesday and Thursday. Consider distributing tasks earlier in the week.
                    </p>
                </div>
            </div>
        </div>
    );
}
