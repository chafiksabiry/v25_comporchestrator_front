import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
import {
  DaySchedule,
  MultiRangeScheduleGroup,
  TimeRange,
  findOverlappingRangeIndexes,
  groupSchedulesByDayRanges,
  rangesOverlap,
  replaceScheduleGroup,
} from "../lib/scheduleUtils";

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
  /** When true, hide wizard Previous/Next (used in gig edit). */
  hideNavigation?: boolean;
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

const weekdayI18nKey: Record<string, string> = {
  Monday: "monday",
  Tuesday: "tuesday",
  Wednesday: "wednesday",
  Thursday: "thursday",
  Friday: "friday",
  Saturday: "saturday",
  Sunday: "sunday",
};

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

const rangeCandidates: TimeRange[] = [
  { start: "09:00", end: "17:00" },
  { start: "08:00", end: "12:00" },
  { start: "13:00", end: "18:00" },
  { start: "14:00", end: "18:00" },
  { start: "07:00", end: "15:00" },
  { start: "11:00", end: "19:00" },
];

const pickUnusedRange = (existing: TimeRange[]): TimeRange => {
  const taken = new Set(existing.map((r) => `${r.start}-${r.end}`));
  const nonOverlapping = rangeCandidates.find(
    (c) =>
      !taken.has(`${c.start}-${c.end}`) &&
      !existing.some((r) => rangesOverlap(r, c))
  );
  if (nonOverlapping) return nonOverlapping;
  return (
    rangeCandidates.find((c) => !taken.has(`${c.start}-${c.end}`)) || {
      start: "18:00",
      end: "21:00",
    }
  );
};

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

