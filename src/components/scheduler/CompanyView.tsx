import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { TimeSlot, Gig, Rep } from '../../types/scheduler';
import { Building, Clock } from 'lucide-react';

interface CompanyViewProps {
    company: string;
    slots: TimeSlot[];
    projects: Gig[];
    reps: Rep[];
    selectedDate: Date;
}

export function CompanyView({ company, slots, projects, reps, selectedDate }: CompanyViewProps) {
    const relevantSlots = useMemo(() => {
        return slots.filter(slot => {
            const project = projects.find(p => p.id === slot.gigId);
            return project?.company === company &&
                slot.date === format(selectedDate, 'yyyy-MM-dd') &&
                slot.status === 'reserved';
        });
    }, [slots, projects, company, selectedDate]);

    const repHours = useMemo(() => {
        const hours: Record<string, number> = {};

        relevantSlots.forEach(slot => {
            if (!hours[slot.repId]) {
                hours[slot.repId] = 0;
            }
            hours[slot.repId] += (slot.duration || 1);
        });

        return hours;
    }, [relevantSlots]);

    const totalHours = Object.values(repHours).reduce((sum, hours) => sum + hours, 0);

    return (
        <div className="bg-white rounded-lg p-6">
            <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    <Building className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">{company} Dashboard</h2>
            </div>

            <div className="mb-8">
                <h3 className="text-xl text-gray-800 mb-6">
                    Schedule for {format(selectedDate, 'MMMM d, yyyy')}
                </h3>

                <div className="flex items-center justify-between bg-blue-50/50 px-4 py-4 rounded-xl mb-8">
                    <div className="flex items-center">
                        <div className="bg-white p-2 rounded-lg shadow-sm mr-3">
                            <Clock className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="text-blue-900 font-semibold text-lg">Total Hours Scheduled</span>
                    </div>
                    <span className="text-2xl font-bold text-blue-900">{totalHours}h</span>
                </div>

                <div className="space-y-12">
                    {Object.entries(repHours).map(([repId, hours]) => {
                        const rep = reps.find(r => r.id === repId);
                        if (!rep) return null;

                        const repSlots = relevantSlots.filter(slot => slot.repId === repId);

                        return (
                            <div key={repId} className="space-y-4">
                                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                                    <div className="flex items-center">
                                        <div className="w-12 h-12 rounded-full overflow-hidden mr-4 border-2 border-white shadow-sm bg-gray-100">
                                            {rep.avatar ? (
                                                <img
                                                    src={rep.avatar}
                                                    alt={rep.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-600 font-bold text-lg">
                                                    {rep.name.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-bold text-gray-900 leading-tight">{rep.name}</h4>
                                            <p className="text-gray-500 text-sm">{rep.specialties.join(', ')}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xl font-bold text-gray-900">{hours}h</div>
                                        <div className="text-gray-400 text-sm font-medium">{repSlots.length} slots</div>
                                    </div>
                                </div>

                                <div className="space-y-3 pl-2">
                                    {repSlots.map(slot => {
                                        const project = projects.find(p => p.id === slot.gigId);

                                        return (
                                            <div
                                                key={slot.id}
                                                className="group flex flex-col justify-center py-3 px-4 rounded-xl bg-gray-50/50 hover:bg-gray-100 transition-all duration-200 border-l-[6px]"
                                                style={{ borderLeftColor: project?.color || '#3b82f6' }}
                                            >
                                                <h5 className="font-bold text-gray-800 text-[15px] mb-1">
                                                    {project?.name} - {company}
                                                </h5>
                                                <div className="flex items-center text-gray-500 text-[13px] font-medium">
                                                    <Clock className="w-3.5 h-3.5 mr-1.5" />
                                                    {slot.startTime} - {slot.endTime} ({slot.duration || 1}h)
                                                </div>
                                                {slot.notes && (
                                                    <div className="mt-2 text-sm text-gray-600 bg-white/50 p-2 rounded-lg italic">
                                                        "{slot.notes}"
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}

                    {Object.keys(repHours).length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                            <Clock className="w-12 h-12 text-gray-300 mb-3" />
                            <p className="text-gray-500 font-medium text-lg">No REPs scheduled for this date</p>
                            <p className="text-gray-400 text-sm mt-1">Assignments will appear here once reserved.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
