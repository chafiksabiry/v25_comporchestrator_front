import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Users, 
  Plus, 
  Filter, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  X 
} from 'lucide-react';

function SchedulerPanel() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [showNewScheduleModal, setShowNewScheduleModal] = useState(false);

  // Generate time slots
  const timeSlots = Array.from({ length: 9 }, (_, i) => {
    const hour = i + 9; // Start at 9 AM
    return `${hour.toString().padStart(2, '0')}:00`;
  });

  // Generate calendar days
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    // Add days from previous month to fill first week
    const firstDayOfWeek = firstDay.getDay();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      days.push(new Date(year, month, -i));
    }

    // Add days of current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    // Add days from next month to fill last week
    const remainingDays = 42 - days.length; // 6 weeks * 7 days = 42
    for (let i = 1; i <= remainingDays; i++) {
      days.push(new Date(year, month + 1, i));
    }

    return days;
  };

  const calendarDays = getDaysInMonth(selectedDate);

  // Mock data for schedules
  const mockSchedules = [
    {
      id: '1',
      start_time: new Date(2024, 2, 15, 9, 0).toISOString(),
      end_time: new Date(2024, 2, 15, 17, 0).toISOString(),
      rep_id: '1'
    },
    {
      id: '2',
      start_time: new Date(2024, 2, 16, 10, 0).toISOString(),
      end_time: new Date(2024, 2, 16, 18, 0).toISOString(),
      rep_id: '2'
    }
  ];

  // Get schedules for a specific day
  const getDaySchedules = (date: Date) => {
    return mockSchedules.filter(schedule => {
      const scheduleDate = new Date(schedule.start_time);
      return (
        scheduleDate.getFullYear() === date.getFullYear() &&
        scheduleDate.getMonth() === date.getMonth() &&
        scheduleDate.getDate() === date.getDate()
      );
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-100 rounded-lg">
              <CalendarIcon className="w-6 h-6 text-rose-500" />
            </div>
            <h2 className="text-xl font-semibold">Schedule Management</h2>
          </div>
          <button 
            onClick={() => setShowNewScheduleModal(true)}
            className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Schedule
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-rose-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-rose-500" />
              <span className="font-medium">Available Reps</span>
            </div>
            <div className="text-2xl font-bold">12</div>
            <div className="text-sm text-rose-500">Current shift</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-green-600" />
              <span className="font-medium">Shift Coverage</span>
            </div>
            <div className="text-2xl font-bold">95%</div>
            <div className="text-sm text-green-600">This week</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CalendarIcon className="w-5 h-5 text-purple-600" />
              <span className="font-medium">Scheduled</span>
            </div>
            <div className="text-2xl font-bold">48</div>
            <div className="text-sm text-purple-600">Next 7 days</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-yellow-600" />
              <span className="font-medium">Pending</span>
            </div>
            <div className="text-2xl font-bold">5</div>
            <div className="text-sm text-yellow-600">Shift requests</div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search schedules..."
                className="pl-10 pr-4 py-2 border rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>
            <Filter className="w-5 h-5 text-gray-400" />
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedDate(new Date())}
              className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600"
            >
              Today
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const newDate = new Date(selectedDate);
                  newDate.setMonth(newDate.getMonth() - 1);
                  setSelectedDate(newDate);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="font-medium">
                {selectedDate.toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric'
                })}
              </span>
              <button
                onClick={() => {
                  const newDate = new Date(selectedDate);
                  newDate.setMonth(newDate.getMonth() + 1);
                  setSelectedDate(newDate);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="border rounded-lg">
          {/* Calendar Header */}
          <div className="grid grid-cols-7 gap-px border-b bg-gray-50">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className="p-2 text-center font-medium">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-px">
            {calendarDays.map((date, i) => {
              const isToday = date.toDateString() === new Date().toDateString();
              const isSelected = date.toDateString() === selectedDate.toDateString();
              const isCurrentMonth = date.getMonth() === selectedDate.getMonth();
              const daySchedules = getDaySchedules(date);

              return (
                <div
                  key={i}
                  className={`min-h-32 p-2 ${
                    isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${
                        isToday
                          ? 'bg-rose-500 text-white'
                          : isSelected
                          ? 'bg-rose-100 text-rose-500'
                          : ''
                      }`}
                    >
                      {date.getDate()}
                    </span>
                    {daySchedules.length > 0 && (
                      <span className="text-xs text-gray-500">
                        {daySchedules.length} shifts
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    {daySchedules.map(schedule => (
                      <div
                        key={schedule.id}
                        className="text-xs p-1 bg-rose-100 text-rose-500 rounded"
                      >
                        {new Date(schedule.start_time).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-3 text-sm text-rose-500">
          <strong>Pro Tips:</strong>
          <ul className="mt-1">
            <li>• Morning slots (9-10 AM) are limited to 4 reps</li>
            <li>• Mid-morning slots (10-12 PM) allow 6 reps</li>
            <li>• Afternoon slots (1-5 PM) can have up to 8 reps</li>
          </ul>
        </div>
      </div>

      {/* New Schedule Modal */}
      {showNewScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Create New Schedule</h3>
              <button
                onClick={() => setShowNewScheduleModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={selectedDate.toISOString().split('T')[0]}
                  onChange={(e) => setSelectedDate(new Date(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time Slot
                </label>
                <select
                  value={selectedSlot || ''}
                  onChange={(e) => setSelectedSlot(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400"
                >
                  <option value="">Select a time slot</option>
                  {timeSlots.map(slot => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowNewScheduleModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowNewScheduleModal(false)}
                  disabled={!selectedSlot}
                  className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 disabled:bg-orange-400"
                >
                  Create Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SchedulerPanel;
