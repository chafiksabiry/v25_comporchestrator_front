import React from 'react';
import { format, startOfWeek, addDays } from 'date-fns';
import { TimeSlot } from '../../types/scheduler';
import { Calendar as CalendarIcon } from 'lucide-react';

interface CalendarProps {
    selectedDate: Date;
    onDateSelect: (date: Date) => void;
    slots: TimeSlot[];
}

export function Calendar({ selectedDate, onDateSelect, slots }: CalendarProps) {
    const weekStart = startOfWeek(selectedDate);
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
        <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center mb-4">
                <CalendarIcon className="w-5 h-5 text-gray-600 mr-2" />
                <h2 className="text-lg font-semibold text-gray-800">Schedule</h2>
            </div>
            <div className="grid grid-cols-7 gap-2">
                {weekDays.map((day) => (
                    <button
                        key={day.toString()}
                        onClick={() => onDateSelect(day)}
                        className={`p-2 text-center rounded-lg transition-colors ${format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
                                ? 'bg-blue-500 text-white'
                                : 'hover:bg-gray-100'
                            }`}
                    >
                        <div className="text-sm font-medium">{format(day, 'EEE')}</div>
                        <div className="text-lg">{format(day, 'd')}</div>
                        <div className="text-xs mt-1">
                            {slots.filter((slot) => slot.date === format(day, 'yyyy-MM-dd')).length} slots
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
