import React, { useState, useEffect, useMemo } from 'react';
import { Calendar } from '../../components/scheduler/Calendar';
import { TimeSlotGrid } from '../../components/scheduler/TimeSlotGrid';
import { TimeSlot, Gig, WeeklyStats, Rep, UserRole, Company, AttendanceRecord } from '../../types/scheduler';
import {
  Building,
  AlertCircle,
  Users,
  Brain,
  Calendar as LucideCalendar // Keep one name for the icon
} from 'lucide-react';
import { PremiumDropdown } from '../ui/PremiumDropdown';
import { SlotActionPanel } from '../../components/scheduler/SlotActionPanel';
import { RepSelector } from '../../components/scheduler/RepSelector';
import { CompanyView } from '../../components/scheduler/CompanyView';
import { AIRecommendations } from '../../components/scheduler/AIRecommendations';
import { OptimalTimeHeatmap } from '../../components/scheduler/OptimalTimeHeatmap';
import { PerformanceMetrics } from '../../components/scheduler/PerformanceMetrics';
import { WorkloadPredictionComponent as WorkloadPrediction } from '../../components/scheduler/WorkloadPrediction';
import { AttendanceTracker } from '../../components/scheduler/AttendanceTracker';
import { AttendanceScorecard } from '../../components/scheduler/AttendanceScorecard';
import { AttendanceReport } from '../../components/scheduler/AttendanceReport';
import { initializeAI } from '../../services/schedulerAiService';
import { schedulerApi } from '../../services/schedulerService';
import { slotApi } from '../../services/slotService';
import { format } from 'date-fns';
import axios from 'axios';
import Cookies from 'js-cookie';
import { PlanningMatrix } from './PlanningMatrix';

// Helper to generate a consistent color from a string
const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00ffffff).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
};

// Map Slot from backend to frontend TimeSlot type
const mapBackendSlotToSlot = (slot: any): TimeSlot => {
  const agentData = slot.agentId && typeof slot.agentId === 'object' ? slot.agentId : null;
  const gigData = slot.gigId && typeof slot.gigId === 'object' ? slot.gigId : null;

  const id = (slot._id as any)?.$oid || slot._id?.toString() || crypto.randomUUID();
  const repId = (agentData as any)?._id || (agentData as any)?.$oid || slot.agentId?.toString() || slot.repId?.toString() || '';
  const gigId = (gigData as any)?._id || (gigData as any)?.$oid || slot.gigId?.toString() || '';

  // Ensure date is present (fallback to extracting from startTime if it's an ISO string)
  let date = slot.date;
  if (!date && slot.startTime && slot.startTime.includes('T')) {
    date = slot.startTime.split('T')[0];
  }

  // Support multiple reservations if present (Legacy support for embedded array)
  const reservations = slot.reservations || [];
  const reservedCount = slot.reservedCount !== undefined ? slot.reservedCount : reservations.length;
  const capacity = slot.capacity || 1;
  let reservationId = slot.reservationId || '';
  let isReservation = !!slot.reservationId || !!slot.isMember;
  let status = slot.status;

  if (slot.reservationId) {
    status = 'reserved';
  }

  return {
    id,
    startTime: slot.startTime,
    endTime: slot.endTime,
    date: date || '',
    gigId,
    repId,
    status: status as any,
    duration: slot.duration || 1,
    notes: slot.notes,
    capacity,
    reservedCount,
    reservations,
    attended: slot.attended,
    attendanceNotes: slot.attendanceNotes,
    agent: agentData, // Store populated agent data
    gig: gigData, // Store populated gig data
    reservationId,
    isMember: isReservation
  };
};

// Map Gig from backend to frontend Gig type
const mapBackendGigToGig = (gig: any): Gig => {
  const id = (gig._id as any)?.$oid || gig._id?.toString() || crypto.randomUUID();

  // Try to get company name from populated companyId object or fallback to companyName string
  const companyName = gig.companyId?.name || gig.companyName || 'Unknown Company';

  return {
    id,
    name: gig.title,
    description: gig.description,
    company: companyName,
    color: stringToColor(id),
    skills: gig.requiredSkills?.map((s: any) => typeof s === 'string' ? s : s.name) || [],
    priority: 'medium'
  };
};

