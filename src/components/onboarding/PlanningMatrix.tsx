import React, { useState, useEffect, useMemo } from 'react';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { TimeSlot, Rep } from '../../types/scheduler';
import { Clock, Calendar, Save } from 'lucide-react';
import { schedulerApi } from '../../services/schedulerService';

interface PlanningMatrixProps {
    selectedDate: Date;
    gigId: string;
    slots: TimeSlot[];
    reps: Rep[];
    onRefresh: () => void;
}

const HOURS = Array.from({ length: 11 }, (_, i) => i + 9); // 9:00 to 19:00
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function PlanningMatrix({ selectedDate, gigId, slots, onRefresh }: PlanningMatrixProps) {
    const [localMatrix, setLocalMatrix] = useState<Record<string, Record<number, number>>>({});
    const [isSaving, setIsSaving] = useState(false);

    // Get the start of the week (Monday) based on selectedDate
    const weekStart = useMemo(() => {
        try {
            const date = selectedDate instanceof Date ? selectedDate : new Date(selectedDate);
            const start = startOfWeek(date, { weekStartsOn: 1 });
            return start;
        } catch (e) {
            console.error('Error calculating weekStart:', e);
            return new Date();
        }
    }, [selectedDate]);

    const weekDates = useMemo(() => {
        return DAYS.map((_, i) => addDays(weekStart, i));
    }, [weekStart]);

    // Initialize/Sync local matrix with existing slots
    useEffect(() => {
        const matrix: Record<string, Record<number, number>> = {};

        weekDates.forEach(date => {
            const dateStr = format(date, 'yyyy-MM-dd');
            matrix[dateStr] = {};
            HOURS.forEach(hour => {
                const timeStr = `${hour.toString().padStart(2, '0')}:00`;
                const slot = slots.find(s => s.date === dateStr && s.startTime === timeStr && s.gigId === gigId);
                matrix[dateStr][hour] = slot ? (slot.capacity || 0) : 0;
            });
        });

        setLocalMatrix(matrix);
    }, [slots, weekDates, gigId]);

    const handleCellChange = (dateStr: string, hour: number, value: string) => {
        const numValue = parseInt(value) || 0;
        setLocalMatrix(prev => ({
            ...prev,
            [dateStr]: {
                ...prev[dateStr],
                [hour]: Math.max(0, numValue)
            }
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const slotsToUpdate: Partial<TimeSlot>[] = [];

            for (const dateStr of Object.keys(localMatrix)) {
                for (const hour of HOURS) {
                    const capacity = localMatrix[dateStr][hour];
                    const timeStr = `${hour.toString().padStart(2, '0')}:00`;
                    const endTimeStr = `${(hour + 1).toString().padStart(2, '0')}:00`;

                    slotsToUpdate.push({
                        date: dateStr,
                        startTime: timeStr,
                        endTime: endTimeStr,
                        capacity: capacity,
                        duration: 1,
                        notes: ''
                    });
                }
            }

            if (slotsToUpdate.length > 0) {
                await schedulerApi.bulkUpsertTimeSlots(gigId, slotsToUpdate);
            }

            onRefresh();
        } catch (error) {
            console.error('Error saving matrix:', error);
        } finally {
            setIsSaving(false);
        }
    };

    // Calculate totals
    const dayTotals = weekDates.map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return Object.values(localMatrix[dateStr] || {}).reduce((sum, val) => sum + val, 0);
    });

    const totalReps = dayTotals.reduce((sum, val) => sum + val, 0);
    const hourlyRate = 17; // Based on whiteboard image "96R x 17" -> maybe 17 is rate?
    const totalValue = totalReps * hourlyRate; // Total reps * rate

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-6 flex items-center justify-between">
                <div className="flex items-center gap-4 text-white">
                    <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl">
                        <Calendar className="w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">Weekly Planning Matrix</h2>
                        <p className="text-blue-100 text-sm opacity-90">
                            Week of {weekStart instanceof Date && !isNaN(weekStart.getTime()) ? format(weekStart, 'MMMM d, yyyy') : 'Loading...'}
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 bg-white text-blue-700 px-6 py-3 rounded-xl font-bold hover:bg-blue-50 transition-all disabled:opacity-50 shadow-lg shadow-black/10"
                >
                    {isSaving ? (
                        <div className="w-5 h-5 border-2 border-blue-700 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <Save className="w-5 h-5" />
                    )}
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto p-4">
                <table className="w-full border-collapse">
                    <thead>
                        <tr>
                            <th className="p-4 text-left text-gray-400 font-semibold text-sm border-b border-gray-100 w-24">Time</th>
                            {DAYS.map((day, idx) => (
                                <th key={day} className="p-4 text-center border-b border-gray-100 min-w-[100px]">
                                    <div className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-1">{day}</div>
                                    <div className={`text-lg font-black ${weekDates[idx] instanceof Date && !isNaN(weekDates[idx].getTime()) && isSameDay(weekDates[idx], new Date()) ? 'text-blue-600' : 'text-gray-900'}`}>
                                        {weekDates[idx] instanceof Date && !isNaN(weekDates[idx].getTime()) ? format(weekDates[idx], 'dd') : '--'}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {HOURS.map(hour => (
                            <tr key={hour} className="group hover:bg-gray-50/50 transition-colors">
                                <td className="p-4 border-b border-gray-50 text-gray-500 font-bold text-sm">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 opacity-40" />
                                        {hour}:00
                                    </div>
                                </td>
                                {weekDates.map(date => {
                                    const dateStr = format(date, 'yyyy-MM-dd');
                                    const value = localMatrix[dateStr]?.[hour] || 0;
                                    return (
                                        <td key={dateStr} className="p-2 border-b border-gray-50 text-center">
                                            <input
                                                type="number"
                                                min="0"
                                                value={value === 0 ? '' : value}
                                                placeholder="0"
                                                onChange={(e) => handleCellChange(dateStr, hour, e.target.value)}
                                                className={`w-16 h-12 text-center rounded-xl font-black text-lg transition-all border-2 
                                                    ${value > 0
                                                        ? 'bg-blue-50 border-blue-200 text-blue-700 focus:ring-4 focus:ring-blue-100'
                                                        : 'bg-gray-50/50 border-transparent text-gray-400 hover:border-gray-200 focus:bg-white focus:border-blue-400'
                                                    }
                                                    outline-none appearance-none`}
                                            />
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="bg-gray-50/80">
                            <td className="p-6 font-black text-gray-900 text-lg">
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl">Σ</span>
                                    <span>Totals</span>
                                </div>
                            </td>
                            {dayTotals.map((total, idx) => (
                                <td key={idx} className="p-6 text-center">
                                    <div className={`text-2xl font-black ${total > 0 ? 'text-blue-700' : 'text-gray-300'}`}>
                                        {total}
                                    </div>
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mt-1">REPS</div>
                                </td>
                            ))}
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Calculations Footer - Inspired by whiteboard */}
            <div className="p-10 border-t-4 border-double border-gray-100 bg-gray-50/30">
                <div className="flex flex-wrap items-center gap-12 justify-center lg:justify-start">
                    {/* Big Summary Box */}
                    <div className="relative">
                        <div className="absolute -top-3 -left-3 px-3 py-1 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest rounded-md shadow-lg">
                            Total Units
                        </div>
                        <div className="w-40 h-28 bg-white border-4 border-gray-900 rounded-2xl flex items-center justify-center shadow-xl">
                            <span className="text-5xl font-black text-gray-900 tracking-tighter">
                                {totalReps}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-6">
                            <div className="flex flex-col">
                                <span className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Weekly Volume</span>
                                <div className="flex items-end gap-2">
                                    <span className="text-3xl font-black text-gray-900 underline decoration-blue-500 decoration-4 underline-offset-8">
                                        {totalReps}R
                                    </span>
                                    <span className="text-2xl font-black text-gray-400 mb-1">×</span>
                                    <span className="text-3xl font-black text-gray-900 underline decoration-indigo-500 decoration-4 underline-offset-8">
                                        {hourlyRate}
                                    </span>
                                </div>
                            </div>

                            <div className="text-4xl text-gray-400 font-light mt-4">→</div>

                            <div className="flex flex-col">
                                <span className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Projected Total</span>
                                <div className="text-5xl font-black text-blue-700 tracking-tighter">
                                    {totalValue.toLocaleString()} €
                                    <span className="w-12 h-1.5 bg-blue-700 block mt-1"></span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
