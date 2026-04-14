import React, { useState, useEffect, useMemo } from 'react';
import { format, startOfWeek, addDays } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { TimeSlot, Rep } from '../../types/scheduler';
import { Clock, Calendar, Save } from 'lucide-react';
import { schedulerApi } from '../../services/schedulerService';

interface PlanningMatrixProps {
    selectedDate: Date;
    gigId: string;
    slots: TimeSlot[];
    reps: Rep[];
    onRefresh: () => void;
    /** Clic sur un jour → date concrète (même semaine que `selectedDate`) pour l’aperçu des réservations */
    onSelectDay?: (date: Date) => void;
}

const HOURS = Array.from({ length: 11 }, (_, i) => i + 9); // 9:00 to 19:00
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

/** Lundi … dimanche de la semaine calendaire qui contient `anchor` (semaine ISO lundi) */
function getDateForDayInWeek(anchor: Date, dayName: (typeof DAYS)[number]): Date {
    const dayIndex = DAYS.indexOf(dayName);
    const monday = startOfWeek(anchor, { weekStartsOn: 1 });
    return addDays(monday, dayIndex);
}

export function PlanningMatrix({ selectedDate, gigId, slots, onRefresh, onSelectDay }: PlanningMatrixProps) {
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

    // Initialize/Sync local matrix with existing slots
    useEffect(() => {
        const matrix: Record<string, Record<number, number>> = {};

        DAYS.forEach(dayName => {
            matrix[dayName] = {};
            HOURS.forEach(hour => {
                const timeStr = `${hour.toString().padStart(2, '0')}:00`;
                const slot = slots.find(s => s.date === dayName && s.startTime === timeStr && s.gigId === gigId);
                // Important: Use + here to ensure it's a number
                matrix[dayName][hour] = slot ? (Number(slot.capacity) || 0) : 0;
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
    }, [slots, gigId]);
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

            for (const dayName of Object.keys(localMatrix)) {
                for (const hour of HOURS) {
                    const capacity = localMatrix[dayName][hour];
                    const timeStr = `${hour.toString().padStart(2, '0')}:00`;
                    const endTimeStr = `${(hour + 1).toString().padStart(2, '0')}:00`;

                    slotsToUpdate.push({
                        date: dayName,
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
        return DAYS.map(dayName => {
            const dayData = localMatrix[dayName] || {};
            // Sum all hours for this day
            return HOURS.reduce((sum, hour) => {
                const val = Number(dayData[hour]) || 0;
                return sum + val;
            }, 0);
        });
    }, [localMatrix]);

    const todayWeekdayEnglish = useMemo(
        () => format(new Date(), 'EEEE', { locale: enUS }),
        []
    );

    const selectedWeekdayEnglish = useMemo(
        () => format(selectedDate, 'EEEE', { locale: enUS }),
        [selectedDate]
    );

    const handleDayHeaderClick = (day: (typeof DAYS)[number]) => {
        if (!onSelectDay) return;
        onSelectDay(getDateForDayInWeek(selectedDate, day));
    };

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
                            General Weekly Schedule
                        </p>
                        {onSelectDay && (
                            <p className="text-[11px] text-white/85 font-semibold mt-0.5">
                                Reservations:{' '}
                                <span className="font-black">{format(selectedDate, 'EEE d MMM yyyy', { locale: enUS })}</span>
                                <span className="text-white/70 font-normal"> — click a day below</span>
                            </p>
                        )}
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
                            {DAYS.map(day => {
                                const isTodayCol = day === todayWeekdayEnglish;
                                const isSelectedCol = day === selectedWeekdayEnglish;
                                return (
                                    <th
                                        key={day}
                                        className={`p-0.5 text-center border-b min-w-[72px] ${
                                            isSelectedCol && onSelectDay
                                                ? 'bg-harx-50 border-harx-400 ring-2 ring-harx-500/50'
                                                : isTodayCol
                                                  ? 'bg-harx-100/90 border-harx-200 ring-1 ring-harx-300/60'
                                                  : 'border-gray-100'
                                        }`}
                                    >
                                        {onSelectDay ? (
                                            <button
                                                type="button"
                                                onClick={() => handleDayHeaderClick(day)}
                                                className={`w-full rounded-lg py-1.5 px-0.5 flex flex-col items-center gap-0.5 transition-colors ${
                                                    isSelectedCol
                                                        ? 'bg-white/90 shadow-sm'
                                                        : 'hover:bg-white/40'
                                                }`}
                                                aria-pressed={isSelectedCol}
                                                title={`Voir les réservations du ${format(getDateForDayInWeek(selectedDate, day), 'd MMM yyyy', { locale: enUS })}`}
                                            >
                                                {isTodayCol && (
                                                    <span className="text-[8px] font-black uppercase tracking-tight text-harx-700 leading-none">
                                                        Today
                                                    </span>
                                                )}
                                                {isSelectedCol && !isTodayCol && (
                                                    <span className="text-[8px] font-black uppercase tracking-tight text-harx-600 leading-none">
                                                        Selected
                                                    </span>
                                                )}
                                                <div
                                                    className={`text-[10px] uppercase tracking-wider font-bold ${
                                                        isSelectedCol ? 'text-harx-800' : isTodayCol ? 'text-harx-800' : 'text-gray-500'
                                                    }`}
                                                >
                                                    {day.slice(0, 3)}
                                                </div>
                                            </button>
                                        ) : (
                                            <div className="flex flex-col items-center gap-0.5 py-1">
                                                {isTodayCol && (
                                                    <span className="text-[8px] font-black uppercase tracking-tight text-harx-700 leading-none">
                                                        Today
                                                    </span>
                                                )}
                                                <div
                                                    className={`text-[10px] uppercase tracking-wider font-bold ${
                                                        isTodayCol ? 'text-harx-800' : 'text-gray-500'
                                                    }`}
                                                >
                                                    {day.slice(0, 3)}
                                                </div>
                                            </div>
                                        )}
                                    </th>
                                );
                            })}
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
                                {DAYS.map(dayName => {
                                    const value = Number(localMatrix[dayName]?.[hour]) || 0;
                                    const isTodayCol = dayName === todayWeekdayEnglish;
                                    const isSelectedCol = dayName === selectedWeekdayEnglish;
                                    return (
                                        <td key={dayName} 
                                            className={`p-0.5 border-b text-center select-none ${
                                                isSelectedCol && onSelectDay
                                                    ? 'bg-harx-50/95 border-harx-200'
                                                    : isTodayCol
                                                      ? 'bg-harx-50/90 border-harx-100'
                                                      : 'border-gray-50'
                                            }`}
                                            onPointerDown={() => {
                                                setIsDragging(true);
                                                setDragValue(value);
                                            }}
                                            onPointerEnter={() => {
                                                if (isDragging && dragValue !== null && value !== dragValue) {
                                                    handleCellChange(dayName, hour, dragValue.toString());
                                                }
                                            }}
                                        >
                                            <input
                                                type="number"
                                                min="0"
                                                value={value === 0 ? '' : value}
                                                placeholder=""
                                                onChange={(e) => handleCellChange(dayName, hour, e.target.value)}
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
                            {dayTotals.map((total, idx) => {
                                const d = DAYS[idx];
                                const isTodayCol = d === todayWeekdayEnglish;
                                const isSelectedCol = d === selectedWeekdayEnglish;
                                return (
                                    <td
                                        key={idx}
                                        className={`p-0 text-center ${
                                            isSelectedCol && onSelectDay
                                                ? 'bg-harx-50/95 border-t-2 border-harx-400'
                                                : isTodayCol
                                                  ? 'bg-harx-50/90 border-t border-harx-200'
                                                  : ''
                                        }`}
                                    >
                                        {onSelectDay ? (
                                            <button
                                                type="button"
                                                onClick={() => handleDayHeaderClick(d)}
                                                className={`w-full py-1.5 px-0.5 rounded-b-lg transition-colors ${
                                                    isSelectedCol ? 'cursor-default' : 'hover:bg-harx-100/50 cursor-pointer'
                                                }`}
                                                title={`Réservations du ${format(getDateForDayInWeek(selectedDate, d), 'd MMM yyyy', { locale: enUS })}`}
                                            >
                                                <div className={`text-base font-black ${total > 0 ? 'text-harx-700' : 'text-gray-300'}`}>
                                                    {total}
                                                </div>
                                                <div className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">REPS</div>
                                            </button>
                                        ) : (
                                            <>
                                                <div className={`text-base font-black ${total > 0 ? 'text-harx-700' : 'text-gray-300'}`}>
                                                    {total}
                                                </div>
                                                <div className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">REPS</div>
                                            </>
                                        )}
                                    </td>
                                );
                            })}
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}