const sampleReps: Rep[] = [
  {
    id: '1',
    name: 'Alex Johnson',
    email: 'alex@harx.com',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    specialties: ['Customer Support', 'Technical Troubleshooting'],
    performanceScore: 87,
    preferredHours: { start: 9, end: 17 },
    attendanceScore: 92,
    attendanceHistory: []
  },
  {
    id: '2',
    name: 'Jamie Smith',
    email: 'jamie@harx.com',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    specialties: ['Sales', 'Product Demos'],
    performanceScore: 92,
    preferredHours: { start: 8, end: 16 },
    attendanceScore: 85,
    attendanceHistory: []
  },
  {
    id: '3',
    name: 'Taylor Wilson',
    email: 'taylor@harx.com',
    avatar: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    specialties: ['Training', 'Onboarding'],
    performanceScore: 78,
    preferredHours: { start: 10, end: 18 },
    attendanceScore: 78,
    attendanceHistory: []
  },
  {
    id: '4',
    name: 'Morgan Lee',
    email: 'morgan@harx.com',
    avatar: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    specialties: ['Technical Support', 'Product Expertise'],
    performanceScore: 85,
    preferredHours: { start: 9, end: 17 },
    attendanceScore: 88,
    attendanceHistory: []
  },
];

const sampleCompanies: Company[] = [
  {
    id: '1',
    name: 'Tech Co',
    logo: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-1.2.1&auto=format&fit=crop&w=128&h=128&q=80',
    priority: 3
  },
  {
    id: '2',
    name: 'Marketing Inc',
    logo: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-1.2.1&auto=format&fit=crop&w=128&h=128&q=80',
    priority: 2
  },
  {
    id: '3',
    name: 'Acme Corp',
    logo: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-1.2.1&auto=format&fit=crop&w=128&h=128&q=80',
    priority: 1
  },
];

// Function to update onboarding progress for Step 10 (Session Planning)
const updateOnboardingProgress = async () => {
  try {
    const companyId = Cookies.get('companyId');
    if (!companyId) return;

    const apiUrl = import.meta.env.VITE_API_URL_ONBOARDING || 'https://v25searchcompanywizardbackend-production.up.railway.app/api';
    const endpoint = `${apiUrl}/onboarding/companies/${companyId}/onboarding/phases/3/steps/10`;

    console.log('[SessionPlanning] Marking Step 10 as completed:', endpoint);
    const response = await axios.put(endpoint, { status: "completed" });

    if (response.data) {
      // Update the cookie to keep frontend in sync
      Cookies.set('companyOnboardingProgress', JSON.stringify(response.data), { expires: 7 });

      // Notify parent component for real-time UI update
      window.dispatchEvent(new CustomEvent('stepCompleted', {
        detail: {
          stepId: 10,
          phaseId: 3,
          status: 'completed',
          completedSteps: (response.data as any).completedSteps || []
        }
      }));
      console.log('[SessionPlanning] Step 10 successfully marked as completed');
    }
  } catch (error) {
    console.error('[SessionPlanning] Failed to update onboarding progress:', error);
  }
};

