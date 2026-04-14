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
        <div className="bg-white rounded-xl p-3.5 shadow-sm border border-harx-100/80">
            <div className="flex items-center mb-3 border-b border-harx-100/60 pb-2.5">
                <div className="w-9 h-9 rounded-lg bg-gradient-harx flex items-center justify-center mr-2.5 shadow-md shadow-harx-500/20 shrink-0">
                    <Building className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight leading-tight">{company} Dashboard</h2>
            </div>

            <div className="mb-0">
                <h3 className="text-sm font-bold text-gray-800 mb-2">
                    Schedule for {format(selectedDate, 'MMMM d, yyyy')}
                </h3>

                <div className="flex items-center justify-between bg-harx-50/70 border border-harx-100 px-3 py-2 rounded-lg mb-3">
                    <div className="flex items-center min-w-0">
                        <div className="bg-white p-1.5 rounded-lg shadow-sm mr-2 shrink-0 border border-harx-100/50">
                            <Clock className="w-4 h-4 text-harx-600" />
                        </div>
                        <span className="text-gray-900 font-bold text-sm truncate">Total Hours Scheduled</span>
                    </div>
                    <span className="text-lg font-black text-harx-700 shrink-0 ml-2">{totalHours}h</span>
                </div>

                <div className="space-y-5">
                    {Object.entries(repHours).map(([repId, hours]) => {
                        const rep = reps.find(r => r.id === repId);
                        // Filter slots where this specific rep is present in reservations
                        const repSlots = relevantSlots.filter(slot =>
                            (slot.reservations?.some(res => (res.agentId?._id || res.agentId?.$oid || res.agentId)?.toString() === repId)) ||
                            (slot.repId === repId)
                        );

                        return (
                            <div key={repId} className="space-y-2.5">
                                <div className="flex items-center justify-between pb-2 border-b border-harx-100/50">
                                    {(() => {
                                        // Find the first reservation in this set of slots that contains agent info
                                        const firstSlotWithAgent = repSlots.find(s => s.reservations?.some(res =>
                                            ((res.agentId?._id || res.agentId?.$oid || res.agentId)?.toString() === repId) &&
                                            (typeof res.agentId === 'object')
                                        ));

                                        const populatedAgent = firstSlotWithAgent?.reservations?.find(res => (res.agentId?._id || res.agentId?.$oid || res.agentId)?.toString() === repId)?.agentId;

                                        const agentName = populatedAgent?.personalInfo?.name || populatedAgent?.name || rep?.name || `Agent ${repId.substring(0, 4)}`;
                                        const agentAvatar = populatedAgent?.personalInfo?.photo?.url || populatedAgent?.avatar || rep?.avatar;
                                        const agentRole = populatedAgent?.professionalSummary?.currentRole || (rep?.specialties?.join(', ')) || 'Expert';

                                        return (
                                            <>
                                                <div className="w-11 h-11 rounded-full overflow-hidden mr-2.5 border-2 border-harx-100 shadow-sm bg-harx-50/50 flex-shrink-0">
                                                    {agentAvatar ? (
                                                        <img
                                                            src={agentAvatar}
                                                            alt={agentName}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                (e.target as any).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(agentName)}&background=ffe0e0&color=ff3333&bold=true`;
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-harx-100 text-harx-700 font-black text-base">
                                                            {agentName?.charAt(0) || 'R'}
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <h4 className="text-base font-black text-gray-900 leading-tight">
                                                        {agentName}
                                                    </h4>
                                                    <p className="text-gray-500 text-sm font-semibold">
                                                        {agentRole}
                                                    </p>
                                                </div>
                                            </>
                                        );
                                    })()}
                                    <div className="text-right">
                                        <div className="text-lg font-black text-harx-700 leading-none mb-0.5">{hours}h</div>
                                        <div className="text-gray-500 text-xs font-bold">{repSlots.length} slots</div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {repSlots.map(slot => {
                                        const project = projects.find(p => p.id === slot.gigId);

                                        return (
                                            <div
                                                key={slot.id}
                                                className="group relative py-2 px-3 rounded-lg bg-harx-50/40 hover:bg-harx-50/80 transition-all duration-200 border-y border-r border-harx-100/50 border-l-[4px]"
                                                style={{ borderLeftColor: project?.color || '#ff4d4d' }}
                                            >
                                                <h5 className="font-extrabold text-gray-800 text-sm mb-0.5">
                                                    {project?.name} - {company}
                                                </h5>
                                                <div className="flex items-center text-gray-600 text-xs font-bold">
                                                    <Clock className="w-3.5 h-3.5 mr-1.5 text-harx-500/80" />
                                                    {slot.startTime} - {slot.endTime} ({slot.duration || 1}h)
                                                </div>
                                                {(() => {
                                                    const myRes = slot.reservations?.find(res => (res.agentId?._id || res.agentId?.$oid || res.agentId)?.toString() === repId);
                                                    const displayNotes = myRes?.notes || slot.notes;
                                                    return displayNotes && (
                                                        <div className="mt-2 text-xs text-gray-600 bg-white/80 p-2 rounded-md border border-harx-100/60 italic">
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
                        <div className="flex flex-col items-center justify-center py-8 px-3 bg-harx-50/30 rounded-xl border border-dashed border-harx-200/80">
                            <Clock className="w-8 h-8 text-harx-300 mb-2" />
                            <p className="text-gray-700 font-black text-sm text-center">No REPs scheduled for this date</p>
                            <p className="text-gray-500 text-xs mt-0.5 text-center">Assignments will appear here once reserved.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
