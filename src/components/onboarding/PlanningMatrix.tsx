import { useState, useEffect, useMemo } from 'react';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { TimeSlot, Rep } from '../../types/scheduler';
import { Clock, Calendar, Save } from 'lucide-react';
import { schedulerApi } from '../../services/schedulerService';
import React from 'react';

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
    const [isDragging, setIsDragging] = useState(false);
    const [dragValue, setDragValue] = useState<number | null>(null);

    useEffect(() => {
        const handlePointerUp = () => {
            setIsDragging(false);
            setDragValue(null);
        };
        window.addEventListener('pointerup', handlePointerUp);
        return () => window.removeEventListener('pointerup', handlePointerUp);
    }, []);

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

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-harx px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-4 text-white">
                    <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl">
                        <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold">Session Planning</h2>
                        <p className="text-harx-100 text-sm opacity-90">
                            Week of {weekStart instanceof Date && !isNaN(weekStart.getTime()) ? format(weekStart, 'MMMM d, yyyy') : 'Loading...'}
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 bg-white text-harx-600 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-harx-50 transition-all disabled:opacity-50 shadow-md shadow-black/10"
                >
                    {isSaving ? (
                        <div className="w-5 h-5 border-2 border-harx-600 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <Save className="w-5 h-5" />
                    )}
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto p-1">
                <table className="w-full border-collapse">
                    <thead>
                        <tr>
                            <th className="p-1.5 text-left text-gray-400 font-semibold text-[10px] border-b border-gray-100 w-16">Time</th>
                            {DAYS.map((day, idx) => (
                                <th key={day} className="p-1 text-center border-b border-gray-100 min-w-[70px]">
                                    <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">{day.slice(0, 3)}</div>
                                    <div className={`text-sm font-black ${weekDates[idx] instanceof Date && !isNaN(weekDates[idx].getTime()) && isSameDay(weekDates[idx], new Date()) ? 'text-harx-600' : 'text-gray-900'}`}>
                                        {weekDates[idx] instanceof Date && !isNaN(weekDates[idx].getTime()) ? format(weekDates[idx], 'dd') : '--'}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {HOURS.map(hour => (
                            <tr key={hour} className="group hover:bg-gray-50/50 transition-colors">
                                <td className="p-1 border-b border-gray-50 text-gray-500 font-bold text-xs">
                                    <div className="flex items-center gap-1">
                                        <Clock className="w-3 h-3 opacity-40" />
                                        {hour}:00
                                    </div>
                                </td>
                                {weekDates.map(date => {
                                    const dateStr = format(date, 'yyyy-MM-dd');
                                    const value = Number(localMatrix[dateStr]?.[hour]) || 0;
                                    return (
                                        <td key={dateStr} 
                                            className="p-0.5 border-b border-gray-50 text-center select-none"
                                            onPointerDown={() => {
                                                setIsDragging(true);
                                                setDragValue(value);
                                            }}
                                            onPointerEnter={() => {
                                                if (isDragging && dragValue !== null && value !== dragValue) {
                                                    handleCellChange(dateStr, hour, dragValue.toString());
                                                }
                                            }}
                                        >
                                            <input
                                                type="number"
                                                min="0"
                                                value={value === 0 ? '' : value}
                                                placeholder="0"
                                                onChange={(e) => handleCellChange(dateStr, hour, e.target.value)}
                                                className={`w-11 h-8 text-center rounded-lg font-black text-sm transition-all border-2 
                                                    ${value > 0
                                                        ? 'bg-harx-50 border-harx-200 text-harx-700 focus:ring-2 focus:ring-harx-100'
                                                        : 'bg-gray-50/50 border-transparent text-gray-400 hover:border-gray-200 focus:bg-white focus:border-harx-400'
                                                    }
                                                    outline-none appearance-none cursor-crosshair`}
                                            />
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="bg-gray-50/80">
                            <td className="p-1.5 font-black text-gray-900 text-xs">
                                <div className="flex items-center gap-1">
                                    <span className="text-sm">Σ</span>
                                    <span>Total</span>
                                </div>
                            </td>
                            {dayTotals.map((total, idx) => (
                                <td key={idx} className="p-1.5 text-center">
                                    <div className={`text-base font-black ${total > 0 ? 'text-harx-700' : 'text-gray-300'}`}>
                                        {total}
                                    </div>
                                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">REPS</div>
                                </td>
                            ))}
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}
