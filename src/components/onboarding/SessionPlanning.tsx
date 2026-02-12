import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Users,
  Phone,
  Mail,
  MessageSquare,
  Video,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  Globe,
  Filter,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  Settings,
  Save,
  Download,
  BarChart2,
  ArrowRight,
  MapPin,
  UserCheck
} from 'lucide-react';

const SessionPlanning = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedView, setSelectedView] = useState<'day' | 'week' | 'month'>('week');
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['voice', 'email', 'chat']);
  const [selectedReps, setSelectedReps] = useState<string[]>([]);

  const channels = [
    { id: 'voice', name: 'Voice Calls', icon: Phone },
    { id: 'email', name: 'Email Support', icon: Mail },
    { id: 'chat', name: 'Live Chat', icon: MessageSquare },
    { id: 'video', name: 'Video Calls', icon: Video },
    { id: 'facebook', name: 'Facebook', icon: Facebook },
    { id: 'twitter', name: 'Twitter', icon: Twitter },
    { id: 'instagram', name: 'Instagram', icon: Instagram },
    { id: 'linkedin', name: 'LinkedIn', icon: Linkedin },
    { id: 'youtube', name: 'YouTube', icon: Youtube }
  ];

  const reps = [
    {
      id: 1,
      name: 'John Smith',
      channels: ['voice', 'email'],
      availability: 'Full-time',
      timezone: 'EST',
      status: 'available'
    },
    {
      id: 2,
      name: 'Sarah Johnson',
      channels: ['chat', 'email', 'social'],
      availability: 'Part-time',
      timezone: 'PST',
      status: 'busy'
    },
    {
      id: 3,
      name: 'Michael Brown',
      channels: ['voice', 'video'],
      availability: 'Full-time',
      timezone: 'GMT',
      status: 'offline'
    }
  ];

  const sessions = [
    {
      id: 1,
      rep: 'John Smith',
      channel: 'voice',
      startTime: '09:00',
      endTime: '17:00',
      status: 'scheduled'
    },
    {
      id: 2,
      rep: 'Sarah Johnson',
      channel: 'chat',
      startTime: '12:00',
      endTime: '20:00',
      status: 'in-progress'
    },
    {
      id: 3,
      rep: 'Michael Brown',
      channel: 'video',
      startTime: '08:00',
      endTime: '16:00',
      status: 'completed'
    }
  ];

  const toggleChannel = (channelId: string) => {
    if (selectedChannels.includes(channelId)) {
      setSelectedChannels(selectedChannels.filter(id => id !== channelId));
    } else {
      setSelectedChannels([...selectedChannels, channelId]);
    }
  };

  const toggleRep = (repId: string) => {
    if (selectedReps.includes(repId)) {
      setSelectedReps(selectedReps.filter(id => id !== repId));
    } else {
      setSelectedReps([...selectedReps, repId]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Session Planning</h2>
          <p className="text-sm text-gray-500">Schedule and manage multi-channel support sessions</p>
        </div>
        <div className="flex space-x-3">
          <button className="flex items-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </button>
          <button className="flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
            <Plus className="mr-2 h-4 w-4" />
            New Session
          </button>
        </div>
      </div>

      {/* Calendar Controls */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              className="rounded-full p-2 hover:bg-gray-100"
              onClick={() => {
                const newDate = new Date(currentDate);
                newDate.setMonth(currentDate.getMonth() - 1);
                setCurrentDate(newDate);
              }}
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <h3 className="text-lg font-medium text-gray-900">
              {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h3>
            <button
              className="rounded-full p-2 hover:bg-gray-100"
              onClick={() => {
                const newDate = new Date(currentDate);
                newDate.setMonth(currentDate.getMonth() + 1);
                setCurrentDate(newDate);
              }}
            >
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex rounded-lg bg-gray-100 p-1">
              <button
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  selectedView === 'day'
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
                onClick={() => setSelectedView('day')}
              >
                Day
              </button>
              <button
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  selectedView === 'week'
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
                onClick={() => setSelectedView('week')}
              >
                Week
              </button>
              <button
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  selectedView === 'month'
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
                onClick={() => setSelectedView('month')}
              >
                Month
              </button>
            </div>
            <button className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
              Today
            </button>
          </div>
        </div>

        {/* Channel Filter */}
        <div className="mt-4 flex flex-wrap gap-2">
          {channels.map((channel) => {
            const Icon = channel.icon;
            const isSelected = selectedChannels.includes(channel.id);
            
            return (
              <button
                key={channel.id}
                className={`flex items-center rounded-full px-3 py-1.5 text-sm font-medium ${
                  isSelected
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => toggleChannel(channel.id)}
              >
                <Icon className="mr-1.5 h-4 w-4" />
                {channel.name}
              </button>
            );
          })}
        </div>

        {/* Calendar Grid */}
        <div className="mt-6 rounded-lg border border-gray-200">
          <div className="grid grid-cols-7 gap-px border-b border-gray-200 bg-gray-50 text-center text-xs font-medium text-gray-500">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="py-2">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px bg-gray-200">
            {Array.from({ length: 35 }).map((_, index) => (
              <div
                key={index}
                className="min-h-32 bg-white p-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">{index + 1}</span>
                  {index === 15 && (
                    <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700">
                      3 sessions
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="text-lg font-medium text-gray-900">Active Sessions</h3>
        <div className="mt-4 space-y-4">
          {sessions.map((session) => {
            const channel = channels.find(c => c.id === session.channel);
            const Icon = channel?.icon || Globe;
            
            return (
              <div
                key={session.id}
                className="rounded-lg border border-gray-200 p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`rounded-lg p-2 ${
                      session.status === 'scheduled' ? 'bg-blue-100 text-blue-600' :
                      session.status === 'in-progress' ? 'bg-green-100 text-green-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{session.rep}</h4>
                      <div className="mt-1 flex items-center space-x-2 text-sm text-gray-500">
                        <Clock className="h-4 w-4" />
                        <span>{session.startTime} - {session.endTime}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      session.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                      session.status === 'in-progress' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {session.status === 'scheduled' && <Clock className="mr-1 h-3 w-3" />}
                      {session.status === 'in-progress' && <CheckCircle className="mr-1 h-3 w-3" />}
                      {session.status === 'completed' && <CheckCircle className="mr-1 h-3 w-3" />}
                      {session.status}
                    </span>
                    <button className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* REP Availability */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="text-lg font-medium text-gray-900">REP Availability</h3>
        <div className="mt-4 space-y-4">
          {reps.map((rep) => (
            <div
              key={rep.id}
              className="rounded-lg border border-gray-200 p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 flex-shrink-0 rounded-full bg-indigo-100 flex items-center justify-center">
                    <Users className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{rep.name}</h4>
                    <div className="mt-1 flex items-center space-x-2 text-sm text-gray-500">
                      <MapPin className="h-4 w-4" />
                      <span>{rep.timezone}</span>
                      <span>•</span>
                      <span>{rep.availability}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex space-x-1">
                    {rep.channels.map((channelId) => {
                      const channel = channels.find(c => c.id === channelId);
                      if (!channel) return null;
                      const Icon = channel.icon;
                      return (
                        <div
                          key={channelId}
                          className="rounded-full bg-gray-100 p-1 text-gray-600"
                          title={channel.name}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                      );
                    })}
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    rep.status === 'available' ? 'bg-green-100 text-green-800' :
                    rep.status === 'busy' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {rep.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UserCheck className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Active REPS</p>
              <p className="text-lg font-semibold text-gray-900">12/15</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Scheduled Hours</p>
              <p className="text-lg font-semibold text-gray-900">156</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Globe className="h-6 w-6 text-indigo-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Active Channels</p>
              <p className="text-lg font-semibold text-gray-900">8/9</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BarChart2 className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Coverage Rate</p>
              <p className="text-lg font-semibold text-gray-900">94%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionPlanning;