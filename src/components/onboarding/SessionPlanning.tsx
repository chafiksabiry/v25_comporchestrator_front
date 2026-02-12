import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Brain, LayoutGrid, Users, Calendar as CalendarIcon, ClipboardList, Settings, LogOut } from 'lucide-react';
import { Rep, Project, TimeSlot, Company, UserRole } from '../../types/scheduler';
import { initializeAI } from '../../services/schedulerAiService';

// Component Imports
import { Calendar } from '../../components/scheduler/Calendar';
import { TimeSlotGrid } from '../../components/scheduler/TimeSlotGrid';
import { RepSelector } from '../../components/scheduler/RepSelector';
import { SlotActionPanel } from '../../components/scheduler/SlotActionPanel';
import { CompanyView } from '../../components/scheduler/CompanyView';
import { AIRecommendations } from '../../components/scheduler/AIRecommendations';
import { OptimalTimeHeatmap } from '../../components/scheduler/OptimalTimeHeatmap';
import { PerformanceMetrics } from '../../components/scheduler/PerformanceMetrics';
import { AttendanceTracker } from '../../components/scheduler/AttendanceTracker';
import { AttendanceReport } from '../../components/scheduler/AttendanceReport';
import { AttendanceScorecard } from '../../components/scheduler/AttendanceScorecard';
import { WorkloadPredictionComponent } from '../../components/scheduler/WorkloadPrediction';

// Sample Data
const SAMPLE_REPS: Rep[] = [
  {
    id: '1',
    name: 'Sarah Jenkins',
    email: 'sarah.j@example.com',
    specialties: ['React', 'TypeScript', 'Node.js'],
    performanceScore: 92,
    preferredHours: { start: 9, end: 17 },
    attendanceScore: 98
  },
  {
    id: '2',
    name: 'Mike Chen',
    email: 'mike.c@example.com',
    specialties: ['Python', 'Data Science', 'AWS'],
    performanceScore: 88,
    preferredHours: { start: 10, end: 18 },
    attendanceScore: 85
  },
  {
    id: '3',
    name: 'Jessica Alba',
    email: 'jessica.a@example.com',
    specialties: ['UI/UX', 'Figma', 'CSS'],
    performanceScore: 95,
    preferredHours: { start: 8, end: 16 },
    attendanceScore: 100
  },
  {
    id: '4',
    name: 'David Kim',
    email: 'david.k@example.com',
    specialties: ['Java', 'Spring', 'SQL'],
    performanceScore: 85,
    preferredHours: { start: 9, end: 17 },
    attendanceScore: 92
  },
];

const SAMPLE_PROJECTS: Project[] = [
  {
    id: '1',
    name: 'E-commerce Platform',
    description: 'Migration to new stack',
    company: 'TechCorp',
    color: '#3B82F6',
    skills: ['React', 'Node.js'],
    priority: 'high'
  },
  {
    id: '2',
    name: 'Data Analytics Dashboard',
    description: 'Executive reporting tool',
    company: 'DataViz Inc',
    color: '#10B981',
    skills: ['Python', 'SQL', 'Data Science'],
    priority: 'medium'
  },
  {
    id: '3',
    name: 'Mobile App Redesign',
    description: 'Modernizing UX/UI',
    company: 'AppWorks',
    color: '#8B5CF6',
    skills: ['UI/UX', 'Figma'],
    priority: 'high'
  },
  {
    id: '4',
    name: 'Legacy System Maintenance',
    description: 'Ongoing support',
    company: 'OldSchool Ltd',
    color: '#F59E0B',
    skills: ['Java', 'SQL'],
    priority: 'low'
  },
];

const SAMPLE_COMPANIES: Company[] = [
  { id: '1', name: 'TechCorp', priority: 1 },
  { id: '2', name: 'DataViz Inc', priority: 2 },
  { id: '3', name: 'AppWorks', priority: 1 },
  { id: '4', name: 'OldSchool Ltd', priority: 3 },
];

