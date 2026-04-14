import React, { useState, useEffect } from "react";
import {
  Clock,
  Calendar,
  Globe,
  Plus,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Loader2
} from "lucide-react";
import { fetchAllTimezones } from "../lib/api";

interface DaySchedule {
  day: string;
  hours: { start: string; end: string };
  _id?: { $oid: string };
}

interface GroupedSchedule {
  hours: { start: string; end: string };
  days: string[];
}

interface ScheduleSectionProps {
  data: {
    schedules: DaySchedule[];
    minimumHours: {
      daily?: number;
      weekly?: number;
      monthly?: number;
    };
    time_zone?: string;
    flexibility: string[];
  };
  destination_zone?: string;
  onChange: (data: ScheduleSectionProps['data']) => void;
  onNext?: () => void;
  onPrevious?: () => void;
}

const allWeekDays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const flexibilityOptions = [
  'Remote Work Available', 'Flexible Hours', 'Weekend Rotation',
  'Night Shift Available', 'Split Shifts', 'Part-Time Options',
  'Compressed Work Week', 'Shift Swapping Allowed'
];

const timePresets = [
  { label: "Morning", start: "09:00", end: "17:00" },
  { label: "Afternoon", start: "13:00", end: "21:00" },
  { label: "Evening", start: "17:00", end: "01:00" },
  { label: "Night", start: "21:00", end: "05:00" },
  { label: "Full Day", start: "00:00", end: "23:59" },
];

// Function to get header gradient based on section type
const getHeaderGradient = (bgColor: string) => {
  switch (bgColor) {
    case 'blue':
      return 'from-harx-500 via-harx-600 to-harx-alt-500';
    case 'purple':
      return 'from-harx-alt-500 via-harx-alt-600 to-harx-500';
    case 'emerald':
      return 'from-harx-400 via-harx-500 to-harx-600';
    case 'orange':
      return 'from-harx-alt-400 via-harx-alt-500 to-pink-500';
    default:
      return 'from-gray-500 to-gray-600';
  }
};

const formatTime24 = (time: string) => {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const hoursStr = hours.padStart(2, '0');
  const minutesStr = minutes?.padStart(2, '0') || '00';
  return `${hoursStr}h${minutesStr}`;
};

