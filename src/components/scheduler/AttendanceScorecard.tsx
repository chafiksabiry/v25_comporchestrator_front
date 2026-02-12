import React, { useMemo } from 'react';
import { Rep, TimeSlot } from '../../types/scheduler';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { Award, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface AttendanceScoreCardProps {
    rep: Rep;
    slots: TimeSlot[];
}

export function AttendanceScorecard({ rep, slots }: AttendanceScoreCardProps) {
    // Calculate attendance metrics
    const metrics = useMemo(() => {
        const repSlots = slots.filter(slot =>
            slot.repId === rep.id &&
            slot.status === 'reserved' &&
            slot.attended !== undefined
        );

        const totalTracked = repSlots.length;
        const attended = repSlots.filter(slot => slot.attended === true).length;

        // Get current month slots
        const now = new Date();
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);

        const currentMonthSlots = repSlots.filter(slot => {
            const slotDate = new Date(slot.date);
            return isWithinInterval(slotDate, { start: monthStart, end: monthEnd });
        });

        const currentMonthTotal = currentMonthSlots.length;
        const currentMonthAttended = currentMonthSlots.filter(slot => slot.attended === true).length;

        // Calculate scores
        const attendanceScore = totalTracked > 0
            ? Math.round((attended / totalTracked) * 100)
            : 0;

        const currentMonthScore = currentMonthTotal > 0
            ? Math.round((currentMonthAttended / currentMonthTotal) * 100)
            : 0;

        // Calculate reliability tier
        let reliabilityTier = 'Unknown';
        if (totalTracked >= 5) {
            if (attendanceScore >= 95) reliabilityTier = 'Excellent';
            else if (attendanceScore >= 85) reliabilityTier = 'Good';
            else if (attendanceScore >= 75) reliabilityTier = 'Average';
            else reliabilityTier = 'Needs Improvement';
        }

        return {
            attendanceScore,
            currentMonthScore,
            totalTracked,
            attended,
            currentMonthTotal,
            currentMonthAttended,
            reliabilityTier
        };
    }, [rep, slots]);

    // Get color class based on score
    const getScoreColorClass = (score: number): string => {
        if (score >= 90) return 'text-green-600';
        if (score >= 80) return 'text-blue-600';
        if (score >= 70) return 'text-yellow-600';
        return 'text-red-600';
    };

    // Get tier color class
    const getTierColorClass = (tier: string): string => {
        switch (tier) {
            case 'Excellent': return 'bg-green-100 text-green-800';
            case 'Good': return 'bg-blue-100 text-blue-800';
            case 'Average': return 'bg-yellow-100 text-yellow-800';
            case 'Needs Improvement': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center mb-4">
                <Award className="w-5 h-5 text-blue-600 mr-2" />
                <h2 className="text-lg font-semibold text-gray-800">Attendance Scorecard</h2>
            </div>

            <div className="flex justify-center mb-6">
                <div className="w-32 h-32 rounded-full border-8 border-blue-100 flex items-center justify-center">
                    <div className="text-center">
                        <div className={`text-3xl font-bold ${getScoreColorClass(metrics.attendanceScore)}`}>
                            {metrics.attendanceScore}%
                        </div>
                        <div className="text-sm text-gray-500">Overall Score</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <div className="text-sm text-gray-500">Current Month</div>
                    <div className={`text-xl font-bold ${getScoreColorClass(metrics.currentMonthScore)}`}>
                        {metrics.currentMonthScore}%
                    </div>
                    <div className="text-xs text-gray-500">
                        {metrics.currentMonthAttended} of {metrics.currentMonthTotal} sessions
                    </div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <div className="text-sm text-gray-500">Reliability Tier</div>
                    <div className={`text-sm font-medium px-2 py-1 rounded-full inline-block mt-1 ${getTierColorClass(metrics.reliabilityTier)}`}>
                        {metrics.reliabilityTier}
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex justify-between items-center p-2 bg-green-50 rounded-lg">
                    <div className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                        <span className="text-sm">Sessions Attended</span>
                    </div>
                    <span className="font-medium">{metrics.attended}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-red-50 rounded-lg">
                    <div className="flex items-center">
                        <XCircle className="w-4 h-4 text-red-600 mr-2" />
                        <span className="text-sm">Sessions Missed</span>
                    </div>
                    <span className="font-medium">{metrics.totalTracked - metrics.attended}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-blue-50 rounded-lg">
                    <div className="flex items-center">
                        <AlertCircle className="w-4 h-4 text-blue-600 mr-2" />
                        <span className="text-sm">Total Tracked</span>
                    </div>
                    <span className="font-medium">{metrics.totalTracked}</span>
                </div>
            </div>

            {metrics.totalTracked < 5 && (
                <div className="mt-4 text-sm text-gray-500 bg-yellow-50 p-2 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-yellow-600 inline mr-1" />
                    Not enough data for reliable scoring (minimum 5 sessions)
                </div>
            )}
        </div>
    );
}
