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
                // Important: Use + here to ensure it's a number
                matrix[dateStr][hour] = slot ? (Number(slot.capacity) || 0) : 0;
            });
        });

        // Only update if we don't have local changes or after a save is complete
        setLocalMatrix(prev => {
            // Merge logic: keep local values if they exist, otherwise use from slots
            // This prevents the flickering "0" problem if fetchData takes time
            const next = { ...prev };
            Object.keys(matrix).forEach(d => {
                next[d] = { ...(next[d] || {}), ...matrix[d] };
            });
            return next;
        });
    }, [slots, weekDates, gigId]);
    // Removed old sync logic

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
                console.log(`[PlanningMatrix] Saving ${slotsToUpdate.length} slots for gig ${gigId}...`);
                const response = await schedulerApi.bulkUpsertTimeSlots(gigId, slotsToUpdate);
                console.log('[PlanningMatrix] Save successful:', response);
            }

            onRefresh();
        } catch (error) {
            console.error('Error saving matrix:', error);
        } finally {
            setIsSaving(false);
        }
    };

    // Calculate totals with explicit casting and memoization
    const dayTotals = useMemo(() => {
        return weekDates.map(date => {
            const dateStr = format(date, 'yyyy-MM-dd');
            const dayData = localMatrix[dateStr] || {};
            // Sum all hours for this day
            return HOURS.reduce((sum, hour) => {
                const val = Number(dayData[hour]) || 0;
                return sum + val;
            }, 0);
        });
    }, [localMatrix, weekDates]);

    const totalReps = useMemo(() => {
        return dayTotals.reduce((sum, val) => sum + val, 0);
    }, [dayTotals]);
    const hourlyRate = 17; // Based on whiteboard image "96R x 17" -> maybe 17 is rate?
    const totalValue = totalReps * hourlyRate; // Total reps * rate

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            {/* Header */}
            {/* Header */}
            <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-10 py-8 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6 text-white text-center md:text-left">
                    <div className="p-4 bg-white/10 backdrop-blur-xl rounded-2xl ring-1 ring-white/20 shadow-2xl">
                        <Calendar className="w-10 h-10" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black tracking-tight">Session Planning</h2>
                        <p className="text-blue-100 text-sm font-medium opacity-80 mt-1">
                            Week of {weekStart instanceof Date && !isNaN(weekStart.getTime()) ? format(weekStart, 'MMMM d, yyyy') : 'Loading...'}
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="group relative flex items-center gap-3 bg-white text-blue-700 px-8 py-4 rounded-2xl font-black text-lg transition-all duration-300 disabled:opacity-50 shadow-[0_15px_30px_rgba(0,0,0,0.1)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.15)] hover:-translate-y-1 active:scale-95 min-w-[200px] justify-center overflow-hidden"
                >
                    <div className="absolute inset-0 bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative flex items-center gap-3">
                        {isSaving ? (
                            <div className="w-6 h-6 border-3 border-blue-700 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <Save className="w-6 h-6 group-hover:rotate-12 transition-transform duration-300" />
                        )}
                        <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                    </div>
                </button>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto">
                <div className="min-w-full p-8">
                    <table className="w-full border-separate border-spacing-y-2">
                        <thead>
                            <tr className="text-gray-400">
                                <th className="px-4 py-6 text-left font-black text-xs uppercase tracking-[0.2em] w-32 pb-8">Time Slot</th>
                                {DAYS.map((day, idx) => (
                                    <th key={day} className="px-4 py-2 text-center pb-8 min-w-[110px]">
                                        <div className="text-[10px] uppercase font-black tracking-[0.2em] text-gray-400 mb-2">{day}</div>
                                        <div className={`text-2xl font-black w-12 h-12 flex items-center justify-center mx-auto rounded-xl transition-all duration-300
                                            ${weekDates[idx] instanceof Date && !isNaN(weekDates[idx].getTime()) && isSameDay(weekDates[idx], new Date())
                                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 ring-4 ring-blue-500/10'
                                                : 'text-gray-900'}`}>
                                            {weekDates[idx] instanceof Date && !isNaN(weekDates[idx].getTime()) ? format(weekDates[idx], 'dd') : '--'}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {HOURS.map(hour => (
                                <tr key={hour} className="group/row">
                                    <td className="px-4 py-4 pr-8">
                                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 border border-gray-100/50 group-hover/row:bg-blue-50 group-hover/row:border-blue-100 transition-all duration-300">
                                            <div className="p-2 bg-white rounded-lg shadow-sm group-hover/row:text-blue-600">
                                                <Clock className="w-4 h-4" />
                                            </div>
                                            <span className="text-gray-600 font-bold text-sm tracking-tight">{hour}:00</span>
                                        </div>
                                    </td>
                                    {weekDates.map(date => {
                                        const dateStr = format(date, 'yyyy-MM-dd');
                                        const value = Number(localMatrix[dateStr]?.[hour]) || 0;
                                        return (
                                            <td key={dateStr} className="px-2 py-1 text-center">
                                                <div className="relative group/cell">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={value === 0 ? '' : value}
                                                        placeholder="0"
                                                        onChange={(e) => handleCellChange(dateStr, hour, e.target.value)}
                                                        className={`w-full h-14 text-center rounded-2xl font-black text-xl transition-all duration-300 border-2
                                                            ${value > 0
                                                                ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20 focus:ring-8 focus:ring-blue-500/10'
                                                                : 'bg-white border-gray-100/80 text-gray-400 hover:border-blue-400/30 focus:bg-white focus:border-blue-500 focus:text-blue-600 focus:ring-8 focus:ring-blue-500/5'
                                                            }
                                                            outline-none appearance-none cursor-pointer placeholder:opacity-20`}
                                                    />
                                                    {value > 0 && (
                                                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full border-2 border-blue-600 animate-pulse"></div>
                                                    )}
                                                </div>
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
        </div>
    );
}
