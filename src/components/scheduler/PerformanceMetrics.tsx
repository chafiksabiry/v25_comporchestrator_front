import React, { useState, useEffect } from 'react';
import { Rep, TimeSlot, PerformanceMetric } from '../../types/scheduler';
import { calculatePerformanceMetrics } from '../../services/schedulerAiService';
import { TrendingUp, BarChart2 } from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip as ChartTooltip,
    Legend
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    ChartTooltip,
    Legend
);

interface PerformanceMetricsProps {
    rep: Rep;
    slots: TimeSlot[];
}

export function PerformanceMetrics({ rep, slots }: PerformanceMetricsProps) {
    const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);

    useEffect(() => {
        const newMetrics = calculatePerformanceMetrics(rep, slots);
        setMetrics(newMetrics);
    }, [rep, slots]);

    const chartData = {
        labels: ['Satisfaction', 'Efficiency', 'Quality'],
        datasets: [
            {
                label: 'Performance Score',
                data: [
                    metrics.find(m => m.metric === 'satisfaction')?.value || 0,
                    metrics.find(m => m.metric === 'efficiency')?.value || 0,
                    metrics.find(m => m.metric === 'quality')?.value || 0,
                ],
                backgroundColor: [
                    'rgba(59, 130, 246, 0.6)',
                    'rgba(16, 185, 129, 0.6)',
                    'rgba(139, 92, 246, 0.6)',
                ],
                borderColor: [
                    'rgb(59, 130, 246)',
                    'rgb(16, 185, 129)',
                    'rgb(139, 92, 246)',
                ],
                borderWidth: 1,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: true,
                max: 100,
            },
        },
        plugins: {
            legend: {
                display: false,
            },
        },
    };

    return (
        <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center mb-4">
                <TrendingUp className="w-5 h-5 text-green-600 mr-2" />
                <h2 className="text-lg font-semibold text-gray-800">Performance Metrics</h2>
            </div>

            <div className="h-64 mb-4">
                <Bar data={chartData} options={chartOptions} />
            </div>

            <div className="grid grid-cols-3 gap-2">
                {metrics.map(metric => (
                    <div key={metric.metric} className="text-center p-2 bg-gray-50 rounded-lg">
                        <div className="text-xs text-gray-500 capitalize">{metric.metric}</div>
                        <div className="text-lg font-bold">{Math.round(metric.value)}%</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
