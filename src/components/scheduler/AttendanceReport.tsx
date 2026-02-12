import React, { useState } from 'react';
import { Rep, TimeSlot } from '../../types/scheduler';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { FileText, Download, Filter, CheckCircle, XCircle } from 'lucide-react';

interface AttendanceReportProps {
    reps: Rep[];
    slots: TimeSlot[];
}

export function AttendanceReport({ reps, slots }: AttendanceReportProps) {
    const [timeframe, setTimeframe] = useState<'all' | 'month' | 'week'>('month');
    const [sortBy, setSortBy] = useState<'name' | 'score'>('score');

    // Filter slots based on timeframe
    const filteredSlots = slots.filter(slot => {
        const slotDate = parseISO(slot.date);
        const now = new Date();

        if (timeframe === 'month') {
            const monthStart = startOfMonth(now);
            const monthEnd = endOfMonth(now);
            return isWithinInterval(slotDate, { start: monthStart, end: monthEnd });
        } else if (timeframe === 'week') {
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay());
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            return isWithinInterval(slotDate, { start: weekStart, end: weekEnd });
        }

        return true; // 'all' timeframe
    });

    // Calculate attendance scores for each rep
    const repScores = reps.map(rep => {
        const repSlots = filteredSlots.filter(slot =>
            slot.repId === rep.id &&
            slot.status === 'reserved' &&
            slot.attended !== undefined
        );

        const totalTracked = repSlots.length;
        const attended = repSlots.filter(slot => slot.attended === true).length;

        const score = totalTracked > 0
            ? Math.round((attended / totalTracked) * 100)
            : 0;

        return {
            ...rep,
            attendanceScore: score,
            totalTracked,
            attended
        };
    });

    // Sort reps based on selected sort option
    const sortedReps = [...repScores].sort((a, b) => {
        if (sortBy === 'name') {
            return a.name.localeCompare(b.name);
        } else {
            return (b.attendanceScore || 0) - (a.attendanceScore || 0);
        }
    });

    // Get color class based on score
    const getScoreColorClass = (score: number | undefined): string => {
        const safeScore = score || 0;
        if (safeScore >= 90) return 'text-green-600';
        if (safeScore >= 80) return 'text-blue-600';
        if (safeScore >= 70) return 'text-yellow-600';
        return 'text-red-600';
    };

    // Generate CSV data for export
    const generateCSV = () => {
        const headers = ['REP Name', 'Email', 'Attendance Score', 'Sessions Attended', 'Total Sessions', 'Specialties'];
        const rows = sortedReps.map(rep => [
            rep.name,
            rep.email,
            `${rep.attendanceScore}%`,
            rep.attended,
            rep.totalTracked,
            rep.specialties.join(', ')
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `attendance_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
        link.click();
    };

    return (
        <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                    <FileText className="w-5 h-5 text-blue-600 mr-2" />
                    <h2 className="text-lg font-semibold text-gray-800">Attendance Report</h2>
                </div>
                <button
                    onClick={generateCSV}
                    className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm font-medium flex items-center"
                >
                    <Download className="w-4 h-4 mr-1" />
                    Export
                </button>
            </div>

            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <select
                        value={timeframe}
                        onChange={(e) => setTimeframe(e.target.value as 'all' | 'month' | 'week')}
                        className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                        <option value="all">All Time</option>
                        <option value="month">This Month</option>
                        <option value="week">This Week</option>
                    </select>
                </div>
                <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">Sort by:</span>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as 'name' | 'score')}
                        className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                        <option value="score">Attendance Score</option>
                        <option value="name">Name</option>
                    </select>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                REP
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Attendance Score
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Sessions
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Specialties
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {sortedReps.map(rep => (
                            <tr key={rep.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                            {rep.avatar ? (
                                                <img
                                                    src={rep.avatar}
                                                    alt={rep.name}
                                                    className="h-10 w-10 rounded-full"
                                                />
                                            ) : (
                                                <span className="text-gray-500 text-sm">{rep.name.charAt(0)}</span>
                                            )}
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-medium text-gray-900">{rep.name}</div>
                                            <div className="text-sm text-gray-500">{rep.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className={`text-lg font-bold ${getScoreColorClass(rep.attendanceScore)}`}>
                                        {rep.attendanceScore}%
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="flex items-center mr-2">
                                            <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                                            <span className="text-sm">{rep.attended}</span>
                                        </div>
                                        <div className="flex items-center">
                                            <XCircle className="w-4 h-4 text-red-500 mr-1" />
                                            <span className="text-sm">{rep.totalTracked - rep.attended}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <div className="flex flex-wrap gap-1">
                                        {rep.specialties.map(specialty => (
                                            <span
                                                key={specialty}
                                                className="px-2 py-0.5 rounded-full text-xs bg-gray-100"
                                            >
                                                {specialty}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                            </tr>
                        ))}

                        {sortedReps.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                                    No attendance data available for the selected timeframe
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
