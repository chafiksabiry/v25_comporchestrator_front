import React, { useState } from 'react';
import { Play, Calendar, Users, Video, BarChart3, Clock, Eye, MessageSquare, TrendingUp, Settings, Plus, CreditCard as Edit, Trash2 } from 'lucide-react';
import { LiveStreamSession, StreamAnalytics } from '../../types';

interface StreamingDashboardProps {
  sessions: LiveStreamSession[];
  onCreateSession: () => void;
  onEditSession: (session: LiveStreamSession) => void;
  onDeleteSession: (sessionId: string) => void;
  onStartStream: (sessionId: string) => void;
}

export default function StreamingDashboard({ 
  sessions, 
  onCreateSession, 
  onEditSession, 
  onDeleteSession, 
  onStartStream 
}: StreamingDashboardProps) {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [selectedSession, setSelectedSession] = useState<LiveStreamSession | null>(null);

  const upcomingSessions = sessions.filter(s => s.status === 'scheduled');
  const liveSessions = sessions.filter(s => s.status === 'live');
  const completedSessions = sessions.filter(s => s.status === 'ended');

  const tabs = [
    { id: 'upcoming', label: 'Upcoming', count: upcomingSessions.length },
    { id: 'live', label: 'Live Now', count: liveSessions.length },
    { id: 'completed', label: 'Completed', count: completedSessions.length },
    { id: 'analytics', label: 'Analytics', count: 0 },
  ];

  const getSessionsByTab = () => {
    switch (activeTab) {
      case 'upcoming':
        return upcomingSessions;
      case 'live':
        return liveSessions;
      case 'completed':
        return completedSessions;
      default:
        return [];
    }
  };

  const formatDuration = (start: string, end: string) => {
    const startTime = new Date(start);
    const endTime = new Date(end);
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
    return `${duration} min`;
  };

  const getStatusColor = (status: LiveStreamSession['status']) => {
    switch (status) {
      case 'live':
        return 'bg-red-100 text-red-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'ended':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Live Streaming Dashboard</h1>
          <p className="text-gray-600">Manage and monitor your live training sessions</p>
        </div>
        <button
          onClick={onCreateSession}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>New Session</span>
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Sessions</p>
              <p className="text-2xl font-bold text-gray-900">{sessions.length}</p>
            </div>
            <Video className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Live Now</p>
              <p className="text-2xl font-bold text-red-600">{liveSessions.length}</p>
            </div>
            <Play className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Viewers</p>
              <p className="text-2xl font-bold text-gray-900">
                {sessions.reduce((sum, s) => sum + s.analytics.totalViewers, 0)}
              </p>
            </div>
            <Eye className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Engagement</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(sessions.reduce((sum, s) => sum + s.analytics.engagementRate, 0) / sessions.length || 0)}%
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'analytics' ? (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Streaming Analytics</h3>
              
              {/* Analytics Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Average Session Duration</h4>
                  <div className="text-2xl font-bold text-blue-600">
                    {Math.round(
                      completedSessions.reduce((sum, s) => {
                        if (s.actualStart && s.actualEnd) {
                          return sum + (new Date(s.actualEnd).getTime() - new Date(s.actualStart).getTime()) / (1000 * 60);
                        }
                        return sum;
                      }, 0) / completedSessions.length || 0
                    )} min
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-medium text-green-900 mb-2">Peak Concurrent Viewers</h4>
                  <div className="text-2xl font-bold text-green-600">
                    {Math.max(...sessions.map(s => s.analytics.peakViewers), 0)}
                  </div>
                </div>

                <div className="bg-purple-50 rounded-lg p-4">
                  <h4 className="font-medium text-purple-900 mb-2">Chat Messages</h4>
                  <div className="text-2xl font-bold text-purple-600">
                    {sessions.reduce((sum, s) => sum + s.chatMessages.length, 0)}
                  </div>
                </div>
              </div>

              {/* Detailed Analytics */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Session Performance</h4>
                {completedSessions.map((session) => (
                  <div key={session.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-medium text-gray-900">{session.title}</h5>
                      <span className="text-sm text-gray-500">
                        {new Date(session.scheduledStart).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Total Viewers:</span>
                        <div className="font-medium">{session.analytics.totalViewers}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Peak Viewers:</span>
                        <div className="font-medium">{session.analytics.peakViewers}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Avg Watch Time:</span>
                        <div className="font-medium">{Math.round(session.analytics.averageViewTime)} min</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Engagement:</span>
                        <div className="font-medium">{session.analytics.engagementRate}%</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {getSessionsByTab().length === 0 ? (
                <div className="text-center py-12">
                  <Video className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No {activeTab} sessions found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {getSessionsByTab().map((session) => (
                    <div key={session.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-sm transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <Video className="h-5 w-5 text-blue-500" />
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                            {session.status === 'live' ? 'LIVE' : session.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => onEditSession(session)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onDeleteSession(session.id)}
                            className="text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{session.title}</h3>
                      <p className="text-gray-600 text-sm mb-4">{session.description}</p>

                      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">
                            {new Date(session.scheduledStart).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">
                            {new Date(session.scheduledStart).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">
                            {session.participants.length}/{session.maxParticipants}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <MessageSquare className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">
                            {session.chatMessages.length} messages
                          </span>
                        </div>
                      </div>

                      {session.status === 'ended' && (
                        <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
                          <div className="text-center p-2 bg-blue-50 rounded">
                            <div className="font-medium text-blue-600">{session.analytics.totalViewers}</div>
                            <div className="text-gray-600">Viewers</div>
                          </div>
                          <div className="text-center p-2 bg-green-50 rounded">
                            <div className="font-medium text-green-600">{session.analytics.engagementRate}%</div>
                            <div className="text-gray-600">Engagement</div>
                          </div>
                          <div className="text-center p-2 bg-purple-50 rounded">
                            <div className="font-medium text-purple-600">{Math.round(session.analytics.averageViewTime)}</div>
                            <div className="text-gray-600">Avg Time</div>
                          </div>
                        </div>
                      )}

                      <div className="flex space-x-2">
                        {session.status === 'scheduled' && (
                          <button
                            onClick={() => onStartStream(session.id)}
                            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                          >
                            Start Stream
                          </button>
                        )}
                        
                        {session.status === 'live' && (
                          <button className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium">
                            Join Live
                          </button>
                        )}
                        
                        {session.status === 'ended' && session.recordingUrl && (
                          <button className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors font-medium">
                            View Recording
                          </button>
                        )}
                        
                        <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                          <BarChart3 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}