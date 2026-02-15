import React from 'react';
import { format } from 'date-fns';
import { TimeSlot, Gig } from '../../types/scheduler';
import { Clock, Trash2, Users } from 'lucide-react';
import { slotApi } from '../../services/slotService';

interface AvailableSlotsViewProps {
    slots: TimeSlot[];
    projects: Gig[];
    selectedDate: Date;
    selectedGigId: string | null;
    onRefresh: () => void;
}

export function AvailableSlotsView({ slots, projects, selectedDate, selectedGigId, onRefresh }: AvailableSlotsViewProps) {
    const availablePool = slots.filter(slot => {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        return slot.date === dateStr &&
            (!selectedGigId || slot.gigId === selectedGigId) &&
            (slot.reservedCount || 0) < (slot.capacity || 1);
    });

    const handleDelete = async (slotId: string) => {
        if (!window.confirm('Are you sure you want to delete this available slot?')) return;
        try {
            await slotApi.deleteSlot(slotId);
            onRefresh();
        } catch (error) {
            console.error('Error deleting slot:', error);
            alert('Failed to delete slot');
        }
    };

    if (availablePool.length === 0) return null;

    return (
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 mt-8">
            <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-6">
                <div className="flex items-center">
                    <div className="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center mr-4 shadow-lg shadow-emerald-200">
                        <Users className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Available Capacity</h2>
                        <p className="text-gray-500 font-semibold text-sm">Slots open for reservations</p>
                    </div>
                </div>
                <div className="bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
                    <span className="text-emerald-900 font-bold">{availablePool.length} slots open</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availablePool.map(slot => {
                    const project = projects.find(p => p.id === slot.gigId);
                    const remaining = (slot.capacity || 1) - (slot.reservedCount || 0);

                    return (
                        <div
                            key={slot.id}
                            className="group relative p-4 rounded-xl bg-gray-50/50 hover:bg-gray-100 transition-all duration-200 border-l-4 border-emerald-500"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h5 className="font-extrabold text-gray-800 text-sm">
                                    {project?.name || 'General Access'}
                                </h5>
                                <button
                                    onClick={() => handleDelete(slot.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                    title="Delete slot"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex items-center text-gray-600 text-xs font-bold mb-3">
                                <Clock className="w-3.5 h-3.5 mr-1.5 opacity-60" />
                                {slot.startTime} - {slot.endTime}
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-1">
                                    {[...Array(slot.capacity || 1)].map((_, i) => (
                                        <div
                                            key={i}
                                            className={`w-2 h-2 rounded-full ${i < (slot.reservedCount || 0) ? 'bg-emerald-600' : 'bg-gray-200'}`}
                                        />
                                    ))}
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                    {remaining} spots left
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
