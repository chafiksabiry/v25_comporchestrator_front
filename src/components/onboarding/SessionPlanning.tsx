import React, { useState } from 'react';
import { CompanyView } from '../scheduler/CompanyView';
import { TimeSlot, Project, Rep } from '../../types/scheduler';
import { format, addDays } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const SessionPlanning = () => {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Mock Data
  const companyName = "TechCorp Inc.";

  const mockProjects: Project[] = [
    {
      id: 'p1',
      name: 'Customer Support Alpha',
      description: 'Level 1 support for product Alpha',
      company: companyName,
      color: '#3B82F6', // blue
      skills: ['customer_service', 'technical_support'],
      priority: 'high'
    },
    {
      id: 'p2',
      name: 'Sales Outreach Beta',
      description: 'Outbound sales for product Beta',
      company: companyName,
      color: '#10B981', // green
      skills: ['sales', 'negotiation'],
      priority: 'medium'
    }
  ];

  const mockReps: Rep[] = [
    {
      id: 'r1',
      name: 'Sarah Jenkins',
      email: 'sarah@example.com',
      specialties: ['customer_service', 'english', 'french'],
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
      performanceScore: 92
    },
    {
      id: 'r2',
      name: 'Michael Chen',
      email: 'michael@example.com',
      specialties: ['technical_support', 'english', 'spanish'],
      avatar: 'https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
      performanceScore: 88
    },
    {
      id: 'r3',
      name: 'Emily Rodriguez',
      email: 'emily@example.com',
      specialties: ['sales', 'english', 'spanish'],
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
      performanceScore: 95
    }
  ];

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');

  const mockSlots: TimeSlot[] = [
    {
      id: 's1',
      startTime: '09:00',
      endTime: '13:00',
      date: todayStr,
      projectId: 'p1',
      status: 'reserved',
      duration: 4,
      repId: 'r1',
      notes: 'Morning shift coverage'
    },
    {
      id: 's2',
      startTime: '14:00',
      endTime: '18:00',
      date: todayStr,
      projectId: 'p1',
      status: 'reserved',
      duration: 4,
      repId: 'r1'
    },
    {
      id: 's3',
      startTime: '10:00',
      endTime: '14:00',
      date: todayStr,
      projectId: 'p2',
      status: 'reserved',
      duration: 4,
      repId: 'r3',
      notes: 'Focus on high value leads'
    },
    {
      id: 's4',
      startTime: '09:00',
      endTime: '17:00',
      date: tomorrowStr,
      projectId: 'p2',
      status: 'reserved',
      duration: 8,
      repId: 'r2'
    }
  ];

  const handlePrevDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Session Planning</h1>
        <div className="flex items-center space-x-4 bg-white p-2 rounded-lg shadow-sm border border-gray-200">
          <button
            onClick={handlePrevDay}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <span className="text-sm font-medium text-gray-700 min-w-[120px] text-center">
            {format(currentDate, 'MMM d, yyyy')}
          </span>
          <button
            onClick={handleNextDay}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      <CompanyView
        company={companyName}
        slots={mockSlots}
        projects={mockProjects}
        reps={mockReps}
        selectedDate={currentDate}
      />
    </div>
  );
};

export default SessionPlanning;