import React, { useState } from 'react';
import { 
  Video, 
  Calendar, 
  Clock, 
  Users, 
  Play, 
  ArrowLeft,
  MessageSquare,
  Hand,
  Mic,
  MicOff,
  VideoOff,
  Settings,
  Eye,
  Award,
  BookOpen,
  Target,
  CheckCircle,
  TrendingUp,
  Bell,
  Star,
  Brain
} from 'lucide-react';
import { Rep, LiveSession } from '../../types';

interface TraineeLiveSessionProps {
  trainee: Rep;
  onBack: () => void;
}

export default function TraineeLiveSession({ trainee, onBack }: TraineeLiveSessionProps) {
  const [selectedSession, setSelectedSession] = useState<LiveSession | null>(null);
  const [isInSession, setIsInSession] = useState(false);

  // Mock live sessions for trainee
  const liveSessions: LiveSession[] = [
    {
      id: '1',
      title: 'Advanced Customer Success Strategies',
      instructor: 'Sarah Chen',
      date: 'Today',
      time: '2:00 PM EST',
      duration: '90 minutes',
      capacity: 20,
      enrolled: 18,
      status: 'live',
      type: 'workshop',
      recordingAvailable: true,
      interactionLevel: 85,
    },
    {
      id: '2',
      title: 'Health Insurance Regulations Deep Dive',
      instructor: 'Michael Rodriguez',
      date: 'Tomorrow',
      time: '10:00 AM EST',
      duration: '120 minutes',
      capacity: 25,
      enrolled: 22,
      status: 'upcoming',
      type: 'lecture',
      recordingAvailable: true,
      interactionLevel: 78,
    },
    {
      id: '3',
      title: 'Contact Centre Excellence Workshop',
      instructor: 'Lisa Park',
      date: 'Jan 26',
      time: '3:00 PM EST',
      duration: '60 minutes',
      capacity: 15,
      enrolled: 12,
      status: 'upcoming',
      type: 'simulation',
      recordingAvailable: false,
      interactionLevel: 92,
    },
    {
      id: '4',
      title: 'Customer Communication Masterclass',
      instructor: 'David Kim',
      date: 'Jan 20',
      time: '1:00 PM EST',
      duration: '75 minutes',
      capacity: 30,
      enrolled: 28,
      status: 'completed',
      type: 'workshop',
      recordingAvailable: true,
      aiTranscript: 'Full transcript available with AI highlights',
      aiSummary: 'Key takeaways: Active listening, empathy, clear communication',
      interactionLevel: 94,
      satisfactionScore: 4.8,
    }
  ];

  const upcomingSessions = liveSessions.filter(s => s.status === 'upcoming' || s.status === 'live');
  const completedSessions = liveSessions.filter(s => s.status === 'completed');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live':
        return 'bg-red-100 text-red-800 animate-pulse';
      case 'upcoming':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const joinSession = (session: LiveSession) => {
    setSelectedSession(session);
    setIsInSession(true);
  };

  const leaveSession = () => {
    setIsInSession(false);
    setSelectedSession(null);
  };

  if (isInSession && selectedSession) {
    return (
      <div className="h-screen bg-gray-900 flex flex-col">
        {/* Live Session Header */}
        <div className="bg-gray-800 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-white font-medium">{selectedSession.title}</span>
              <span className="text-red-400 text-sm">LIVE</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-white">
              <Eye className="h-4 w-4" />
              <span className="text-sm">{selectedSession.enrolled} participants</span>
            </div>
            <button
              onClick={leaveSession}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Leave Session
            </button>
          </div>
        </div>

        <div className="flex-1 flex">
          {/* Main Video Area */}
          <div className="flex-1 relative">
            <div className="w-full h-full bg-black flex items-center justify-center">
              <div className="text-center text-white">
                <Video className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-xl font-medium">{selectedSession.title}</p>
                <p className="text-gray-400">Live session with {selectedSession.instructor}</p>
              </div>
            </div>

            {/* Session Controls */}
            <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-75 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <button className="p-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors">
                    <Mic className="h-5 w-5" />
                  </button>
                  <button className="p-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors">
                    <Video className="h-5 w-5" />
                  </button>
                  <button className="p-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-500 transition-colors">
                    <Hand className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="flex items-center space-x-3">
                  <span className="text-white text-sm">Instructor: {selectedSession.instructor}</span>
                  <button className="p-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors">
                    <Settings className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Chat Sidebar */}
          <div className="w-80 bg-gray-800 flex flex-col">
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-white font-medium">Session Chat</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="text-sm">
                <div className="text-gray-400 text-xs mb-1">2:05 PM</div>
                <div className="text-white">Welcome everyone! Let's start with introductions.</div>
              </div>
              <div className="text-sm">
                <div className="text-gray-400 text-xs mb-1">2:06 PM</div>
                <div className="text-white">Great to be here! Looking forward to learning.</div>
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-700">
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  className="flex-1 bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center space-x-4 mb-8">
            <button
              onClick={onBack}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Live Training Sessions</h1>
              <p className="text-gray-600">Join interactive sessions with expert instructors</p>
            </div>
          </div>

          {/* Upcoming Sessions */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Upcoming & Live Sessions</h2>
            
            {upcomingSessions.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <Video className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No upcoming live sessions scheduled.</p>
                <p className="text-sm text-gray-400">Check back later for new sessions!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {upcomingSessions.map((session) => (
                  <div
                    key={session.id}
                    className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <Video className="h-5 w-5 text-blue-500" />
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                          {session.status === 'live' ? 'LIVE NOW' : 'Upcoming'}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">Interaction Level</div>
                        <div className="text-lg font-bold text-purple-600">{session.interactionLevel}%</div>
                      </div>
                    </div>

                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{session.title}</h3>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">Instructor: {session.instructor}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">{session.date}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">{session.time}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">{session.enrolled}/{session.capacity} enrolled</span>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Enrollment</span>
                        <span className="text-sm font-medium">{Math.round((session.enrolled / session.capacity) * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${(session.enrolled / session.capacity) * 100}%` }}
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => joinSession(session)}
                      disabled={session.status === 'upcoming'}
                      className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                        session.status === 'live'
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
                      }`}
                    >
                      {session.status === 'live' ? 'Join Live Session' : 'Scheduled for Later'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Completed Sessions */}
          {completedSessions.length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Past Sessions & Recordings</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {completedSessions.map((session) => (
                  <div
                    key={session.id}
                    className="bg-white rounded-xl border border-gray-200 p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <Video className="h-5 w-5 text-gray-400" />
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                          Recorded
                        </span>
                      </div>
                      {session.satisfactionScore && (
                        <div className="flex items-center space-x-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm font-medium">{session.satisfactionScore}/5.0</span>
                        </div>
                      )}
                    </div>

                    <h3 className="text-lg font-semibold text-gray-700 mb-2">{session.title}</h3>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4 text-sm text-gray-600">
                      <div>Instructor: {session.instructor}</div>
                      <div>Date: {session.date}</div>
                      <div>Duration: {session.duration}</div>
                      <div>Interaction: {session.interactionLevel}%</div>
                    </div>

                    {session.aiSummary && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <Brain className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-blue-900">AI Summary</span>
                        </div>
                        <p className="text-blue-800 text-sm">{session.aiSummary}</p>
                      </div>
                    )}

                    <div className="flex space-x-2">
                      <button className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors">
                        Watch Recording
                      </button>
                      {session.aiTranscript && (
                        <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                          <MessageSquare className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}