import React, { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { TimeSlot } from '../../types/scheduler';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from 'lucide-react';

interface CalendarProps {
    selectedDate: Date;
    onDateSelect: (date: Date) => void;
    slots: TimeSlot[];
    view?: 'week' | 'month';
}

export function Calendar({ selectedDate, onDateSelect, slots, view = 'month' }: CalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(startOfMonth(selectedDate));

    // Sync currentMonth if selectedDate changes drastically
    useEffect(() => {
        if (!isSameMonth(currentMonth, selectedDate)) {
            setCurrentMonth(startOfMonth(selectedDate));
        }
    }, [selectedDate]);

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const renderHeader = () => {
        return (
            <div className="flex items-center justify-between mb-6 px-2">
                <div className="flex items-center space-x-4">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                        <CalendarIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 leading-none">
                            {format(currentMonth, 'MMMM yyyy')}
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">Manage your team's schedule</p>
                    </div>
                </div>
                <div className="flex bg-gray-100 rounded-lg p-1 space-x-1">
                    <button
                        onClick={prevMonth}
                        className="p-2 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-600 hover:text-gray-900"
                        aria-label="Previous Month"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={nextMonth}
                        className="p-2 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-600 hover:text-gray-900"
                        aria-label="Next Month"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        );
    };

    const renderDays = () => {
        const days = [];
        const dateFormat = "EEE";
        const startDate = startOfWeek(currentMonth);

        for (let i = 0; i < 7; i++) {
            days.push(
                <div className="text-center font-semibold text-gray-400 text-xs uppercase tracking-wider py-3" key={i}>
                    {format(addDays(startDate, i), dateFormat)}
                </div>
            );
        }
        return <div className="grid grid-cols-7 mb-2">{days}</div>;
    };

    const renderCells = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);

        const dateFormat = "d";
        const rows = [];
        let days = [];
        let day = startDate;
        let formattedDate = "";

        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                formattedDate = format(day, dateFormat);
                const cloneDay = day;
                const isSelected = isSameDay(day, selectedDate);
                const isCurrentMonth = isSameMonth(day, monthStart);
                const isToday = isSameDay(day, new Date());

                const daySlots = slots.filter(slot => slot.date === format(cloneDay, 'yyyy-MM-dd'));
                const reservedCount = daySlots.filter(s => s.status === 'reserved').length;
                const availableCount = daySlots.filter(s => s.status === 'available').length;

                days.push(
                    <button
                        key={day.toString()}
                        onClick={() => onDateSelect(cloneDay)}
                        className={`
                            min-h-[120px] p-3 border border-gray-100 flex flex-col justify-between transition-all relative group
                            ${!isCurrentMonth ? 'bg-gray-50/50 text-gray-400' : 'bg-white'}
                            ${isSelected ? 'ring-2 ring-blue-600 shadow-md z-10' : 'hover:border-blue-200 hover:shadow-sm'}
                        `}
                    >
                        <div className="flex justify-between items-start w-full">
                            <span className={`
                                text-sm font-medium rounded-full w-8 h-8 flex items-center justify-center transition-colors
                                ${isToday ? 'bg-blue-600 text-white shadow-sm' : isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-700 group-hover:bg-gray-100'}
                            `}>
                                {formattedDate}
                            </span>
                            {/* Optional: Add a subtle dot for "Today" if not selected, or just rely on the circle */}
                        </div>

                        <div className="mt-2 w-full space-y-1.5">
                            {daySlots.length > 0 ? (
                                <>
                                    {reservedCount > 0 && (
                                        <div className="flex items-center text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded-md border border-purple-100">
                                            <Clock className="w-3 h-3 mr-1" />
                                            <span className="font-medium">{reservedCount}</span>
                                            <span className="ml-1 opacity-80">Booked</span>
                                        </div>
                                    )}
                                    {availableCount > 0 && (
                                        <div className="flex items-center text-xs px-2 py-1 bg-green-50 text-green-700 rounded-md border border-green-100">
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></div>
                                            <span className="font-medium">{availableCount}</span>
                                            <span className="ml-1 opacity-80">Open</span>
                                        </div>
                                    )}
                                </>
                            ) : (
                                isCurrentMonth && (
                                    <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-xs text-gray-400 font-medium">+ Plan</span>
                                    </div>
                                )
                            )}
                        </div>
                    </button>
                );
                day = addDays(day, 1);
            }
            rows.push(
                <div className="grid grid-cols-7" key={day.toString()}>
                    {days}
                </div>
            );
            days = [];
        }
        return <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">{rows}</div>;
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {renderHeader()}
            {renderDays()}
            {renderCells()}
        </div>
    );
}
