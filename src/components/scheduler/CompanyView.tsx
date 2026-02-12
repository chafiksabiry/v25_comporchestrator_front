import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { TimeSlot, Project, Rep } from '../../types/scheduler';
import { Building, Clock, User } from 'lucide-react';

interface CompanyViewProps {
    company: string;
    slots: TimeSlot[];
    projects: Project[];
    reps: Rep[];
    selectedDate: Date;
}

export function CompanyView({ company, slots, projects, reps, selectedDate }: CompanyViewProps) {
    const companyProjects = projects.filter(p => p.company === company);

    const relevantSlots = useMemo(() => {
        return slots.filter(slot => {
            const project = projects.find(p => p.id === slot.projectId);
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
            hours[slot.repId] += slot.duration;
        });

        return hours;
    }, [relevantSlots]);

    const totalHours = Object.values(repHours).reduce((sum, hours) => sum + hours, 0);

    return (
        <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center mb-6">
                <Building className="w-6 h-6 text-blue-600 mr-2" />
                <h2 className="text-xl font-bold text-gray-800">{company} Dashboard</h2>
            </div>

            <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                    Schedule for {format(selectedDate, 'MMMM d, yyyy')}
                </h3>

                <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg mb-4">
                    <div className="flex items-center">
                        <Clock className="w-5 h-5 text-blue-600 mr-2" />
                        <span className="text-blue-800 font-medium">Total Hours Scheduled</span>
                    </div>
                    <span className="text-xl font-bold text-blue-800">{totalHours}h</span>
                </div>

                <div className="space-y-4">
                    {Object.entries(repHours).map(([repId, hours]) => {
                        const rep = reps.find(r => r.id === repId);
                        if (!rep) return null;

                        const repSlots = relevantSlots.filter(slot => slot.repId === repId);

                        return (
                            <div key={repId} className="border rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center">
                                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                                            {rep.avatar ? (
                                                <img
                                                    src={rep.avatar}
                                                    alt={rep.name}
                                                    className="w-full h-full rounded-full object-cover"
                                                />
                                            ) : (
                                                <User className="w-5 h-5 text-gray-500" />
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-gray-800">{rep.name}</h4>
                                            <p className="text-sm text-gray-500">{rep.specialties.join(', ')}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-lg font-bold text-gray-800">{hours}h</span>
                                        <p className="text-sm text-gray-500">{repSlots.length} slots</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {repSlots.map(slot => {
                                        const project = projects.find(p => p.id === slot.projectId);

                                        return (
                                            <div
                                                key={slot.id}
                                                className="flex items-center justify-between p-2 rounded bg-gray-50"
                                                style={{ borderLeft: `4px solid ${project?.color || '#ccc'}` }}
                                            >
                                                <div>
                                                    <p className="font-medium">{project?.name}</p>
                                                    <p className="text-sm text-gray-500">
                                                        {slot.startTime} - {slot.endTime} ({slot.duration}h)
                                                    </p>
                                                </div>
                                                {slot.notes && (
                                                    <p className="text-sm text-gray-600 italic max-w-xs truncate">
                                                        "{slot.notes}"
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}

                    {Object.keys(repHours).length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            No REPs scheduled for this date
                        </div>
                    )}
                </div>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Projects</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {companyProjects.map(project => (
                        <div
                            key={project.id}
                            className="border rounded-lg p-4"
                            style={{ borderLeft: `4px solid ${project.color}` }}
                        >
                            <h4 className="font-medium text-gray-800">{project.name}</h4>
                            <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