export default function SessionPlanning() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [userRole] = useState<UserRole>('company');
  const [selectedRepId, setSelectedRepId] = useState<string>(sampleReps[0].id);
  const [selectedGigId, setSelectedGigId] = useState<string | null>(null);
  const [showAIPanel] = useState<boolean>(false);
  const [showAttendancePanel] = useState<boolean>(false);
  const [reps, setReps] = useState<Rep[]>(sampleReps);
  const [aiInitialized, setAiInitialized] = useState<boolean>(false);


  // Real Gigs Data
  const [projects, setProjects] = useState<Gig[]>([]);

  // Create slots by gig (company view)
  const [createSlotRepId, setCreateSlotRepId] = useState<string>('');

  useEffect(() => {
    const fetchGigs = async () => {
      const companyId = Cookies.get('companyId');
      if (!companyId) {
        setNotification({ message: 'Company ID not found. Gigs cannot be loaded.', type: 'error' });
        return;
      }

      try {
        const apiUrl = import.meta.env.VITE_API_URL_GIGS || 'https://v25gigsmanualcreationbackend-production.up.railway.app/api';
        const response = await axios.get(`${apiUrl}/gigs/company/${companyId}?populate=companyId`);

        const gigData = (response.data as any).data || response.data;
        if (Array.isArray(gigData)) {
          const mappedProjects = gigData.map(mapBackendGigToGig);
          setProjects(mappedProjects);
          // Set default selected project
          if (mappedProjects.length > 0) {
            setSelectedGigId(mappedProjects[0].id);
          }
          console.log(`Loaded ${mappedProjects.length} gigs`);
        }
      } catch (error) {
        console.error('Error fetching gigs:', error);
        setNotification({ message: 'Failed to load Gigs', type: 'error' });
      }
    };

    // Initialize AI services
    const initAI = async () => {
      const initialized = await initializeAI();
      setAiInitialized(initialized);
    };

    initAI();
    fetchGigs();
  }, [userRole]);

  // Fetch Slots and Agents for the selected Gig
  const fetchData = async () => {
    if (!selectedGigId) return;

    try {
      // Fetch Agents for this Gig
      const agents = await schedulerApi.getGigAgents(selectedGigId);
      if (agents && agents.length > 0) {
        const mappedReps: Rep[] = agents.map(a => {
          // Some APIs return { agentId: { ...agentData } }, others return { ...agentData }
          const agentData = a.agentId && typeof a.agentId === 'object' ? a.agentId : a;

          // Extract the string ID robustly
          const id = (agentData as any)?._id || (agentData as any)?.$oid || agentData?.toString() || '';

          // Extract personal info robustly
          const personalInfo = agentData.personalInfo || {};
          const professionalSummary = agentData.professionalSummary || {};

          return {
            id: id,
            name: personalInfo.name || agentData.name || agentData.fullName || 'Unknown Agent',
            email: personalInfo.email || agentData.email || '',
            avatar: personalInfo.photo?.url || agentData.avatar || agentData.photo?.url || '',
            specialties: professionalSummary.currentRole ? [professionalSummary.currentRole] : (agentData.specialties || []),
            performanceScore: agentData.performanceScore || 85,
            preferredHours: agentData.preferredHours || { start: 9, end: 17 },
            attendanceScore: agentData.attendanceScore || 90,
            attendanceHistory: []
          };
        });
        setReps(mappedReps);
        if (mappedReps.length > 0 && !mappedReps.find(r => r.id === selectedRepId)) {
          setSelectedRepId(mappedReps[0].id);
        }
        if (mappedReps.length > 0 && !mappedReps.find(r => r.id === createSlotRepId)) {
          setCreateSlotRepId(mappedReps[0].id);
        }
      } else {
        setCreateSlotRepId('');
      }

      // Fetch all slots and reservations for this gig
      const [availableSlotsResponse, reservationsResponse] = await Promise.all([
        slotApi.getSlots(selectedGigId),
        slotApi.getReservations(undefined, selectedGigId)
      ]);

      const availableSlots = Array.isArray(availableSlotsResponse) ? availableSlotsResponse : [];
      const reservationsList = Array.isArray(reservationsResponse) ? reservationsResponse : [];

      // Merge reservations back into slots for UI compatibility
      const slotsWithReservations = availableSlots.map((slot: any) => {
        const slotId = (slot._id as any)?.$oid || slot._id?.toString();
        const slotReservations = reservationsList
          .filter((r: any) => {
            const rSlotId = (r.slotId?._id || r.slotId?.$oid || r.slotId)?.toString();
            return rSlotId === slotId;
          })
          .map((r: any) => ({
            _id: r._id,
            agentId: r.agentId,
            notes: r.notes,
            reservedAt: r.createdAt
          }));

        return {
          ...slot,
          reservations: slotReservations
        };
      });

      const allSlots = slotsWithReservations.map(mapBackendSlotToSlot);
      setSlots(allSlots);

      // Auto-complete step 12 if slots exist
      if (allSlots.length > 0) {
        updateOnboardingProgress();
      }

      // Extract and merge agents from populated slots to ensure we have all data
      const populatedAgents: Rep[] = [];
      allSlots.forEach(slot => {
        // Check both legacy single agent field and new reservations array
        const agentsToProcess = [];
        if (slot.agent && slot.agent._id) agentsToProcess.push(slot.agent);
        if (slot.reservations && Array.isArray(slot.reservations)) {
          slot.reservations.forEach((r: any) => {
            if (r.agentId && typeof r.agentId === 'object') {
              agentsToProcess.push(r.agentId);
            }
          });
        }

        agentsToProcess.forEach(agentData => {
          const personalInfo = agentData.personalInfo || {};
          const professionalSummary = agentData.professionalSummary || {};
          const id = (agentData as any)?._id || (agentData as any)?.$oid || agentData?.toString() || '';

          if (id && !reps.find(r => r.id === id) && !populatedAgents.find(r => r.id === id)) {
            populatedAgents.push({
              id: id,
              name: personalInfo.name || agentData.name || agentData.fullName || 'Unknown Agent',
              email: personalInfo.email || agentData.email || '',
              avatar: personalInfo.photo?.url || agentData.avatar || agentData.photo?.url || '',
              specialties: professionalSummary.currentRole ? [professionalSummary.currentRole] : (agentData.specialties || []),
              performanceScore: agentData.performanceScore || 85,
              preferredHours: agentData.preferredHours || { start: 9, end: 17 },
              attendanceScore: agentData.attendanceScore || 90,
              attendanceHistory: []
            });
          }
        });
      });

      if (populatedAgents.length > 0) {
        setReps(prev => {
          const newReps = [...prev];
          populatedAgents.forEach(pa => {
            if (!newReps.find(r => r.id === pa.id)) {
              newReps.push(pa);
            }
          });
          return newReps;
        });
      }

    } catch (error) {
      console.error('Error fetching gig data:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedGigId, selectedDate]);

  const selectedRep = useMemo(() => {
    return reps.find(rep => rep.id === selectedRepId) || reps[0];
  }, [selectedRepId, reps]);

  const weeklyStats = useMemo<WeeklyStats>(() => {
    const stats: WeeklyStats = {
      totalHours: 0,
      projectBreakdown: {},
      availableSlots: 0,
      reservedSlots: 0,
    };

    // Filter slots by selected REP if in REP view
    const filteredSlots = userRole === 'rep'
      ? slots.filter(slot => slot.repId === selectedRepId)
      : slots;

    filteredSlots.forEach((slot) => {
      if (slot.status !== 'cancelled') {
        const duration = slot.duration || 1;
        const count = slot.reservedCount || (slot.status === 'reserved' ? 1 : 0);

        // Add to total hours scheduled (total capacity * duration?? or total reservations * duration?)
        // Usually, for "Scheduled Hours" we mean reserved hours
        if (count > 0) {
          stats.totalHours += duration * count;
          stats.reservedSlots += count;
        }

        if (slot.status === 'available' || (slot.capacity && slot.reservedCount && slot.reservedCount < slot.capacity)) {
          stats.availableSlots += 1;
        }

        if (slot.gigId && count > 0) {
          stats.projectBreakdown[slot.gigId] = (stats.projectBreakdown[slot.gigId] || 0) + (duration * count);
        }
      }
    });

    return stats;
  }, [slots, userRole, selectedRepId]);

  const handleSlotUpdate = async (updates: Partial<TimeSlot>) => {
    let slotWithRep: TimeSlot;

    if (updates.id) {
      const existing = slots.find(s => s.id === updates.id);
      if (existing) {
        slotWithRep = { ...existing, ...updates } as TimeSlot;
      } else {
        slotWithRep = { ...updates, repId: updates.repId || selectedRepId } as TimeSlot;
      }
    } else if (selectedSlot) {
      slotWithRep = { ...selectedSlot, ...updates } as TimeSlot;
    } else {
      return;
    }

    try {
      await schedulerApi.upsertTimeSlot(slotWithRep);
      const updatedSlots = await schedulerApi.getTimeSlots(selectedRepId);
      const mappedSlots = Array.isArray(updatedSlots) ? updatedSlots.map(mapBackendSlotToSlot) : [];
      setSlots(mappedSlots);

      // Auto-complete step 12
      updateOnboardingProgress();

      setNotification({
        message: updates.id ? 'Time slot updated successfully' : 'New time slot created',
        type: 'success'
      });
    } catch (error) {
      console.error('Error saving slot:', error);
      setNotification({
        message: 'Failed to save time slot',
        type: 'error'
      });
    }

    setTimeout(() => setNotification(null), 3000);
  };

  const handleSlotCancel = async (slotId: string) => {
    try {
      await schedulerApi.cancelTimeSlot(slotId);
      const updatedSlots = await schedulerApi.getTimeSlots(selectedRepId);
      const mappedSlots = Array.isArray(updatedSlots) ? updatedSlots.map(mapBackendSlotToSlot) : [];
      setSlots(mappedSlots);

      setNotification({
        message: 'Time slot cancelled',
        type: 'success'
      });
    } catch (error) {
      console.error('Error cancelling slot:', error);
      setNotification({
        message: 'Failed to cancel time slot',
        type: 'error'
      });
    }

    setTimeout(() => setNotification(null), 3000);

    // Clear selected slot if it was cancelled
    if (selectedSlot?.id === slotId) {
      setSelectedSlot(null);
    }
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot);
  };




  const handleProjectSelect = (gigId: string) => {
    // Find the optimal time for this project based on AI recommendations
    const optimalHour = selectedRep.preferredHours?.start || 9;

    // Check if the slot already exists
    const timeString = `${optimalHour.toString().padStart(2, '0')}:00`;
    const existingSlot = slots.find(
      (s) =>
        s.date === format(selectedDate, 'yyyy-MM-dd') &&
        s.startTime === timeString &&
        s.repId === selectedRepId
    );

    if (existingSlot) {
      // Update existing slot
      handleSlotUpdate({
        ...existingSlot,
        gigId: gigId,
        status: 'reserved'
      });
    } else {
      // Create new slot
      handleSlotUpdate({
        id: crypto.randomUUID(),
        startTime: timeString,
        endTime: `${(optimalHour + 1).toString().padStart(2, '0')}:00`,
        date: format(selectedDate, 'yyyy-MM-dd'),
        status: 'reserved' as const,
        duration: 1,
        gigId: gigId,
        repId: selectedRepId,
      });
    }
  };

  const handleOptimalHourSelect = (hour: number) => {
    // Scroll to that hour in the time slot grid
    const element = document.getElementById(`time-slot-${hour}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }

    // Check if there's already a slot at this hour
    const timeString = `${hour.toString().padStart(2, '0')}:00`;
    const existingSlot = slots.find(
      (s) =>
        s.date === format(selectedDate, 'yyyy-MM-dd') &&
        s.startTime === timeString &&
        s.repId === selectedRepId
    );

    if (existingSlot) {
      setSelectedSlot(existingSlot);
    } else {
      // Create new slot
      handleSlotUpdate({
        id: crypto.randomUUID(),
        startTime: timeString,
        endTime: `${(hour + 1).toString().padStart(2, '0')}:00`,
        date: format(selectedDate, 'yyyy-MM-dd'),
        status: 'available' as const,
        duration: 1,
        repId: selectedRepId,
      });
      setSelectedSlot({
        id: crypto.randomUUID(),
        startTime: timeString,
        endTime: `${(hour + 1).toString().padStart(2, '0')}:00`,
        date: format(selectedDate, 'yyyy-MM-dd'),
        status: 'available' as const,
        duration: 1,
        repId: selectedRepId,
      });
    }
  };

  const handleAttendanceUpdate = (slotId: string, attended: boolean, notes?: string) => {
    // Update the slot with attendance information
    setSlots(prev => prev.map(slot =>
      slot.id === slotId
        ? { ...slot, attended, attendanceNotes: notes }
        : slot
    ));

    // Update the rep's attendance history
    const slot = slots.find(s => s.id === slotId);
    if (slot) {
      const repIndex = reps.findIndex(r => r.id === slot.repId);
      if (repIndex >= 0) {
        const rep = reps[repIndex];

        // Create attendance record
        const attendanceRecord: AttendanceRecord = {
          date: slot.date,
          slotId,
          attended,
          reason: notes
        };

        // Update rep's attendance history
        const updatedRep = {
          ...rep,
          attendanceHistory: [...(rep.attendanceHistory || []), attendanceRecord]
        };

        // Recalculate attendance score
        const attendedCount = updatedRep.attendanceHistory.filter(record => record.attended).length;
        const totalCount = updatedRep.attendanceHistory.length;
        const attendanceScore = totalCount > 0 ? Math.round((attendedCount / totalCount) * 100) : 0;

        updatedRep.attendanceScore = attendanceScore;

        // Update reps array
        setReps(prev => [
          ...prev.slice(0, repIndex),
          updatedRep,
          ...prev.slice(repIndex + 1)
        ]);
      }
    }

    setNotification({
      message: `Attendance ${attended ? 'confirmed' : 'marked as missed'}`,
      type: 'success'
    });
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="min-h-screen bg-harx-50/20">
      {notification && (
        <div className={`fixed top-8 right-8 z-[100] px-8 py-4 rounded-[1.5rem] shadow-2xl flex items-center gap-4 animate-in slide-in-from-right duration-500 font-black uppercase tracking-widest text-xs italic ${notification.type === 'success' ? 'bg-emerald-600 text-white border-2 border-emerald-400' : 'bg-harx-600 text-white border-2 border-harx-400'
          }`}>
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{notification.message}</p>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        <header className="bg-white rounded-[2.5rem] p-8 border-4 border-harx-100 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-harx-50/50 rounded-full blur-[100px] group-hover:bg-harx-100/60 transition-colors duration-1000"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-harx flex items-center justify-center shadow-xl shadow-harx-500/30 transform group-hover:rotate-6 transition-transform">
                <LucideCalendar className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-4 italic uppercase">
                  Session Strategic Planning
                  <span className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-2xl text-[10px] uppercase font-black tracking-[0.2em] border border-emerald-100 not-italic">
                    Real-time Sync
                  </span>
                </h1>
                <p className="text-lg text-gray-400 font-medium">Orchestrate field operations with surgical precision and AI-backed slot optimization.</p>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-2xl border border-gray-100">
              <PremiumDropdown
                label="Strategic Project Focus"
                options={projects}
                value={selectedGigId || ''}
                onChange={(val) => setSelectedGigId(val)}
                placeholder="Select Project Target..."
              />
            </div>
          </div>
        </header>

        <main className="space-y-10">
          {userRole === 'company' ? (
            <div className="grid grid-cols-1 gap-10">
              {selectedGigId && (
                <div className="rounded-[3rem] bg-white shadow-2xl border border-harx-100/50 p-8 overflow-hidden relative">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h2 className="text-xl font-black text-gray-900 uppercase tracking-widest italic">Deployment Matrix</h2>
                      <p className="text-xs text-gray-400 font-black uppercase tracking-widest mt-1">Personnel vs Timeline</p>
                    </div>
                  </div>
                  <PlanningMatrix
                    selectedDate={selectedDate}
                    gigId={selectedGigId}
                    slots={slots}
                    reps={reps}
                    onRefresh={fetchData}
                  />
                </div>
              )}

              {selectedGigId && (
                <div className="rounded-[3rem] bg-gray-900 p-8 shadow-2xl border-4 border-harx-500/10 overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-harx-600/5 rounded-full blur-[100px]"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-8 px-4">
                      <h2 className="text-xl font-black text-white italic uppercase tracking-wider">Operational Overview</h2>
                      <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl text-xs font-black text-gray-400 uppercase tracking-widest">
                        <Users className="w-4 h-4 text-harx-400" />
                        Live Field Status
                      </div>
                    </div>
                    <CompanyView
                      company={projects.find(p => p.id === selectedGigId)?.name || ''}
                      slots={slots}
                      projects={projects.filter(p => p.id === selectedGigId).map(p => ({ ...p, company: p.name }))}
                      reps={reps}
                      selectedDate={selectedDate}
                    />
                  </div>
                </div>
              )}

              {showAttendancePanel && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-gray-100">
                    <AttendanceTracker
                      slots={slots}
                      reps={reps}
                      selectedDate={selectedDate}
                      onAttendanceUpdate={handleAttendanceUpdate}
                    />
                  </div>
                  <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-gray-100">
                    <AttendanceReport
                      reps={reps}
                      slots={slots}
                    />
                  </div>
                </div>
              )}

              {showAIPanel && (
                <div className="bg-gradient-to-br from-indigo-900 to-black rounded-[3rem] p-10 shadow-2xl border-4 border-indigo-500/20 overflow-hidden relative group">
                  <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_50%_120%,rgba(99,102,241,0.15),transparent)]"></div>
                  <div className="relative z-10">
                    <div className="flex items-center mb-10 border-b border-white/10 pb-6">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                        <Brain className="w-7 h-7 text-indigo-400" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">CORTEX Intelligence</h2>
                        <p className="text-xs font-black text-indigo-400 uppercase tracking-[0.3em]">Predictive Analytics</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-10">
                      <WorkloadPrediction slots={slots} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : userRole === 'rep' ? (

            <div className="grid grid-cols-1 gap-6">
              <RepSelector
                reps={reps}
                selectedRepId={selectedRepId}
                onSelectRep={setSelectedRepId}
              />

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <Calendar
                    selectedDate={selectedDate}
                    onDateSelect={setSelectedDate}
                    slots={slots}
                    view="month"
                  />
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h2 className="text-base font-semibold text-gray-900 mb-4">Weekly Overview</h2>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Available Slots</span>
                      <span className="font-semibold text-gray-900">{weeklyStats.availableSlots}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Reserved Slots</span>
                      <span className="font-semibold text-gray-900">{weeklyStats.reservedSlots}</span>
                    </div>
                    <hr className="my-4 border-gray-100" />
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Gig Hours</h3>
                    {Object.entries(weeklyStats.projectBreakdown).map(([gigId, hours]) => {
                      const project = projects.find(p => p.id === gigId);
                      return (
                        <div key={gigId} className="flex justify-between items-center">
                          <div className="flex items-center">
                            <div
                              className="w-3 h-3 rounded-full mr-2"
                              style={{ backgroundColor: project?.color || '#ccc' }}
                            ></div>
                            <span className="text-gray-600">{project?.name || 'Unknown Gig'}</span>
                          </div>
                          <span className="font-medium">{(hours as any)}h</span>
                        </div>
                      );
                    })}

                    <hr className="my-4 border-gray-100" />
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Quick Reserve</h3>
                    <SlotActionPanel
                      slot={selectedSlot || slots[0] || {} as any}
                      availableProjects={projects}
                      onUpdate={handleSlotUpdate}
                      onClear={() => handleSlotCancel(selectedSlot?.id || '')}
                    />
                  </div>
                </div>
              </div>

              {showAttendancePanel && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <AttendanceScorecard
                    rep={selectedRep}
                    slots={slots}
                  />
                  <AttendanceTracker
                    slots={slots.filter(slot => slot.repId === selectedRepId)}
                    reps={reps}
                    selectedDate={selectedDate}
                    onAttendanceUpdate={handleAttendanceUpdate}
                  />
                </div>
              )}

              {showAIPanel && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div>
                    <AIRecommendations
                      rep={selectedRep}
                      projects={projects}
                      slots={slots}
                      onSelectProject={handleProjectSelect}
                    />
                  </div>
                  <div>
                    <OptimalTimeHeatmap
                      rep={selectedRep}
                      slots={slots}
                      onSelectHour={handleOptimalHourSelect}
                    />
                  </div>
                  <div>
                    <PerformanceMetrics
                      rep={selectedRep}
                      slots={slots}
                    />
                  </div>
                </div>
              )}

              <TimeSlotGrid
                selectedSlotId={selectedSlot?.id || null}
                slots={slots.filter(slot => slot.repId === selectedRepId)}
                projects={projects}
                onSlotClick={(id) => handleSlotSelect(slots.find(s => s.id === id)!)}
              />
            </div>
          ) : (
            // Admin view
            <div className="grid grid-cols-1 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Admin Dashboard</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <h3 className="text-sm font-medium text-blue-800 mb-1">Total REPs</h3>
                    <p className="text-2xl font-bold text-blue-900">{reps.length}</p>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                    <h3 className="text-sm font-medium text-emerald-800 mb-1">Total Companies</h3>
                    <p className="text-2xl font-bold text-emerald-900">{sampleCompanies.length}</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                    <h3 className="text-sm font-medium text-purple-800 mb-1">Total Gigs</h3>
                    <p className="text-2xl font-bold text-purple-900">{projects.length}</p>
                  </div>
                </div>
              </div>

              {showAttendancePanel && (
                <AttendanceReport
                  reps={reps}
                  slots={slots}
                />
              )}

              {showAIPanel && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <WorkloadPrediction slots={slots} />
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center mb-4">
                      <Brain className="w-5 h-5 text-purple-600 mr-2" />
                      <h2 className="text-lg font-semibold text-gray-900">AI Insights</h2>
                    </div>
                    <div className="space-y-4">
                      <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                        <h3 className="text-sm font-medium text-purple-800 mb-2">Scheduling Efficiency</h3>
                        <p className="text-sm text-gray-700">
                          Based on current scheduling patterns, the system is operating at
                          <span className="font-bold text-purple-800"> 78% </span>
                          efficiency. Consider optimizing REP assignments based on AI recommendations.
                        </p>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <h3 className="text-sm font-medium text-blue-800 mb-2">Resource Allocation</h3>
                        <p className="text-sm text-gray-700">
                          Tech Co projects are currently overallocated by
                          <span className="font-bold text-blue-800"> 12% </span>
                          while Acme Corp is underallocated. Consider rebalancing resources.
                        </p>
                      </div>
                      <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                        <h3 className="text-sm font-medium text-emerald-800 mb-2">Performance Insights</h3>
                        <p className="text-sm text-gray-700">
                          REPs with diverse project assignments show
                          <span className="font-bold text-green-800"> 23% higher </span>
                          satisfaction scores. Consider rotating assignments more frequently.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">REP Overview</h2>
                  <div className="space-y-4">
                    {reps.map(rep => {
                      const repSlots = slots.filter(slot => slot.repId === rep.id && slot.status === 'reserved');
                      const totalHours = repSlots.reduce((sum, slot) => sum + (slot.duration || 1), 0);

                      return (
                        <div key={rep.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                              {rep.avatar ? (
                                <img
                                  src={rep.avatar}
                                  alt={rep.name}
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                <Users className="w-5 h-5 text-gray-500" />
                              )}
                            </div>
                            <div>
                              <h4 className="font-medium">{rep.name}</h4>
                              <p className="text-sm text-gray-500">{rep.email}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold">{totalHours}h</p>
                            <p className="text-sm text-gray-500">{repSlots.length} slots</p>
                            {rep.performanceScore && (
                              <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                Score: {rep.performanceScore}
                              </div>
                            )}
                            {rep.attendanceScore && (
                              <div className="mt-1 ml-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                Attendance: {rep.attendanceScore}%
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Company Overview</h2>
                  <div className="space-y-4">
                    {sampleCompanies.map(company => {
                      const companySlots = slots.filter(slot => {
                        const project = projects.find(p => p.id === slot.gigId);
                        return project?.company === company.name && slot.status === 'reserved';
                      });

                      const totalHours = companySlots.reduce((sum, slot) => sum + (slot.duration || 1), 0);
                      const uniqueReps = new Set(companySlots.map(slot => slot.repId)).size;

                      return (
                        <div key={company.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                              {company.logo ? (
                                <img
                                  src={company.logo}
                                  alt={company.name}
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                <Building className="w-5 h-5 text-gray-500" />
                              )}
                            </div>
                            <div>
                              <h4 className="font-medium">{company.name}</h4>
                              <p className="text-sm text-gray-500">{uniqueReps} REPs assigned</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold">{totalHours}h</p>
                            <p className="text-sm text-gray-500">{companySlots.length} slots</p>
                            {company.priority && (
                              <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                Priority: {company.priority}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )
          }
        </main>
      </div>
    </div>
  );
}