import React, { useState, useEffect } from "react";
import { 
  Clock, 
  Sunrise, 
  Sunset, 
  Sun, 
  Moon, 
  Plus, 
  Trash2, 
  ArrowLeft, 
  ArrowRight, 
  Calendar, 
  Loader2,
} from "lucide-react";
import { DaySchedule, GroupedSchedule } from "../lib/scheduleUtils";
import { fetchAllTimezones as fetchAllTimezonesNew } from "../lib/api";

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

const workingDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const flexibilityOptions = [
  'Remote Work Available', 'Flexible Hours', 'Weekend Rotation', 
  'Night Shift Available', 'Split Shifts', 'Part-Time Options', 
  'Compressed Work Week', 'Shift Swapping Allowed'
];

const allWeekDays = [
  "Monday",
  "Tuesday", 
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// Group schedules by identical hours
const groupSchedulesByHours = (schedules: DaySchedule[]): GroupedSchedule[] => {
  const groups: Record<string, GroupedSchedule> = {};
  schedules.forEach((schedule) => {
    const key = `${schedule.hours.start}-${schedule.hours.end}`;
    if (!groups[key]) {
      groups[key] = { hours: { ...schedule.hours }, days: [] };
    }
    groups[key].days.push(schedule.day);
  });
  return Object.values(groups);
};

const getUnusedDay = (schedules: DaySchedule[]): string | undefined => {
  const used = schedules.map((s) => s.day);
  return allWeekDays.find((d) => !used.includes(d));
};


const ScheduleSection = (props: ScheduleSectionProps) => {
  // Use flat schedules as source of truth
  const [schedules, setSchedules] = useState<DaySchedule[]>(props.data.schedules);
  // Track empty groups that haven't been populated yet
  const [emptyGroups, setEmptyGroups] = useState<Array<{id: string, hours: {start: string, end: string}}>>([]);

  // Timezone states
  const [availableTimezones, setAvailableTimezones] = useState<any[]>([]);
  const [timezoneLoading, setTimezoneLoading] = useState(false);
  const [timezonesLoaded, setTimezonesLoaded] = useState(false);
  const [timezoneSearch, setTimezoneSearch] = useState("");

  useEffect(() => {
    props.onChange({ ...props.data, schedules });
  }, [schedules]);

  // Fetch all available timezones
  useEffect(() => {
    const fetchTimezones = async () => {
      setTimezoneLoading(true);
      try {
        // Always use all timezones from the new API
        const timezoneData = await fetchAllTimezonesNew();
        const processedTimezones = timezoneData
          .map(tz => ({
            _id: tz._id,
            name: tz.zoneName,
            offset: tz.gmtOffset / 3600,
            abbreviation: tz.zoneName.split('/').pop() || '',
            countryName: tz.countryName
          }))
          .sort((a, b) => a.offset - b.offset);
        setAvailableTimezones(processedTimezones);
        
        // Only set default timezone if no timezone is currently set
        // Don't override user's selection or existing timezone
        if (processedTimezones.length > 0 && !props.data.time_zone) {
          console.log('🕐 TIMEZONE - Setting default timezone to first available:', processedTimezones[0]._id);
          props.onChange({ ...props.data, time_zone: processedTimezones[0]._id });
        } else if (props.data.time_zone) {
          console.log('🕐 TIMEZONE - Keeping existing timezone:', props.data.time_zone);
        }
      } catch (error) {
        setAvailableTimezones([]);
      } finally {
        setTimezoneLoading(false);
        setTimezonesLoaded(true);
      }
    };
    fetchTimezones();
  }, []);

  // Group for display
  const groupedSchedules = groupSchedulesByHours(schedules);
  // Vérifier si tous les jours sont déjà sélectionnés
  const selectedDays = schedules.map(schedule => schedule.day);
  const allDaysSelected = allWeekDays.every(day => selectedDays.includes(day));
  // Toggle a day in/out of a group
  const handleDayToggle = (day: string, groupHours: { start: string; end: string }, groupId?: string) => {
    if (groupId && groupId.startsWith('empty_')) {
      // This is an empty group, add the day to schedules and remove from empty groups
      setSchedules((prev) => [...prev, { day, hours: groupHours }]);
      setEmptyGroups((prev) => prev.filter(g => g.id !== groupId));
    } else {
      // Normal group logic
      setSchedules((prev) => {
        const idx = prev.findIndex((s) => s.day === day);
        if (idx > -1) {
          // If same hours, remove; else, update hours
          if (
            prev[idx].hours.start === groupHours.start &&
            prev[idx].hours.end === groupHours.end
          ) {
            return prev.filter((s, i) => i !== idx);
          } else {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], hours: { ...groupHours } };
            return updated;
          }
        } else {
          // Add new day with these hours
          return [...prev, { day, hours: { ...groupHours } }];
        }
      });
    }
  };
  // Change hours for all days in a group
  const handleHoursChange = (group: GroupedSchedule, field: "start" | "end", value: string) => {
    setSchedules((prev) =>
      prev.map((s) =>
        group.days.includes(s.day)
          ? { ...s, hours: { ...s.hours, [field]: value } }
          : s
      )
    );
  };
  // Rename this function to avoid conflict
  const handleMinimumHoursChange = (field: 'daily' | 'weekly' | 'monthly', value: string) => {
    props.onChange({
      ...props.data,
      minimumHours: { ...props.data.minimumHours, [field]: value ? parseInt(value, 10) : undefined }
    });
  };
  // Preset buttons
  const handlePresetClick = (group: GroupedSchedule, preset: string) => {
    let newHours;
    switch (preset) {
      case "9-5":
        newHours = { start: "09:00", end: "17:00" };
        break;
      case "Early":
        newHours = { start: "07:00", end: "15:00" };
        break;
      case "Late":
        newHours = { start: "11:00", end: "19:00" };
        break;
      case "Evening":
        newHours = { start: "13:00", end: "21:00" };
        break;
      default:
        newHours = group.hours;
    }
    setSchedules((prev) =>
      prev.map((s) =>
        group.days.includes(s.day)
          ? { ...s, hours: { ...newHours } }
          : s
      )
    );
  };
  const handleTimezoneChange = (value: string | React.ChangeEvent<HTMLSelectElement>) => {
    const timezoneValue = typeof value === 'string' ? value : value.target.value;
    
        if (timezoneValue) {
      // Find the selected timezone to get the _id
      const selectedTimezone = filteredTimezones.find(tz => tz._id === timezoneValue);
      if (selectedTimezone) {
        props.onChange({ ...props.data, time_zone: selectedTimezone._id });
      } else {
        props.onChange({ ...props.data, time_zone: timezoneValue }); // Fallback to string
      }
    } else {
      props.onChange({ ...props.data, time_zone: undefined });
    }
  };
  // Filter timezones based on search
  const filteredTimezones = availableTimezones.filter(tz =>
    tz.name && tz._id && (
      tz.name.toLowerCase().includes(timezoneSearch.toLowerCase()) ||
      tz.countryName?.toLowerCase().includes(timezoneSearch.toLowerCase())
    )
  );

  const handleFlexibilityChange = (option: string) => {
    const newFlexibility = props.data.flexibility.includes(option)
      ? props.data.flexibility.filter((o: string) => o !== option)
      : [...props.data.flexibility, option];
    props.onChange({ ...props.data, flexibility: newFlexibility });
  };
  const formatTime = (time: string): string => {
    if (!time) return "Invalid Time";
    const [hour, minute] = time.split(":");
    if (isNaN(parseInt(hour)) || isNaN(parseInt(minute))) return "Invalid Time";
    return `${hour}h${minute}`;
  };
  // Add a new group with an unused day
  const handleAddScheduleGroup = () => {
    // Get all existing hours from grouped schedules
    const existingHours = groupedSchedules.map(group => `${group.hours.start}-${group.hours.end}`);
        // Define possible default hours
    const possibleDefaults = [
      { start: "09:00", end: "17:00" },
      { start: "08:00", end: "16:00" },
      { start: "10:00", end: "18:00" },
      { start: "07:00", end: "15:00" },
      { start: "11:00", end: "19:00" },
      { start: "12:00", end: "20:00" },
      { start: "06:00", end: "14:00" },
      { start: "13:00", end: "21:00" }
    ];
        // Find the first default that doesn't conflict with existing hours
    let defaultHours = possibleDefaults[0]; // fallback
    for (const hours of possibleDefaults) {
      const hoursString = `${hours.start}-${hours.end}`;
      if (!existingHours.includes(hoursString)) {
        defaultHours = hours;
        break;
      }
    }
        const emptyGroupId = `empty_${Date.now()}`;
        setEmptyGroups((prev) => [
      ...prev,
      { id: emptyGroupId, hours: defaultHours },
    ]);
  };
  // Remove a group (remove all its days)
  const handleRemoveScheduleGroup = (group: GroupedSchedule) => {
    setSchedules((prev) => prev.filter((s) => !group.days.includes(s.day)));
  };
  // Sécurise time_zone pour l'affichage
  const timeZone = props.data.time_zone;
  // Get readable name for selected time zone
  const selectedTimezoneObj = availableTimezones.find(tz => tz._id === timeZone);
  const selectedTimezoneName = selectedTimezoneObj ? `${selectedTimezoneObj.name} (GMT${selectedTimezoneObj.offset >= 0 ? '+' : ''}${selectedTimezoneObj.offset})` : timeZone;

  console.log('🕒 SCHEDULE SECTION - Rendering ScheduleSection component');
  console.log('🕒 SCHEDULE SECTION - props.data.schedule----:', props);
  console.log('🕒 SCHEDULE SECTION - props.data:', props.data);
  console.log('🕒 SCHEDULE SECTION - schedules:', props.data.schedules);
  console.log('🕒 SCHEDULE SECTION - minimumHours:', props.data.minimumHours);
  console.log('🕒 SCHEDULE SECTION - time_zone:', props.data.time_zone);
  console.log('🕒 SCHEDULE SECTION - flexibility:', props.data.flexibility);
  console.log('🕒 SCHEDULE SECTION - destination_zone:', props.destination_zone);
  console.log('🕒 SCHEDULE SECTION - groupedSchedules:', groupedSchedules);
  console.log('🕒 SCHEDULE SECTION - emptyGroups:', emptyGroups);
  console.log('🕒 SCHEDULE SECTION - availableTimezones:', availableTimezones);
  console.log('🕒 SCHEDULE SECTION - timezoneLoading:', timezoneLoading);
  console.log('🕒 SCHEDULE SECTION - timezonesLoaded:', timezonesLoaded);
  console.log('🕒 SCHEDULE SECTION - selectedTimezoneObj:', selectedTimezoneObj);
  console.log('🕒 SCHEDULE SECTION - selectedTimezoneName:', selectedTimezoneName);
  
  return (
    <div className="w-full bg-white py-6">
      
      <div className="space-y-4">
        {/* Display normal groups */}
        {groupedSchedules.map((group, index) => (
          <div key={index} className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm relative">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-800 flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-blue-500" />
                Working Days
              </h4>
              <button
                onClick={() => handleRemoveScheduleGroup(group)}
                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete schedule group"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex gap-1 flex-wrap border-b border-gray-200 pb-2 mb-3">
                  {workingDays.map((day: string) => {
                    const isSelected = group.days.includes(day);
                    const isInOtherGroup = !isSelected && schedules.some(s => s.day === day);
                    return (
                      <button
                        key={day}
                        onClick={() => handleDayToggle(day, group.hours)}
                        disabled={isInOtherGroup}
                        className={`rounded-full px-4 py-1.5 font-semibold text-sm transition-all duration-200 shadow-sm
                          ${isSelected ? 'bg-blue-600 text-white shadow' : isInOtherGroup ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-700'}
                        `}
                        title={isInOtherGroup ? `${day} is already selected in another schedule group` : undefined}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-gray-500" />
                  Working Hours
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500 flex items-center">
                      <Sunrise className="w-3 h-3 mr-1 text-gray-400" />
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={group.hours.start}
                      onChange={(e) => handleHoursChange(group, 'start', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500 flex items-center">
                      <Sunset className="w-3 h-3 mr-1 text-gray-400" />
                      End Time
                    </label>
                    <input
                      type="time"
                      value={group.hours.end}
                      onChange={(e) => handleHoursChange(group, 'end', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded-lg text-center font-semibold text-gray-800 text-sm">
                  {formatTime(group.hours.start)} - {formatTime(group.hours.end)}
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <button onClick={() => handlePresetClick(group, '9-5')} className="p-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 hover:border-gray-300 flex flex-col items-center gap-1 transition-all">
                      <Sun className="w-4 h-4 text-orange-400"/>
                      <span className="text-xs font-medium">9-5</span>
                  </button>
                  <button onClick={() => handlePresetClick(group, 'Early')} className="p-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 hover:border-gray-300 flex flex-col items-center gap-1 transition-all">
                      <Sunrise className="w-4 h-4 text-yellow-400"/>
                      <span className="text-xs font-medium">Early</span>
                  </button>
                  <button onClick={() => handlePresetClick(group, 'Late')} className="p-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 hover:border-gray-300 flex flex-col items-center gap-1 transition-all">
                      <Clock className="w-4 h-4 text-sky-400"/>
                      <span className="text-xs font-medium">Late</span>
                  </button>
                  <button onClick={() => handlePresetClick(group, 'Evening')} className="p-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 hover:border-gray-300 flex flex-col items-center gap-1 transition-all">
                      <Moon className="w-4 h-4 text-indigo-400"/>
                      <span className="text-xs font-medium">Evening</span>
                  </button>
              </div>
            </div>
          </div>
        ))}
        {/* Display empty groups */}
        {emptyGroups.map((emptyGroup) => (
          <div key={emptyGroup.id} className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm relative">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-800 flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-blue-500" />
                Working Days (No days selected)
              </h4>
              <button
                onClick={() => setEmptyGroups(prev => prev.filter(g => g.id !== emptyGroup.id))}
                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete empty schedule group"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex gap-1">
                  {workingDays.map((day: string) => {
                    const isSelected = false; // Un groupe vide n'a pas de jour sélectionné
                    const isInOtherGroup = schedules.some(s => s.day === day);
                    return (
                      <button
                        key={day}
                        onClick={() => handleDayToggle(day, emptyGroup.hours, emptyGroup.id)}
                        disabled={isInOtherGroup}
                        className={`rounded-full px-4 py-1.5 font-semibold text-sm transition-all duration-200 shadow-sm
                          ${isSelected ? 'bg-blue-600 text-white shadow' : isInOtherGroup ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-700'}
                        `}
                        title={isInOtherGroup ? `${day} is already selected in another schedule group` : undefined}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-gray-500" />
                  Working Hours
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500 flex items-center">
                      <Sunrise className="w-3 h-3 mr-1 text-gray-400" />
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={emptyGroup.hours.start}
                      onChange={(e) => setEmptyGroups(prev => prev.map(g => g.id === emptyGroup.id ? {...g, hours: {...g.hours, start: e.target.value}} : g))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500 flex items-center">
                      <Sunset className="w-3 h-3 mr-1 text-gray-400" />
                      End Time
                    </label>
                    <input
                      type="time"
                      value={emptyGroup.hours.end}
                      onChange={(e) => setEmptyGroups(prev => prev.map(g => g.id === emptyGroup.id ? {...g, hours: {...g.hours, end: e.target.value}} : g))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded-lg text-center font-semibold text-gray-800 text-sm">
                  {formatTime(emptyGroup.hours.start)} - {formatTime(emptyGroup.hours.end)}
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-3">
                  <button onClick={() => setEmptyGroups(prev => prev.map(g => g.id === emptyGroup.id ? {...g, hours: {start: "09:00", end: "17:00"}} : g))} className="p-3 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 hover:border-gray-300 flex flex-col items-center gap-1.5 transition-all">
                      <Sun className="w-5 h-5 text-orange-400"/>
                      <span className="text-xs font-medium">9-5</span>
                  </button>
                  <button onClick={() => setEmptyGroups(prev => prev.map(g => g.id === emptyGroup.id ? {...g, hours: {start: "07:00", end: "15:00"}} : g))} className="p-3 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 hover:border-gray-300 flex flex-col items-center gap-1.5 transition-all">
                      <Sunrise className="w-5 h-5 text-yellow-400"/>
                      <span className="text-xs font-medium">Early</span>
                  </button>
                  <button onClick={() => setEmptyGroups(prev => prev.map(g => g.id === emptyGroup.id ? {...g, hours: {start: "11:00", end: "19:00"}} : g))} className="p-3 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 hover:border-gray-300 flex flex-col items-center gap-1.5 transition-all">
                      <Clock className="w-5 h-5 text-sky-400"/>
                      <span className="text-xs font-medium">Late</span>
                  </button>
                  <button onClick={() => setEmptyGroups(prev => prev.map(g => g.id === emptyGroup.id ? {...g, hours: {start: "13:00", end: "21:00"}} : g))} className="p-3 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 hover:border-gray-300 flex flex-col items-center gap-1.5 transition-all">
                      <Moon className="w-5 h-5 text-indigo-400"/>
                      <span className="text-xs font-medium">Evening</span>
                  </button>
              </div>
            </div>
          </div>
        ))}
        <div className="pt-4">
          {/* Afficher le bouton seulement si tous les jours ne sont pas sélectionnés ET qu'il n'y a pas de groupes vides */}
          {!allDaysSelected && emptyGroups.length === 0 && (
            <button
              onClick={handleAddScheduleGroup}
              className="w-full flex justify-center items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-blue-600 hover:bg-blue-50 hover:border-blue-400 transition-all duration-200"
            >
              <Plus className="w-5 h-5" />
              <span className="font-semibold text-sm">Add Schedule Group</span>
            </button>
          )}
          {/* Message quand tous les jours sont sélectionnés */}
          {allDaysSelected && (
            <div className="text-center p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-center justify-center space-x-2 text-green-700 mb-2">
                <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">✓</span>
                </div>
                <span className="font-semibold text-sm">All week days are scheduled!</span>
              </div>
              <p className="text-xs text-green-600">
                You can still modify existing schedules or remove days to add new groups.
              </p>
            </div>
          )}
        </div>
        {/* Minimum Hours, Timezones, and Flexibility Section */}
        <div className="space-y-8">
                    {/* Minimum Hours Requirements */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Clock className="w-5 h-5 text-orange-600" />
                </div>
                <h4 className="text-lg font-bold text-gray-800">Minimum Hours Requirements</h4>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6 border-2 border-orange-100">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-700 flex items-center">
                    <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                    Daily Hours
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="24"
                   value={props.data.minimumHours.daily || ''}
                   onChange={(e) => handleMinimumHoursChange('daily', e.target.value)}
                      placeholder="e.g. 8"
                      className="w-full p-4 pr-12 border-2 border-orange-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white transition-all duration-200 hover:border-orange-300"
                    />
                    <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-semibold text-sm">
                      hrs
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">Minimum hours per day</p>
              </div>

                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-700 flex items-center">
                    <span className="w-2 h-2 bg-amber-500 rounded-full mr-2"></span>
                    Weekly Hours
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="168"
                   value={props.data.minimumHours.weekly || ''}
                  onChange={(e) => handleMinimumHoursChange('weekly', e.target.value)}
                      placeholder="e.g. 40"
                      className="w-full p-4 pr-12 border-2 border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white transition-all duration-200 hover:border-amber-300"
                    />
                    <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-semibold text-sm">
                      hrs
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">Minimum hours per week</p>
              </div>

                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-700 flex items-center">
                    <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                    Monthly Hours
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="744"
                   value={props.data.minimumHours.monthly || ''}
                  onChange={(e) => handleMinimumHoursChange('monthly', e.target.value)}
                      placeholder="e.g. 160"
                      className="w-full p-4 pr-12 border-2 border-red-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white transition-all duration-200 hover:border-red-300"
                    />
                    <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-semibold text-sm">
                      hrs
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">Minimum hours per month</p>
                </div>
              </div>

              {/* Summary Card */}
              <div className="mt-6 p-4 bg-white rounded-lg border border-orange-200">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-orange-600">
                      {props.data.minimumHours.daily || 0}
                    </div>
                    <div className="text-xs text-gray-500">Daily</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-amber-600">
                      {props.data.minimumHours.weekly || 0}
                    </div>
                    <div className="text-xs text-gray-500">Weekly</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">
                      {props.data.minimumHours.monthly || 0}
                    </div>
                    <div className="text-xs text-gray-500">Monthly</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Time Zone */}
          <div className="mb-8 p-6 rounded-xl border border-green-200 bg-green-50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-green-500 text-white font-bold mr-3">TZ</div>
                <div>
                  <h4 className="text-xl font-bold text-green-900">Time Zone</h4>
                  {props.destination_zone && (
                  <p className="text-sm text-green-700">
                      Available timezones worldwide
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {timezoneLoading && (
                  <div className="flex items-center">
                    <Loader2 className="w-4 h-4 animate-spin text-green-600" />
                    <span className="text-sm text-green-600 ml-1">Loading...</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Search input */}
            {availableTimezones.length > 0 && (
              <div className="mb-3">
                <input
                  type="text"
                  placeholder="Search timezones by name, country, or abbreviation..."
                  value={timezoneSearch}
                  onChange={(e) => setTimezoneSearch(e.target.value)}
                  className="w-full p-3 rounded-lg border border-green-300 bg-white text-green-900 focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
            )}
            
            <select
              className="w-full p-3 rounded-lg border border-green-300 bg-white text-green-900 font-semibold focus:outline-none focus:ring-2 focus:ring-green-400 mb-2"
              value={props.data.time_zone || ''}
              onChange={handleTimezoneChange}
              disabled={timezoneLoading}
            >
              <option value="">Select a timezone...</option>
              {filteredTimezones.map((tz) => (
                <option key={tz._id} value={tz._id}>
                  {tz.name} {tz.countryName ? `- ${tz.countryName}` : ''} (GMT{tz.offset >= 0 ? '+' : ''}{tz.offset})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 italic text-center mt-2">
              {timezoneLoading 
                ? 'Loading timezones from API...'
                : availableTimezones.length > 0
                 ? timezoneSearch
                   ? `Showing ${filteredTimezones.length} of ${availableTimezones.length} timezones`
                  : `${availableTimezones.length} timezones available worldwide`
                  : 'No timezones available'
              }
            </p>
            {props.data.time_zone && (
              <p className="text-xs text-green-600 mt-1">
                Selected: <span className="font-semibold">{selectedTimezoneName}</span>
              </p>
            )}
          </div>

          {/* Schedule Flexibility */}
          <div className="mb-8 p-6 rounded-xl border border-purple-200 bg-purple-50">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 flex items-center justify-center rounded-full bg-purple-500 text-white font-bold mr-3">F</div>
              <h4 className="text-xl font-bold text-purple-900">Schedule Flexibility</h4>
              </div>
            {/* Badges sélectionnés */}
            <div className="flex flex-wrap gap-2 mb-4">
              {props.data.flexibility.map(option => (
                <span key={option} className="flex items-center bg-purple-100 text-purple-800 text-sm font-medium pl-3 pr-2 py-1 rounded-full">
                  {option}
                  <button
                    type="button"
                    onClick={() => handleFlexibilityChange(option)}
                    className="ml-2 text-purple-600 hover:text-purple-800 rounded-full focus:outline-none focus:bg-purple-200"
                    title="Remove"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </span>
              ))}
            </div>
            {/* Select pour ajouter */}
            <select
              className="w-full p-3 rounded-lg border border-purple-300 bg-white text-purple-900 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-400 mb-2"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  handleFlexibilityChange(e.target.value);
                  e.target.value = '';
                }
              }}
            >
              <option value="" disabled>Add flexibility option...</option>
              {flexibilityOptions.filter(opt => !props.data.flexibility.includes(opt)).map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 italic text-center mt-2">
              Select all applicable schedule flexibility options
            </p>
          </div>
        </div>
      </div>
      <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
        <div className="flex items-center gap-3">
          <button onClick={props.onPrevious} disabled={!props.onPrevious}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-gray-700 border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            <ArrowLeft className="w-5 h-5" />
            Previous
          </button>
        </div>
        <button onClick={props.onNext}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
          Next
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default ScheduleSection;
export { ScheduleSection }; 