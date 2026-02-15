import { useMemo } from 'react';
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
                (slot.status === 'reserved' || (slot.reservedCount && slot.reservedCount > 0));
        });
    }, [slots, projects, company, selectedDate]);

    const repHours = useMemo(() => {
        const hours: Record<string, number> = {};

        relevantSlots.forEach(slot => {
            const duration = slot.duration || 1;

            // If the slot has a reservations array, iterate through it
            if (slot.reservations && slot.reservations.length > 0) {
                slot.reservations.forEach(res => {
                    // agentId might be populated or just an ID
                    const rId = typeof res.agentId === 'object'
                        ? (res.agentId?._id || res.agentId?.$oid)
                        : res.agentId;

                    if (rId) {
                        const rIdStr = rId.toString();
                        hours[rIdStr] = (hours[rIdStr] || 0) + duration;
                    }
                });
            } else if (slot.repId) {
                // Fallback for legacy format
                hours[slot.repId] = (hours[slot.repId] || 0) + duration;
            }
        });

        return hours;
    }, [relevantSlots]);

    const totalHours = useMemo(() => {
        return Object.values(repHours).reduce((sum, h) => sum + h, 0);
    }, [repHours]);

    return (
        <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-100">
            {/* Header matches Image 2 exactly */}
            <div className="flex items-center mb-8 border-b border-gray-100 pb-6">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mr-4 shadow-lg shadow-blue-200">
                    <Building className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">{company} Dashboard</h2>
            </div>

            <div className="mb-10">
                <h3 className="text-xl font-bold text-gray-800 mb-6">
                    Schedule for {format(selectedDate, 'MMMM d, yyyy')}
                </h3>

                <div className="flex items-center justify-between bg-blue-50/50 border border-blue-100 px-6 py-4 rounded-xl mb-12">
                    <div className="flex items-center">
                        <div className="bg-white p-2.5 rounded-xl shadow-sm mr-4">
                            <Clock className="w-6 h-6 text-blue-600" />
                        </div>
                        <span className="text-blue-900 font-bold text-lg">Total Hours Scheduled</span>
                    </div>
                    <span className="text-2xl font-black text-blue-900">{totalHours}h</span>
                </div>

                <div className="space-y-16">
                    {Object.entries(repHours).map(([repId, hours]) => {
                        const rep = reps.find(r => r.id === repId);
                        // Filter slots where this specific rep is present in reservations
                        const repSlots = relevantSlots.filter(slot =>
                            (slot.reservations?.some(res => (res.agentId?._id || res.agentId?.$oid || res.agentId)?.toString() === repId)) ||
                            (slot.repId === repId)
                        );

                        return (
                            <div key={repId} className="space-y-6">
                                {/* Rep Header matches Image 2 precisely */}
                                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                                    <div className="flex items-center">
                                        <div className="w-14 h-14 rounded-full overflow-hidden mr-4 border-2 border-white shadow-md bg-gray-50 flex-shrink-0">
                                            {rep?.avatar ? (
                                                <img
                                                    src={rep.avatar}
                                                    alt={rep.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-600 font-black text-xl">
                                                    {rep?.name?.charAt(0) || 'R'}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-black text-gray-900 leading-tight">
                                                {rep?.name || `Agent ${repId.substring(0, 4)}`}
                                            </h4>
                                            <p className="text-gray-500 text-sm font-semibold">
                                                {rep?.specialties?.join(', ') || 'Expert'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-black text-gray-900 leading-none mb-1">{hours}h</div>
                                        <div className="text-gray-400 text-sm font-bold">{repSlots.length} slots</div>
                                    </div>
                                </div>

                                {/* Slots match Image 2 precisely */}
                                <div className="space-y-4">
                                    {repSlots.map(slot => {
                                        const project = projects.find(p => p.id === slot.gigId);

                                        return (
                                            <div
                                                key={slot.id}
                                                className="group relative py-4 px-6 rounded-xl bg-gray-50/50 hover:bg-gray-100 transition-all duration-200 border-l-[6px]"
                                                style={{ borderLeftColor: project?.color || '#3b82f6' }}
                                            >
                                                <h5 className="font-extrabold text-gray-800 text-base mb-1">
                                                    {project?.name} - {company}
                                                </h5>
                                                <div className="flex items-center text-gray-500 text-sm font-bold">
                                                    <Clock className="w-4 h-4 mr-2 opacity-60" />
                                                    {slot.startTime} - {slot.endTime} ({slot.duration || 1}h)
                                                </div>
                                                {(() => {
                                                    const myRes = slot.reservations?.find(res => (res.agentId?._id || res.agentId?.$oid || res.agentId)?.toString() === repId);
                                                    const displayNotes = myRes?.notes || slot.notes;
                                                    return displayNotes && (
                                                        <div className="mt-3 text-sm text-gray-600 bg-white/60 p-3 rounded-lg border border-gray-100 italic">
                                                            "{displayNotes}"
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}

                    {Object.keys(repHours).length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-200">
                            <Clock className="w-12 h-12 text-gray-300 mb-4" />
                            <p className="text-gray-500 font-black text-xl">No REPs scheduled for this date</p>
                            <p className="text-gray-400 text-sm mt-1">Assignments will appear here once reserved.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