export function ScheduleSection({ data, onChange, onNext, onPrevious, hideNavigation = false }: ScheduleSectionProps) {
  const { t } = useTranslation();
  const [timezones, setTimezones] = useState<any[]>([]);

  const dayDisplay = (day: string, abbrev = false) => {
    const key = weekdayI18nKey[day];
    const label = key ? t(`gigCreation.schedule.days.${key}`) : day;
    return abbrev ? label.slice(0, 3) : label;
  };
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

  const scheduleGroups = groupSchedulesByDayRanges(data.schedules);
  const usedDays = new Set(scheduleGroups.flatMap((g) => g.days));
  const freeDays = allWeekDays.filter((d) => !usedDays.has(d));

  const commitGroup = (
    group: MultiRangeScheduleGroup,
    nextDays: string[],
    nextRanges: TimeRange[]
  ) => {
    onChange({
      ...data,
      schedules: replaceScheduleGroup(data.schedules || [], group, nextDays, nextRanges),
    });
  };

  const addNewScheduleGroup = () => {
    if (freeDays.length === 0) return;
    const hours = pickUnusedRange(
      scheduleGroups.flatMap((g) => g.ranges)
    );
    onChange({
      ...data,
      schedules: [
        ...(data.schedules || []),
        { day: freeDays[0], hours: { ...hours } },
      ],
    });
  };

  const handleDayToggle = (group: MultiRangeScheduleGroup, day: string) => {
    const isSelected = group.days.includes(day);
    if (!isSelected && usedDays.has(day)) return;
    const nextDays = isSelected
      ? group.days.filter((d) => d !== day)
      : [...group.days, day];
    if (nextDays.length === 0) {
      onChange({
        ...data,
        schedules: (data.schedules || []).filter((s) => !group.days.includes(s.day)),
      });
      return;
    }
    commitGroup(group, nextDays, group.ranges);
  };

  const handleRangeChange = (
    group: MultiRangeScheduleGroup,
    rangeIndex: number,
    field: "start" | "end",
    value: string
  ) => {
    const nextRanges = group.ranges.map((r, i) =>
      i === rangeIndex ? { ...r, [field]: value } : r
    );
    commitGroup(group, group.days, nextRanges);
  };

  const handlePresetClick = (
    group: MultiRangeScheduleGroup,
    rangeIndex: number,
    presetLabel: string
  ) => {
    const preset = timePresets.find((p) => p.label === presetLabel);
    if (!preset) return;
    const nextRanges = group.ranges.map((r, i) =>
      i === rangeIndex ? { start: preset.start, end: preset.end } : r
    );
    commitGroup(group, group.days, nextRanges);
  };

  const addRangeToGroup = (group: MultiRangeScheduleGroup) => {
    commitGroup(group, group.days, [...group.ranges, pickUnusedRange(group.ranges)]);
  };

  const removeRangeFromGroup = (group: MultiRangeScheduleGroup, rangeIndex: number) => {
    if (group.ranges.length <= 1) return;
    commitGroup(
      group,
      group.days,
      group.ranges.filter((_, i) => i !== rangeIndex)
    );
  };

  const deleteScheduleGroup = (group: MultiRangeScheduleGroup) => {
    onChange({
      ...data,
      schedules: (data.schedules || []).filter((s) => !group.days.includes(s.day)),
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
                  <h3 className="text-xl font-bold text-white">{t('gigCreation.schedule.workSchedule')}</h3>
                  <p className="text-white/80 text-sm">Define working days and hours</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Schedule Groups</span>
                  <span className="bg-harx-100 text-harx-800 text-xs font-semibold px-2 py-1 rounded-full">
                    {scheduleGroups.length}
                  </span>
                </div>
                {freeDays.length > 0 && (
                  <button
                    onClick={addNewScheduleGroup}
                    className="flex items-center gap-2 px-3 py-2 bg-harx-500 text-white rounded-lg hover:bg-harx-600 transition-colors text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    {t('gigCreation.schedule.addSchedule')}
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 mb-4">
                Pick days for a group, then add several time ranges inside
              </p>

              {scheduleGroups.length > 0 ? (
                <div className="space-y-4">
                  {scheduleGroups.map((group, groupIndex) => (
                    <div
                      key={`sched-group-${group.days.slice().sort().join('-') || groupIndex}`}
                      className="bg-gradient-to-br from-harx-50 to-harx-alt-50 rounded-xl p-4 border-2 border-harx-100 shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-semibold text-harx-700">
                          {group.ranges
                            .map((r) => `${formatTime24(r.start)}–${formatTime24(r.end)}`)
                            .join(" · ")}
                        </h4>
                        <button
                          onClick={() => deleteScheduleGroup(group)}
                          className="p-1 text-red-500 hover:text-white hover:bg-red-500 rounded-md transition-all"
                          title="Delete schedule group"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Days Selection — exclusive across groups */}
                      <div className="mb-4">
                        <label className="block text-xs font-medium text-gray-700 mb-2">{t('gigCreation.schedule.workingDays')}</label>
                        <div className="grid grid-cols-7 gap-1">
                          {allWeekDays.map((day) => {
                            const isSelected = group.days.includes(day);
                            const isInOtherGroup = !isSelected && usedDays.has(day);
                            return (
                              <button
                                key={day}
                                type="button"
                                onClick={() => handleDayToggle(group, day)}
                                disabled={isInOtherGroup}
                                title={
                                  isInOtherGroup
                                    ? `${day} is already selected in another schedule group`
                                    : undefined
                                }
                                className={`px-2 py-1 text-xs font-medium rounded-md transition-all ${
                                  isSelected
                                    ? "bg-harx-500 text-white"
                                    : isInOtherGroup
                                      ? "bg-gray-50 text-gray-400 cursor-not-allowed border border-gray-100"
                                      : "bg-white text-gray-600 border border-gray-200 hover:bg-harx-50 hover:border-harx-300"
                                }`}
                              >
                                {dayDisplay(day, true)}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Multiple time ranges — compact */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-medium text-gray-700">
                            Time ranges
                          </label>
                          <button
                            type="button"
                            onClick={() => addRangeToGroup(group)}
                            className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-harx-700 bg-white border border-harx-200 rounded-md hover:bg-harx-50"
                          >
                            <Plus className="w-3 h-3" />
                            {t('gigCreation.nav.add')}
                          </button>
                        </div>

                        <div className="space-y-1.5">
                          {(() => {
                            const conflicts = findOverlappingRangeIndexes(group.ranges);
                            return (
                              <>
                                {group.ranges.map((range, rangeIndex) => {
                                  const hasConflict = conflicts.has(rangeIndex);
                                  const inputCls = hasConflict
                                    ? "flex-1 min-w-0 px-2 py-1.5 text-sm bg-white border-2 border-red-400 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-400"
                                    : "flex-1 min-w-0 px-2 py-1.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-harx-400";
                                  return (
                                    <div
                                      key={`range-${groupIndex}-${rangeIndex}`}
                                      className="flex items-center gap-2"
                                    >
                                      <input
                                        type="time"
                                        value={range.start}
                                        onChange={(e) =>
                                          handleRangeChange(group, rangeIndex, "start", e.target.value)
                                        }
                                        className={inputCls}
                                        aria-label="Start"
                                      />
                                      <span className="text-xs text-gray-400 shrink-0">→</span>
                                      <input
                                        type="time"
                                        value={range.end}
                                        onChange={(e) =>
                                          handleRangeChange(group, rangeIndex, "end", e.target.value)
                                        }
                                        className={inputCls}
                                        aria-label="End"
                                      />
                                      <button
                                        type="button"
                                        disabled={group.ranges.length <= 1}
                                        onClick={() => removeRangeFromGroup(group, rangeIndex)}
                                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md disabled:opacity-25 disabled:cursor-not-allowed shrink-0"
                                        title="Remove range"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  );
                                })}
                                {conflicts.size > 0 && (
                                  <p className="text-[11px] font-medium text-red-600 bg-red-50 border border-red-100 rounded-md px-2 py-1.5">
                                    Overlapping time ranges — adjust so plages do not overlap (e.g. 08:00–12:00 and 13:00–18:00).
                                  </p>
                                )}
                              </>
                            );
                          })()}
                        </div>

                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {timePresets.map((preset) => (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() =>
                                handlePresetClick(group, group.ranges.length - 1, preset.label)
                              }
                              className="px-1.5 py-0.5 text-[10px] font-medium bg-white border border-gray-200 text-gray-600 rounded hover:border-harx-300 hover:text-harx-700"
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
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
                  <h3 className="text-xl font-bold text-white">{t('gigCreation.schedule.minimumHours')}</h3>
                  <p className="text-white/80 text-sm">Set minimum working hour requirements</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('gigCreation.schedule.dailyHours')}</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('gigCreation.schedule.weeklyHours')}</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('gigCreation.schedule.monthlyHours')}</label>
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
                  <h3 className="text-xl font-bold text-white">{t('gigCreation.schedule.timeZone')}</h3>
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
                  <h3 className="text-xl font-bold text-white">{t('gigCreation.schedule.flexibility')}</h3>
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

          {/* Navigation Buttons (wizard only) */}
          {!hideNavigation && (
            <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
              <div className="flex items-center gap-3">
                <button
                  onClick={onPrevious}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                >
                  <ArrowLeft className="w-5 h-5" />
                  {t('gigCreation.nav.previous')}
                </button>
              </div>
              <button
                onClick={onNext}
                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-harx-500 text-white hover:bg-harx-600 shadow-md hover:shadow-lg transition-all"
              >
                {t('gigCreation.nav.next')}
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