export function ScheduleSection({ data, onChange, onNext, onPrevious }: ScheduleSectionProps) {
  const [timezones, setTimezones] = useState<any[]>([]);
  const [timezonesLoading, setTimezonesLoading] = useState(true);

  // Load timezones from API
  useEffect(() => {
    const fetchTimezones = async () => {
      try {
        setTimezonesLoading(true);
        const timezonesData = await fetchAllTimezones();
        setTimezones(timezonesData);
        setTimezonesLoading(false);
      } catch (error) {
        console.error('Error fetching timezones:', error);
        setTimezonesLoading(false);
      }
    };

    fetchTimezones();
  }, []);

  // Group schedules by hours (same logic as Suggestions.tsx)
  const groupedSchedules = (data.schedules || []).reduce(
    (groups, schedule) => {
      // Ignorer les schedules avec des jours vides
      if (!schedule.day || schedule.day.trim() === "") return groups;

      const key = `${schedule.hours.start}-${schedule.hours.end}`;
      if (!groups[key]) {
        groups[key] = { hours: schedule.hours, days: [] };
      }
      groups[key].days.push(schedule.day);
      return groups;
    },
    {} as Record<string, GroupedSchedule>
  );


  // Vérifier si tous les jours sont déjà sélectionnés
  const selectedDays = data.schedules
    .filter(schedule => schedule.day && schedule.day.trim() !== "")
    .map(schedule => schedule.day);

  const allDaysSelected = allWeekDays.every(day => selectedDays.includes(day));

  const addNewScheduleGroup = () => {
    const currentSchedules = data.schedules || [];

    // 1. Find first available day
    const currentSelectedDays = currentSchedules
      .filter(schedule => schedule.day && schedule.day.trim() !== "")
      .map(schedule => schedule.day);

    const firstAvailableDay = allWeekDays.find(day => !currentSelectedDays.includes(day));

    if (!firstAvailableDay) {
      return;
    }

    // 2. Find unique hours to avoid auto-merging with existing groups
    let startHour = 9;
    let endHour = 17;

    const isHoursTaken = (s: number, e: number) => {
      const sStr = `${s.toString().padStart(2, '0')}:00`;
      const eStr = `${e.toString().padStart(2, '0')}:00`;
      return currentSchedules.some(sch => sch.hours.start === sStr && sch.hours.end === eStr);
    };

    // Try to find a free slot (up to 12 attempts to shift by hour)
    let attempts = 0;
    while (isHoursTaken(startHour, endHour) && attempts < 12) {
      startHour = (startHour + 1) % 24;
      endHour = (endHour + 1) % 24;
      attempts++;
    }

    const newSchedule: DaySchedule = {
      day: firstAvailableDay,
      hours: {
        start: `${startHour.toString().padStart(2, '0')}:00`,
        end: `${endHour.toString().padStart(2, '0')}:00`
      },
    };

    onChange({
      ...data,
      schedules: [...currentSchedules, newSchedule]
    });
  };

  const handleDayToggle = (
    dayToToggle: string,
    groupHours: { start: string; end: string }
  ) => {
    const updatedSchedules = [...data.schedules];
    const existingScheduleIndex = updatedSchedules.findIndex(
      schedule => schedule.day === dayToToggle
    );

    if (existingScheduleIndex !== -1) {
      // Remove the day
      updatedSchedules.splice(existingScheduleIndex, 1);
    } else {
      // Add the day with the group's hours
      updatedSchedules.push({
        day: dayToToggle,
        hours: { ...groupHours },
      });
    }

    onChange({
      ...data,
      schedules: updatedSchedules
    });
  };

  const handleHoursChange = (
    group: GroupedSchedule,
    field: "start" | "end",
    value: string
  ) => {
    const updatedSchedules = data.schedules.map(schedule => {
      if (group.days.includes(schedule.day) &&
        schedule.hours.start === group.hours.start &&
        schedule.hours.end === group.hours.end) {
        return {
          ...schedule,
          hours: { ...schedule.hours, [field]: value }
        };
      }
      return schedule;
    });

    onChange({
      ...data,
      schedules: updatedSchedules
    });
  };

  const handlePresetClick = (group: GroupedSchedule, preset: string) => {
    const presetData = timePresets.find(p => p.label === preset);
    if (!presetData) return;

    const updatedSchedules = data.schedules.map(schedule => {
      if (group.days.includes(schedule.day) &&
        schedule.hours.start === group.hours.start &&
        schedule.hours.end === group.hours.end) {
        return {
          ...schedule,
          hours: { start: presetData.start, end: presetData.end }
        };
      }
      return schedule;
    });

    onChange({
      ...data,
      schedules: updatedSchedules
    });
  };

  const deleteScheduleGroup = (groupHours: { start: string; end: string }) => {
    const updatedSchedules = data.schedules.filter(schedule =>
      !(schedule.hours.start === groupHours.start &&
        schedule.hours.end === groupHours.end)
    );

    onChange({
      ...data,
      schedules: updatedSchedules
    });
  };

  // Local state for minimum hours to prevent focus loss
  const [localMinHours, setLocalMinHours] = useState({
    daily: data.minimumHours?.daily?.toString() || "",
    weekly: data.minimumHours?.weekly?.toString() || "",
    monthly: data.minimumHours?.monthly?.toString() || ""
  });

  // Sync local state with props when props change externally
  useEffect(() => {
    setLocalMinHours({
      daily: data.minimumHours?.daily?.toString() || "",
      weekly: data.minimumHours?.weekly?.toString() || "",
      monthly: data.minimumHours?.monthly?.toString() || ""
    });
  }, [data.minimumHours?.daily, data.minimumHours?.weekly, data.minimumHours?.monthly]);

  const handleMinimumHoursChange = (field: 'daily' | 'weekly' | 'monthly', value: string) => {
    // Update local state immediately
    setLocalMinHours(prev => ({ ...prev, [field]: value }));

    // Update parent only if value is a valid number or empty
    const numValue = value === "" ? undefined : parseInt(value);

    // Only trigger parent update if the parsed value is different to avoid loops
    if (numValue !== data.minimumHours?.[field]) {
      onChange({
        ...data,
        minimumHours: {
          ...data.minimumHours,
          [field]: numValue
        }
      });
    }
  };

  const handleTimezoneChange = (timezoneId: string) => {
    onChange({
      ...data,
      time_zone: timezoneId
    });
  };

  const handleFlexibilityToggle = (option: string) => {
    const currentFlexibility = data.flexibility || [];
    const isSelected = currentFlexibility.includes(option);

    const updatedFlexibility = isSelected
      ? currentFlexibility.filter(item => item !== option)
      : [...currentFlexibility, option];

    onChange({
      ...data,
      flexibility: updatedFlexibility
    });
  };

  return (
    <div className="w-full bg-white p-0">
      <div className="space-y-8">
        <div className="space-y-6 p-6 bg-gradient-to-br from-slate-50 via-white to-slate-50 rounded-2xl shadow-sm border border-slate-100">

          {/* Schedule Groups Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className={`bg-gradient-to-r ${getHeaderGradient('blue')} px-6 py-4`}>
              <div className="flex items-center">
                <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-lg mr-3">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Work Schedule</h3>
                  <p className="text-white/80 text-sm">Define working days and hours</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Schedule Groups</span>
                  <span className="bg-harx-100 text-harx-800 text-xs font-semibold px-2 py-1 rounded-full">
                    {Object.keys(groupedSchedules).length}
                  </span>
                </div>
                {!allDaysSelected && (
                  <button
                    onClick={addNewScheduleGroup}
                    className="flex items-center gap-2 px-3 py-2 bg-harx-500 text-white rounded-lg hover:bg-harx-600 transition-colors text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Add Schedule
                  </button>
                )}
              </div>

              {Object.entries(groupedSchedules).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(groupedSchedules).map(([key, group]) => (
                    <div
                      key={key}
                      className="bg-gradient-to-br from-harx-50 to-harx-alt-50 rounded-xl p-4 border-2 border-harx-100 shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-semibold text-harx-700">
                          {formatTime24(group.hours.start)} - {formatTime24(group.hours.end)}
                        </h4>
                        <button
                          onClick={() => deleteScheduleGroup(group.hours)}
                          className="p-1 text-red-500 hover:text-white hover:bg-red-500 rounded-md transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Days Selection */}
                      <div className="mb-4">
                        <label className="block text-xs font-medium text-gray-700 mb-2">Working Days</label>
                        <div className="grid grid-cols-7 gap-1">
                          {allWeekDays.map(day => {
                            const isSelected = group.days.includes(day);
                            const isAlreadySelected = selectedDays.includes(day) && !isSelected;

                            return (
                              <button
                                key={day}
                                onClick={() => !isAlreadySelected && handleDayToggle(day, group.hours)}
                                disabled={isAlreadySelected}
                                className={`px-2 py-1 text-xs font-medium rounded-md transition-all ${isSelected
                                  ? 'bg-harx-500 text-white'
                                  : isAlreadySelected
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-harx-50 hover:border-harx-300'
                                  }`}
                              >
                                {day.slice(0, 3)}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Time Selection */}
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Start Time</label>
                          <input
                            type="time"
                            value={group.hours.start}
                            onChange={(e) => handleHoursChange(group, 'start', e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-white border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">End Time</label>
                          <input
                            type="time"
                            value={group.hours.end}
                            onChange={(e) => handleHoursChange(group, 'end', e.target.value)}
                            min={group.hours.start}
                            className="w-full px-3 py-2 text-sm bg-white border border-harx-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-harx-500 focus:border-harx-500"
                          />
                        </div>
                      </div>

                      {/* Time Presets */}
                      <div className="flex flex-wrap gap-2">
                        {timePresets.map(preset => (
                          <button
                            key={preset.label}
                            onClick={() => handlePresetClick(group, preset.label)}
                            className="px-2 py-1 text-xs bg-white border border-harx-200 text-harx-600 rounded-md hover:bg-harx-50 transition-colors"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm">No schedule groups defined</p>
                  <p className="text-xs text-gray-400">Click "Add Schedule" to get started</p>
                </div>
              )}
            </div>
          </div>

          {/* Minimum Hours Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className={`bg-gradient-to-r ${getHeaderGradient('purple')} px-6 py-4`}>
              <div className="flex items-center">
                <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-lg mr-3">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Minimum Hours</h3>
                  <p className="text-white/80 text-sm">Set minimum working hour requirements</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Daily Hours</label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={localMinHours.daily}
                    onChange={(e) => handleMinimumHoursChange('daily', e.target.value)}
                    placeholder="e.g. 8"
                    className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-violet-50 border-2 border-purple-200 rounded-xl text-purple-900 font-medium focus:outline-none focus:ring-3 focus:ring-purple-300 focus:border-purple-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Weekly Hours</label>
                  <input
                    type="number"
                    min="1"
                    max="168"
                    value={localMinHours.weekly}
                    onChange={(e) => handleMinimumHoursChange('weekly', e.target.value)}
                    placeholder="e.g. 40"
                    className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-violet-50 border-2 border-purple-200 rounded-xl text-purple-900 font-medium focus:outline-none focus:ring-3 focus:ring-purple-300 focus:border-purple-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Hours</label>
                  <input
                    type="number"
                    min="1"
                    max="744"
                    value={localMinHours.monthly}
                    onChange={(e) => handleMinimumHoursChange('monthly', e.target.value)}
                    placeholder="e.g. 160"
                    className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-violet-50 border-2 border-purple-200 rounded-xl text-purple-900 font-medium focus:outline-none focus:ring-3 focus:ring-purple-300 focus:border-purple-400 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Timezone Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className={`bg-gradient-to-r ${getHeaderGradient('emerald')} px-6 py-4`}>
              <div className="flex items-center">
                <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-lg mr-3">
                  <Globe className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Time Zone</h3>
                  <p className="text-white/80 text-sm">Select the primary working timezone</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <select
                value={data.time_zone || ''}
                onChange={(e) => handleTimezoneChange(e.target.value)}
                disabled={timezonesLoading}
                className="w-full px-4 py-3 bg-gradient-to-r from-harx-50 to-harx-alt-50 border-2 border-harx-200 rounded-xl text-harx-900 font-medium focus:outline-none focus:ring-3 focus:ring-harx-300 focus:border-harx-400 transition-all disabled:opacity-50"
              >
                <option value="">
                  {timezonesLoading ? 'Loading timezones...' : 'Select a timezone'}
                </option>
                {timezones.map((timezone) => {
                  // Convertir gmtOffset (probablement en secondes) en heures
                  const offsetHours = timezone.gmtOffset / 3600;
                  const offsetString = offsetHours >= 0 ? `+${offsetHours}` : `${offsetHours}`;

                  return (
                    <option key={timezone._id} value={timezone._id}>
                      {timezone.zoneName} ({timezone.countryName}) UTC{offsetString}
                    </option>
                  );
                })}
              </select>
              {timezonesLoading && (
                <div className="mt-2 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 animate-spin text-harx-500" />
                  <span className="ml-2 text-sm text-harx-600">Loading timezones...</span>
                </div>
              )}
            </div>
          </div>

          {/* Flexibility Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className={`bg-gradient-to-r ${getHeaderGradient('orange')} px-6 py-4`}>
              <div className="flex items-center">
                <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-lg mr-3">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Schedule Flexibility</h3>
                  <p className="text-white/80 text-sm">Define flexible working arrangements</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {flexibilityOptions.map((option) => {
                  const isSelected = (data.flexibility || []).includes(option);
                  return (
                    <button
                      key={option}
                      onClick={() => handleFlexibilityToggle(option)}
                      className={`p-3 rounded-xl border-2 text-left transition-all duration-200 ${isSelected
                        ? 'bg-gradient-to-br from-harx-50 to-harx-alt-50 border-harx-200 text-harx-800'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-harx-50 hover:border-harx-200'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${isSelected ? 'bg-harx-500 border-harx-500' : 'border-gray-300'
                          }`}>
                          {isSelected && <span className="text-white text-xs">✓</span>}
                        </div>
                        <span className="text-sm font-medium">{option}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-3">
              <button
                onClick={onPrevious}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              >
                <ArrowLeft className="w-5 h-5" />
                Previous
              </button>
            </div>
            <button
              onClick={onNext}
              className="flex items-center gap-2 px-6 py-2 rounded-xl bg-harx-500 text-white hover:bg-harx-600 shadow-md hover:shadow-lg transition-all"
            >
              Next
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
