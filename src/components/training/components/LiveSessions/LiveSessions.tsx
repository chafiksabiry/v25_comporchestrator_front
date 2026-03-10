import React from 'react';
import { Calendar, Clock, Users, Video, User } from 'lucide-react';
import { LiveSession } from '../../types';

interface LiveSessionsProps {
  sessions: LiveSession[];
}

export default function LiveSessions({ sessions }: LiveSessionsProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live':
        return 'bg-red-100 text-red-800';
      case 'upcoming':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getButtonStyle = (status: string, enrolled: number, capacity: number) => {
    if (status === 'live') {
      return 'bg-red-600 text-white hover:bg-red-700';
    }
    if (status === 'completed') {
      return 'bg-gray-100 text-gray-600 cursor-not-allowed';
    }
    if (enrolled >= capacity) {
      return 'bg-gray-100 text-gray-600 cursor-not-allowed';
    }
    return 'bg-blue-600 text-white hover:bg-blue-700';
  };

  const getButtonText = (status: string, enrolled: number, capacity: number) => {
    if (status === 'live') return 'Join Now';
    if (status === 'completed') return 'View Recording';
    if (enrolled >= capacity) return 'Fully Booked';
    return 'Enroll';
  };

  const upcomingSessions = sessions.filter(s => s.status === 'upcoming' || s.status === 'live');
  const completedSessions = sessions.filter(s => s.status === 'completed');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Live Training Sessions</h1>
        <div className="text-sm text-gray-600">
          {upcomingSessions.length} upcoming sessions
        </div>
      </div>

      {/* Upcoming Sessions */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Upcoming Sessions</h2>
        
        {upcomingSessions.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
            <Video className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No upcoming live sessions scheduled.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {upcomingSessions.map((session) => (
              <div
                key={session.id}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Video className="h-5 w-5 text-blue-500" />
                    <span className="text-sm font-medium text-blue-600">Live Session</span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                    {session.status === 'live' ? 'LIVE NOW' : 'Upcoming'}
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">{session.title}</h3>
                
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Instructor: {session.instructor}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">{session.date}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">{session.time} ({session.duration})</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">
                      {session.enrolled}/{session.capacity} participants
                    </span>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">Enrollment</span>
                    <span className="text-xs text-gray-600">
                      {Math.round((session.enrolled / session.capacity) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${(session.enrolled / session.capacity) * 100}%` }}
                    />
                  </div>
                </div>

                <button
                  disabled={session.status === 'completed' || session.enrolled >= session.capacity}
                  className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${getButtonStyle(
                    session.status,
                    session.enrolled,
                    session.capacity
                  )}`}
                >
                  {getButtonText(session.status, session.enrolled, session.capacity)}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed Sessions */}
      {completedSessions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Past Sessions</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {completedSessions.map((session) => (
              <div
                key={session.id}
                className="bg-gray-50 rounded-lg border border-gray-200 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Video className="h-5 w-5 text-gray-400" />
                    <span className="text-sm font-medium text-gray-500">Recorded Session</span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                    Completed
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-gray-700 mb-2">{session.title}</h3>
                
                <div className="space-y-1 mb-4 text-sm text-gray-600">
                  <div>Instructor: {session.instructor}</div>
                  <div>Date: {session.date}</div>
                  <div>Duration: {session.duration}</div>
                </div>

                <button className="w-full bg-gray-200 text-gray-700 hover:bg-gray-300 py-2 px-4 rounded-lg font-medium transition-colors">
                  View Recording
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}