export default function SessionPlanning() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedRepId, setSelectedRepId] = useState<string>(SAMPLE_REPS[0].id);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [isAIInitialized, setIsAIInitialized] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('rep');
  const [activeTab, setActiveTab] = useState<'schedule' | 'performance' | 'attendance' | 'workload'>('schedule');

  // Initialize slots
  useEffect(() => {
    const initialSlots: TimeSlot[] = [];
    const dates = [
      format(new Date(), 'yyyy-MM-dd'),
      format(new Date(Date.now() + 86400000), 'yyyy-MM-dd'),
      format(new Date(Date.now() + 172800000), 'yyyy-MM-dd'),
    ];

    SAMPLE_REPS.forEach(rep => {
      dates.forEach(date => {
        for (let hour = 8; hour <= 20; hour++) {
          initialSlots.push({
            id: `${rep.id}-${date}-${hour}`,
            startTime: `${hour.toString().padStart(2, '0')}:00`,
            endTime: `${(hour + 1).toString().padStart(2, '0')}:00`,
            date: date,
            status: 'available',
            duration: 1,
            repId: rep.id,
            // Randomly assign some slots
            ...(Math.random() > 0.7 ? {
              projectId: SAMPLE_PROJECTS[Math.floor(Math.random() * SAMPLE_PROJECTS.length)].id,
              status: 'reserved' as const
            } : {})
          });
        }
      });
    });

    setSlots(initialSlots);
  }, []);

  // Initialize AI service
  useEffect(() => {
    async function init() {
      const success = await initializeAI();
      setIsAIInitialized(success);
    }
    init();
  }, []);

  const handleSlotUpdate = (updates: Partial<TimeSlot>) => {
    if (!selectedSlotId) return;

    setSlots(prev => prev.map(slot =>
      slot.id === selectedSlotId ? { ...slot, ...updates } : slot
    ));
  };

  const handleAttendanceUpdate = (slotId: string, attended: boolean, notes?: string) => {
    setSlots(prev => prev.map(slot =>
      slot.id === slotId ? { ...slot, attended, attendanceNotes: notes } : slot
    ));
  };

  const handleProjectSelect = (projectId: string) => {
    if (selectedSlotId) {
      handleSlotUpdate({ projectId, status: 'reserved' });
    }
  };

  // Get current rep
  const selectedRep = SAMPLE_REPS.find(r => r.id === selectedRepId) || SAMPLE_REPS[0];

  // Get slots for current rep and date
  const currentSlots = slots.filter(s =>
    s.repId === selectedRepId &&
    s.date === format(selectedDate, 'yyyy-MM-dd')
  );

  const selectedSlot = slots.find(s => s.id === selectedSlotId);

  // Render content based on role and tab
  const renderContent = () => {
    if (userRole === 'company') {
      return (
        <CompanyView
          company={SAMPLE_COMPANIES[0].name}
          slots={slots}
          projects={SAMPLE_PROJECTS}
          reps={SAMPLE_REPS}
          selectedDate={selectedDate}
        />
      );
    }

    // Role is 'rep' or 'admin'
    switch (activeTab) {
      case 'performance':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Performance & Analytics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <PerformanceMetrics rep={selectedRep} slots={slots} />
              <AttendanceScorecard rep={selectedRep} slots={slots} />
            </div>
          </div>
        );

      case 'attendance':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Attendance Management</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <Calendar
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                  slots={slots.filter(s => s.repId === selectedRepId)}
                />
              </div>
              <div className="lg:col-span-2 space-y-6">
                <AttendanceTracker
                  reps={SAMPLE_REPS}
                  slots={slots}
                  selectedDate={selectedDate}
                  onAttendanceUpdate={handleAttendanceUpdate}
                />

                {userRole === 'admin' && (
                  <AttendanceReport reps={SAMPLE_REPS} slots={slots} />
                )}
              </div>
            </div>
          </div>
        );

      case 'workload':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Workload Intelligence</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <WorkloadPredictionComponent slots={slots.filter(s => s.repId === selectedRepId)} />
              <OptimalTimeHeatmap
                rep={selectedRep}
                slots={slots}
                onSelectHour={(hour) => console.log('Selected optimal hour:', hour)}
              />
            </div>
          </div>
        );

      case 'schedule':
      default:
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Calendar & Rep Selection */}
            <div className="space-y-6">
              <RepSelector
                reps={SAMPLE_REPS}
                selectedRepId={selectedRepId}
                onSelectRep={setSelectedRepId}
              />
              <Calendar
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
                slots={slots.filter(s => s.repId === selectedRepId)}
              />
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <Brain className="w-5 h-5 text-blue-600 mr-2" />
                  <span className="font-semibold text-blue-900">AI Status</span>
                </div>
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-2 ${isAIInitialized ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm">{isAIInitialized ? 'Online & Learning' : 'Initializing...'}</span>
                </div>
              </div>
            </div>

            {/* Middle Column: Time Grid */}
            <div className="lg:col-span-1">
              <TimeSlotGrid
                slots={currentSlots}
                onSlotClick={setSelectedSlotId}
                selectedSlotId={selectedSlotId}
                projects={SAMPLE_PROJECTS}
              />
            </div>

            {/* Right Column: Actions & AI Recommendations */}
            <div className="space-y-6">
              {selectedSlotId ? (
                <>
                  <SlotActionPanel
                    slot={selectedSlot!}
                    maxHours={10}
                    availableProjects={SAMPLE_PROJECTS}
                    onUpdate={handleSlotUpdate}
                    onClear={() => handleSlotUpdate({ projectId: undefined, status: 'available', notes: undefined })}
                  />
                  <AIRecommendations
                    rep={selectedRep}
                    projects={SAMPLE_PROJECTS}
                    slots={slots}
                    onSelectProject={handleProjectSelect}
                  />
                </>
              ) : (
                <div className="bg-gray-50 rounded-lg p-6 text-center border border-dashed border-gray-300">
                  <div className="inline-block p-3 bg-white rounded-full shadow-sm mb-3">
                    <CalendarIcon className="w-6 h-6 text-gray-400" />
                  </div>
                  <h3 className="font-medium text-gray-900">No Slot Selected</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Click on a time slot to manage assignments or view AI recommendations.
                  </p>
                </div>
              )}

              <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg p-4 text-white shadow-lg">
                <h3 className="font-bold flex items-center mb-2">
                  <Brain className="w-4 h-4 mr-2" />
                  Smart Scheduler
                </h3>
                <p className="text-xs opacity-90">
                  AI-powered optimization is active. Recommendations are personalized based on rep skills, historical performance, and project priorities.
                </p>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 rounded-xl shadow-inner">
      <div className="max-w-7xl mx-auto">
        <header className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3 shadow-md">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">HARX26 SCHEDULER</h1>
                <p className="text-sm text-gray-500">AI-Powered Resource Management</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <select
                value={userRole}
                onChange={(e) => setUserRole(e.target.value as UserRole)}
                className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
              >
                <option value="rep">View as REP</option>
                <option value="company">View as Company</option>
                <option value="admin">View as Admin</option>
              </select>

              <div className="h-8 w-px bg-gray-200 mx-2"></div>

              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <Settings className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>

          {userRole !== 'company' && (
            <div className="flex space-x-1 mt-6 border-b border-gray-200">
              <button
                onClick={() => setActiveTab('schedule')}
                className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'schedule'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <span className="flex items-center">
                  <LayoutGrid className="w-4 h-4 mr-2" />
                  Schedule
                </span>
              </button>
              <button
                onClick={() => setActiveTab('performance')}
                className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'performance'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <span className="flex items-center">
                  <Brain className="w-4 h-4 mr-2" />
                  Performance
                </span>
              </button>
              <button
                onClick={() => setActiveTab('attendance')}
                className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'attendance'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <span className="flex items-center">
                  <ClipboardList className="w-4 h-4 mr-2" />
                  Attendance
                </span>
              </button>
              <button
                onClick={() => setActiveTab('workload')}
                className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'workload'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <span className="flex items-center">
                  <Settings className="w-4 h-4 mr-2" />
                  Workload Insights
                </span>
              </button>
            </div>
          )}
        </header>

        <main>
          {renderContent()}
        </main>
      </div>
    </div>
  );
}