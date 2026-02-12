import React, { useState, useMemo, useEffect } from 'react';
import { Calendar } from '../../components/scheduler/Calendar';
import { TimeSlotGrid } from '../../components/scheduler/TimeSlotGrid';
import { TimeSlot, Project, WeeklyStats, Rep, UserRole, Company, AttendanceRecord } from '../../types/scheduler';
import { Building, Clock, Briefcase, AlertCircle, Users, LayoutDashboard, Brain } from 'lucide-react';
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
import { format } from 'date-fns';
import axios from 'axios';
import Cookies from 'js-cookie';
import { Gig } from '../../types/matching';

// Helper to generate a consistent color from a string
const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00ffffff).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
};

// Map Gig to scheduler Project type
const mapGigToProject = (gig: Gig): Project => {
  return {
    id: gig._id || crypto.randomUUID(),
    name: gig.title,
    description: gig.description,
    company: gig.companyName || 'Unknown Company',
    color: stringToColor(gig._id || gig.title),
    skills: gig.requiredSkills?.map(s => s.name) || [],
    priority: 'medium' // Default priority, could be derived
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

export default function SessionPlanning() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [userRole, setUserRole] = useState<UserRole>('rep');
  const [selectedRepId, setSelectedRepId] = useState<string>(sampleReps[0].id);
  // Replaced selectedCompany with selectedProjectId
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [aiInitialized, setAiInitialized] = useState<boolean>(false);
  const [showAIPanel, setShowAIPanel] = useState<boolean>(false);
  const [showAttendancePanel, setShowAttendancePanel] = useState<boolean>(false);
  const [reps, setReps] = useState<Rep[]>(sampleReps);

  // Real Gigs Data
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingGigs, setLoadingGigs] = useState<boolean>(true);

  useEffect(() => {
    const fetchGigs = async () => {
      const companyId = Cookies.get('companyId');
      if (!companyId) {
        setNotification({ message: 'Company ID not found. Gigs cannot be loaded.', type: 'error' });
        setLoadingGigs(false);
        return;
      }

      try {
        setLoadingGigs(true);
        // Using the API URL from environment matching the user's request
        const apiUrl = import.meta.env.VITE_API_URL_GIGS || 'https://v25gigsmanualcreationbackend-production.up.railway.app/api';
        const response = await axios.get(`${apiUrl}/gigs/company/${companyId}`);

        if (response.data && response.data.data) {
          const mappedProjects = response.data.data.map(mapGigToProject);
          setProjects(mappedProjects);
          // Set default selected project
          if (mappedProjects.length > 0) {
            setSelectedProjectId(mappedProjects[0].id);
          }
          if (mappedProjects.length > 0) {
            console.log(`Loaded ${mappedProjects.length} gigs`);
          }
        }
      } catch (error) {
        console.error('Error fetching gigs:', error);
        setNotification({ message: 'Failed to load Gigs', type: 'error' });
      } finally {
        setLoadingGigs(false);
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
        stats.totalHours += slot.duration || 1;

        if (slot.status === 'available') {
          stats.availableSlots++;
        } else if (slot.status === 'reserved') {
          stats.reservedSlots++;
        }

        if (slot.projectId) {
          stats.projectBreakdown[slot.projectId] = (stats.projectBreakdown[slot.projectId] || 0) + (slot.duration || 1);
        }
      }
    });

    return stats;
  }, [slots, userRole, selectedRepId]);

  const handleSlotUpdate = (updatedSlot: TimeSlot) => {
    // Ensure the slot has a repId
    const slotWithRep = {
      ...updatedSlot,
      repId: updatedSlot.repId || selectedRepId
    };

    const existingSlotIndex = slots.findIndex((slot) => slot.id === slotWithRep.id);
    if (existingSlotIndex >= 0) {
      setSlots((prev) => [
        ...prev.slice(0, existingSlotIndex),
        slotWithRep,
        ...prev.slice(existingSlotIndex + 1),
      ]);
      setNotification({
        message: 'Time slot updated successfully',
        type: 'success'
      });
    } else {
      setSlots((prev) => [...prev, slotWithRep]);
      setNotification({
        message: 'New time slot created',
        type: 'success'
      });
    }

    // Clear notification after 3 seconds
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSlotCancel = (slotId: string) => {
    setSlots((prev) =>
      prev.map((slot) =>
        slot.id === slotId ? { ...slot, status: 'cancelled' } : slot
      )
    );
    setNotification({
      message: 'Time slot cancelled',
      type: 'success'
    });

    // Clear notification after 3 seconds
    setTimeout(() => setNotification(null), 3000);

    // Clear selected slot if it was cancelled
    if (selectedSlot?.id === slotId) {
      setSelectedSlot(null);
    }
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot);
  };

  const handleBulkReserve = (startHour: number, endHour: number, projectId: string) => {
    const newSlots = [];
    for (let hour = startHour; hour < endHour; hour++) {
      const timeString = `${hour.toString().padStart(2, '0')}:00`;
      const existingSlot = slots.find(
        (s) =>
          s.date === format(selectedDate, 'yyyy-MM-dd') &&
          s.startTime === timeString &&
          s.repId === selectedRepId
      );

      if (!existingSlot) {
        newSlots.push({
          id: crypto.randomUUID(),
          startTime: timeString,
          endTime: `${(hour + 1).toString().padStart(2, '0')}:00`,
          date: format(selectedDate, 'yyyy-MM-dd'),
          status: 'reserved',
          duration: 1,
          projectId,
          repId: selectedRepId,
        });
      }
    }

    if (newSlots.length > 0) {
      setSlots((prev) => [...prev, ...newSlots]);
      setNotification({
        message: `${newSlots.length} time slots reserved`,
        type: 'success'
      });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleProjectSelect = (projectId: string) => {
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
        projectId,
        status: 'reserved'
      });
    } else {
      // Create new slot
      handleSlotUpdate({
        id: crypto.randomUUID(),
        startTime: timeString,
        endTime: `${(optimalHour + 1).toString().padStart(2, '0')}:00`,
        date: format(selectedDate, 'yyyy-MM-dd'),
        status: 'reserved',
        duration: 1,
        projectId,
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
      // Create a new available slot
      const newSlot = {
        id: crypto.randomUUID(),
        startTime: timeString,
        endTime: `${(hour + 1).toString().padStart(2, '0')}:00`,
        date: format(selectedDate, 'yyyy-MM-dd'),
        status: 'available',
        duration: 1,
        repId: selectedRepId,
      };

      handleSlotUpdate(newSlot);
      setSelectedSlot(newSlot);
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
    <div className="min-h-screen bg-gray-100">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center ${notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
          <AlertCircle className="w-5 h-5 mr-2" />
          <p>{notification.message}</p>
        </div>
      )}

      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Building className="w-8 h-8 text-blue-600 mr-3" />
              <h1 className="text-3xl font-bold text-gray-900">HARX Scheduling</h1>
              {loadingGigs && <span className="ml-4 text-sm text-gray-500 animate-pulse">Loading Gigs...</span>}
            </div>
            <div className="flex items-center space-x-8">
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-gray-600 mr-2" />
                <div>
                  <p className="text-sm text-gray-600">Weekly Hours</p>
                  <p className="text-lg font-semibold">{weeklyStats.totalHours}h</p>
                </div>
              </div>
              <div className="flex items-center">
                <Briefcase className="w-5 h-5 text-gray-600 mr-2" />
                <div>
                  <p className="text-sm text-gray-600">Active Gigs</p>
                  <p className="text-lg font-semibold">{Object.keys(weeklyStats.projectBreakdown).length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Role Switcher */}
          <div className="mt-6 flex space-x-4">
            <button
              onClick={() => setUserRole('rep')}
              className={`px-4 py-2 rounded-md flex items-center ${userRole === 'rep'
                  ? 'bg-blue-100 text-blue-800 font-medium'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
            >
              <Users className="w-4 h-4 mr-2" />
              REP View
            </button>
            <button
              onClick={() => setUserRole('company')}
              className={`px-4 py-2 rounded-md flex items-center ${userRole === 'company'
                  ? 'bg-blue-100 text-blue-800 font-medium'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
            >
              <Building className="w-4 h-4 mr-2" />
              Company View
            </button>
            <button
              onClick={() => setUserRole('admin')}
              className={`px-4 py-2 rounded-md flex items-center ${userRole === 'admin'
                  ? 'bg-blue-100 text-blue-800 font-medium'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
            >
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Admin View
            </button>
            <button
              onClick={() => setShowAIPanel(!showAIPanel)}
              className={`px-4 py-2 rounded-md flex items-center ${showAIPanel
                  ? 'bg-purple-100 text-purple-800 font-medium'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
            >
              <Brain className="w-4 h-4 mr-2" />
              AI Assistant {showAIPanel ? 'On' : 'Off'}
            </button>
            <button
              onClick={() => setShowAttendancePanel(!showAttendancePanel)}
              className={`px-4 py-2 rounded-md flex items-center ${showAttendancePanel
                  ? 'bg-green-100 text-green-800 font-medium'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
            >
              <Clock className="w-4 h-4 mr-2" />
              Attendance {showAttendancePanel ? 'On' : 'Off'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {userRole === 'company' ? (
          <div className="grid grid-cols-1 gap-6">
            <div className="flex space-x-4 overflow-x-auto pb-2">
              {projects.length === 0 ? (
                <div className="text-gray-500 italic px-4 py-2">No active gigs found.</div>
              ) : (
                projects.map(project => (
                  <button
                    key={project.id}
                    onClick={() => setSelectedProjectId(project.id)}
                    className={`px-4 py-2 rounded-md whitespace-nowrap ${selectedProjectId === project.id
                        ? 'bg-blue-100 text-blue-800 font-medium'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                  >
                    {project.name}
                  </button>
                ))
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Calendar
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                  slots={slots}
                />
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Gig Overview</h2>
                <div className="space-y-4">
                  {/* Gig stats */}
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total REPs Scheduled</span>
                    <span className="font-medium">
                      {new Set(slots
                        .filter(slot => slot.projectId === selectedProjectId && slot.status === 'reserved')
                        .map(slot => slot.repId)
                      ).size}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Hours</span>
                    <span className="font-medium">
                      {slots
                        .filter(slot => slot.projectId === selectedProjectId && slot.status === 'reserved')
                        .reduce((sum, slot) => sum + slot.duration, 0)}h
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {selectedProjectId && (
              <CompanyView
                // Hack: Pass Gig Name as 'company' to trick CompanyView into being a GigView
                company={projects.find(p => p.id === selectedProjectId)?.name || ''}
                slots={slots}
                // Hack: Override project.company with project.name so strict equal check passes in CompanyView
                projects={projects.filter(p => p.id === selectedProjectId).map(p => ({ ...p, company: p.name }))}
                reps={reps}
                selectedDate={selectedDate}
              />
            )}

            {showAttendancePanel && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AttendanceTracker
                  slots={slots}
                  reps={reps}
                  selectedDate={selectedDate}
                  onAttendanceUpdate={handleAttendanceUpdate}
                />
                <AttendanceReport
                  reps={reps}
                  slots={slots}
                />
              </div>
            )}

            {showAIPanel && (
              <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
                <div className="flex items-center mb-4">
                  <Brain className="w-6 h-6 text-purple-600 mr-2" />
                  <h2 className="text-xl font-bold text-gray-800">AI Insights</h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <WorkloadPrediction slots={slots} />
                </div>
              </div>
            )}
          </div>
        ) : userRole === 'rep' ? (
          <div className="grid grid-cols-1 gap-6">
            <RepSelector
              reps={reps}
              selectedRepId={selectedRepId}
              onRepSelect={setSelectedRepId}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Calendar
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                  slots={slots.filter(slot => slot.repId === selectedRepId)}
                />
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Weekly Overview</h2>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Available Slots</span>
                    <span className="font-medium">{weeklyStats.availableSlots}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Reserved Slots</span>
                    <span className="font-medium">{weeklyStats.reservedSlots}</span>
                  </div>
                  <hr className="my-4" />
                  <h3 className="font-medium text-gray-800">Gig Hours</h3>
                  {Object.entries(weeklyStats.projectBreakdown).map(([projectId, hours]) => {
                    const project = projects.find(p => p.id === projectId);
                    return (
                      <div key={projectId} className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: project?.color || '#ccc' }}
                          ></div>
                          <span className="text-gray-600">{project?.name || 'Unknown Gig'}</span>
                        </div>
                        <span className="font-medium">{hours}h</span>
                      </div>
                    );
                  })}

                  <hr className="my-4" />
                  <h3 className="font-medium text-gray-800 mb-2">Quick Reserve</h3>
                  <SlotActionPanel
                    maxHours={10}
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
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Admin Dashboard</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-medium text-blue-800 mb-2">Total REPs</h3>
                  <p className="text-2xl font-bold text-blue-900">{reps.length}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-medium text-green-800 mb-2">Total Companies</h3>
                  <p className="text-2xl font-bold text-green-900">{sampleCompanies.length}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-medium text-purple-800 mb-2">Total Gigs</h3>
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
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-center mb-4">
                    <Brain className="w-5 h-5 text-purple-600 mr-2" />
                    <h2 className="text-lg font-semibold text-gray-800">AI Insights</h2>
                  </div>
                  <div className="space-y-4">
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <h3 className="font-medium text-purple-800 mb-2">Scheduling Efficiency</h3>
                      <p className="text-sm text-gray-700">
                        Based on current scheduling patterns, the system is operating at
                        <span className="font-bold text-purple-800"> 78% </span>
                        efficiency. Consider optimizing REP assignments based on AI recommendations.
                      </p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <h3 className="font-medium text-blue-800 mb-2">Resource Allocation</h3>
                      <p className="text-sm text-gray-700">
                        Tech Co projects are currently overallocated by
                        <span className="font-bold text-blue-800"> 12% </span>
                        while Acme Corp is underallocated. Consider rebalancing resources.
                      </p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <h3 className="font-medium text-green-800 mb-2">Performance Insights</h3>
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
              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">REP Overview</h2>
                <div className="space-y-4">
                  {reps.map(rep => {
                    const repSlots = slots.filter(slot => slot.repId === rep.id && slot.status === 'reserved');
                    const totalHours = repSlots.reduce((sum, slot) => sum + slot.duration, 0);

                    return (
                      <div key={rep.id} className="flex items-center justify-between p-3 border rounded-lg">
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

              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Company Overview</h2>
                <div className="space-y-4">
                  {sampleCompanies.map(company => {
                    const companySlots = slots.filter(slot => {
                      const project = projects.find(p => p.id === slot.projectId);
                      return project?.company === company.name && slot.status === 'reserved';
                    });

                    const totalHours = companySlots.reduce((sum, slot) => sum + slot.duration, 0);
                    const uniqueReps = new Set(companySlots.map(slot => slot.repId)).size;

                    return (
                      <div key={company.id} className="flex items-center justify-between p-3 border rounded-lg">
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
        )}
      </main>
    </div>
  );
}