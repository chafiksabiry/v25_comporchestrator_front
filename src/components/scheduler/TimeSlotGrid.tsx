import React from 'react';
import { TimeSlot, Project } from '../../types/scheduler';
import { Clock } from 'lucide-react';

interface TimeSlotGridProps {
    slots: TimeSlot[];
    onSlotClick: (id: string) => void;
    selectedSlotId: string | null;
    projects?: Project[]; // Optional for color matching
}

export function TimeSlotGrid({ slots, onSlotClick, selectedSlotId, projects = [] }: TimeSlotGridProps) {
    // Available hours (8 AM to 8 PM)
    const hours = Array.from({ length: 13 }, (_, i) => i + 8);

    const getSlotStyle = (slot: TimeSlot) => {
        let style = 'bg-white border-gray-200 text-gray-500 hover:border-gray-300';
        let label = 'Available';
        let borderColor = 'transparent';

        if (slot.status === 'reserved') {
            const project = projects.find(p => p.id === slot.projectId);
            if (project) {
                borderColor = project.color;
                style = 'bg-blue-50 text-blue-700 font-medium';
                label = project.name;
            } else {
                style = 'bg-blue-50 border-blue-200 text-blue-700 font-medium';
                label = 'Reserved';
            }
        } else if (slot.status === 'cancelled') {
            style = 'bg-red-50 border-red-200 text-red-700 opacity-50 cursor-not-allowed';
            label = 'Cancelled';
        }

        if (selectedSlotId === slot.id) {
            style += ' ring-2 ring-blue-500 ring-offset-1';
        }

        return { style, label, borderColor };
    };

    const getSlotForHour = (hour: number) => {
        const timeStr = `${hour.toString().padStart(2, '0')}:00`;
        return slots.find(s => s.startTime === timeStr);
    };

    return (
        <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center mb-4">
                <Clock className="w-5 h-5 text-gray-600 mr-2" />
                <h2 className="text-lg font-semibold text-gray-800">Daily Schedule</h2>
            </div>
            <div className="space-y-2">
                {hours.map((hour) => {
                    const slot = getSlotForHour(hour);
                    if (!slot) return null; // Or render empty slot placeholder

                    const { style, label, borderColor } = getSlotStyle(slot);

                    return (
                        <button
                            key={slot.id}
                            onClick={() => onSlotClick(slot.id)}
                            disabled={slot.status === 'cancelled'}
                            className={`w-full flex items-center p-3 rounded-lg border transition-all ${style}`}
                            style={{ borderLeftColor: borderColor, borderLeftWidth: borderColor !== 'transparent' ? '4px' : '1px' }}
                        >
                            <div className="w-16 text-sm font-medium">{slot.startTime}</div>
                            <div className="flex-1 text-left truncate">{label}</div>
                            {slot.duration > 1 && (
                                <div className="text-xs px-2 py-1 bg-gray-200 rounded-full text-gray-600">
                                    {slot.duration}h
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
