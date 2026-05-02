import React, { useState, useEffect } from 'react';
import { Calendar as LucideCalendar, ArrowLeft, ArrowRight, Save, Clock, Info } from 'lucide-react';
import { PlanningMatrix } from '../../../onboarding/PlanningMatrix';
import { TimeSlot, Rep } from '../../../../types/scheduler';
import { schedulerApi } from '../../../../services/schedulerService';
import { slotApi } from '../../../../services/slotService';
import { TrainingJourney } from '../../types';

interface SessionPlanningStepProps {
  journey: TrainingJourney;
  gigId: string | null;
  onComplete: () => void;
  onBack: () => void;
}

export default function SessionPlanningStep({
  journey,
  gigId,
  onComplete,
  onBack
}: SessionPlanningStepProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [reps, setReps] = useState<Rep[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    if (!gigId) return;
    setLoading(true);
    try {
      // Fetch agents for this gig
      const agents = await schedulerApi.getGigAgents(gigId);
      if (agents) {
        const mappedReps: Rep[] = agents.map((a: any) => {
          const agentData = a.agentId && typeof a.agentId === 'object' ? a.agentId : a;
          const personalInfo = agentData.personalInfo || {};
          return {
            id: (agentData._id || agentData.id)?.toString() || '',
            name: personalInfo.name || agentData.name || 'Unknown Agent',
            email: personalInfo.email || agentData.email || '',
            avatar: personalInfo.photo?.url || agentData.avatar || '',
            specialties: agentData.specialties || [],
            performanceScore: agentData.performanceScore || 85,
            preferredHours: agentData.preferredHours || { start: 9, end: 17 },
            attendanceScore: agentData.attendanceScore || 90,
            attendanceHistory: []
          };
        });
        setReps(mappedReps);
      }

      // Fetch slots
      const availableSlotsResponse = await slotApi.getSlots(gigId);
      const reservationsResponse = await slotApi.getReservations(undefined, gigId);

      const availableSlots = Array.isArray(availableSlotsResponse) ? availableSlotsResponse : [];
      const reservationsList = Array.isArray(reservationsResponse) ? reservationsResponse : [];

      const mappedSlots: TimeSlot[] = availableSlots.map((slot: any) => {
        const slotId = (slot._id as any)?.$oid || slot._id?.toString();
        const slotReservations = reservationsList
          .filter((r: any) => (r.slotId?._id || r.slotId?.$oid || r.slotId)?.toString() === slotId);

        return {
          id: slotId,
          startTime: slot.startTime,
          endTime: slot.endTime,
          date: slot.date || (slot.startTime?.includes('T') ? slot.startTime.split('T')[0] : ''),
          gigId: (slot.gigId?._id || slot.gigId)?.toString() || '',
          repId: (slot.agentId?._id || slot.agentId)?.toString() || '',
          status: slot.status,
          capacity: slot.capacity || 1,
          reservedCount: slotReservations.length,
          reservations: slotReservations
        };
      });

      setSlots(mappedSlots);
    } catch (error) {
      console.error('[SessionPlanningStep] Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [gigId]);

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
              <LucideCalendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Session Planning</h1>
              <p className="text-sm text-slate-500">Define the weekly schedule for live training sessions</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={onComplete}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-bold shadow-lg shadow-blue-200"
            >
              Continue to Rehearsal
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-4">
          <div className="mt-1">
            <Info className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wider">Planning Guide</h3>
            <p className="text-sm text-blue-700 mt-1">
              Set the capacity for each time slot to define how many participants can join the live sessions.
              Don't forget to <strong>Save Changes</strong> before continuing.
            </p>
          </div>
        </div>

        {/* Matrix Area */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden min-h-[500px] flex flex-col">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-500 font-medium">Loading strategic matrix...</p>
            </div>
          ) : gigId ? (
            <div className="p-4 flex-1">
              <PlanningMatrix
                selectedDate={selectedDate}
                gigId={gigId}
                slots={slots}
                reps={reps}
                onRefresh={fetchData}
                onSelectDay={setSelectedDate}
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-12 text-center">
              <LucideCalendar className="w-16 h-16 text-slate-200" />
              <div>
                <h3 className="text-lg font-bold text-slate-900">No Gig Selected</h3>
                <p className="text-slate-500">Please go back and select a gig to plan sessions.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
