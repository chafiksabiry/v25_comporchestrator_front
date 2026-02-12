import React, { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { TimeSlot } from '../../types/scheduler';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

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
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                    <CalendarIcon className="w-5 h-5 text-gray-600 mr-2" />
                    <h2 className="text-lg font-semibold text-gray-800">
                        {format(currentMonth, 'MMMM yyyy')}
                    </h2>
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={prevMonth}
                        className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                        aria-label="Previous Month"
                    >
                        <ChevronLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <button
                        onClick={nextMonth}
                        className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                        aria-label="Next Month"
                    >
                        <ChevronRight className="w-5 h-5 text-gray-600" />
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
                <div className="text-center font-bold text-gray-500 text-xs uppercase tracking-wider py-2" key={i}>
                    {format(addDays(startDate, i), dateFormat)}
                </div>
            );
        }
        return <div className="grid grid-cols-7 mb-2 border-b border-gray-200 pb-2">{days}</div>;
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
                const daySlots = slots.filter(slot => slot.date === format(cloneDay, 'yyyy-MM-dd'));
                const reservedCount = daySlots.filter(s => s.status === 'reserved').length;

                days.push(
                    <button
                        key={day.toString()}
                        onClick={() => onDateSelect(cloneDay)}
                        className={`
                            h-24 p-2 border border-gray-100 flex flex-col justify-start items-start transition-all relative
                            ${!isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white text-gray-800'}
                            ${isSelected ? 'ring-2 ring-blue-500 z-10 bg-blue-50' : 'hover:bg-gray-50'}
                        `}
                    >
                        <span className={`text-sm font-medium rounded-full w-7 h-7 flex items-center justify-center ${isSelected ? 'bg-blue-600 text-white' :
                                isSameDay(day, new Date()) ? 'bg-gray-200 text-gray-800' : ''
                            }`}>
                            {formattedDate}
                        </span>

                        <div className="mt-2 w-full space-y-1 overflow-y-auto max-h-[4rem] custom-scrollbar">
                            {daySlots.length > 0 && (
                                <>
                                    {reservedCount > 0 && (
                                        <div className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-md w-full text-left truncate">
                                            {reservedCount} scheduled
                                        </div>
                                    )}
                                    {daySlots.length - reservedCount > 0 && (
                                        <div className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-md w-full text-left truncate">
                                            {daySlots.length - reservedCount} open
                                        </div>
                                    )}
                                </>
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
        return <div className="border rounded-lg overflow-hidden bg-white shadow-sm">{rows}</div>;
    };

    return (
        <div className="bg-white rounded-lg shadow p-4">
            {renderHeader()}
            {renderDays()}
            {renderCells()}
        </div>
    );
}
