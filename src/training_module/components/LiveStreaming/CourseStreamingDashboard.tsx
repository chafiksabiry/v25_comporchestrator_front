import React, { useState } from 'react';
import { Play, Calendar, Users, Video, BarChart3, Clock, Eye, MessageSquare, TrendingUp, Settings, Plus, CreditCard as Edit, Trash2, BookOpen, Award, Target, Zap, CheckCircle, AlertTriangle, Presentation, Monitor, Mic, Camera } from 'lucide-react';
import { LiveStreamSession, StreamAnalytics, TrainingModule } from '../../types';

interface CourseStreamingDashboardProps {
  sessions: LiveStreamSession[];
  courses: TrainingModule[];
  onCreateCourseStream: (courseId: string) => void;
  onEditSession: (session: LiveStreamSession) => void;
  onDeleteSession: (sessionId: string) => void;
  onStartCourseStream: (sessionId: string, courseId: string) => void;
}

export default function CourseStreamingDashboard({ 
  sessions, 
  courses,
  onCreateCourseStream, 
  onEditSession, 
  onDeleteSession, 
  onStartCourseStream 
}: CourseStreamingDashboardProps) {
  const [activeTab, setActiveTab] = useState('courses');
  const [selectedCourse, setSelectedCourse] = useState<TrainingModule | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const upcomingSessions = sessions.filter(s => s.status === 'scheduled');
  const liveSessions = sessions.filter(s => s.status === 'live');
  const completedSessions = sessions.filter(s => s.status === 'ended');

  const tabs = [
    { id: 'courses', label: 'Available Courses', count: courses.length },
    { id: 'upcoming', label: 'Upcoming Streams', count: upcomingSessions.length },
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

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderCoursesTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Available Training Courses</h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Create Course Stream</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => (
          <div key={course.id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5 text-blue-500" />
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(course.difficulty)}`}>
                  {course.difficulty}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <Video className="h-4 w-4 text-red-500" />
                <Zap className="h-4 w-4 text-purple-500" />
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">{course.title}</h3>
            <p className="text-gray-600 text-sm mb-4">{course.description}</p>

            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">{course.duration}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Target className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">{course.content.length} modules</span>
              </div>
              <div className="flex items-center space-x-2">
                <Award className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">{course.assessments.length} assessments</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">Interactive</span>
              </div>
            </div>

            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Topics Covered:</h4>
              <div className="flex flex-wrap gap-1">
                {course.topics.slice(0, 3).map((topic, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                  >
                    {topic}
                  </span>
                ))}
                {course.topics.length > 3 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                    +{course.topics.length - 3} more
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => onCreateCourseStream(course.id)}
                className="w-full flex items-center justify-center space-x-2 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                <Video className="h-4 w-4" />
                <span>Start Live Course</span>
              </button>
              <button
                onClick={() => setSelectedCourse(course)}
                className="w-full flex items-center justify-center space-x-2 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Eye className="h-4 w-4" />
                <span>Preview Course</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSessionsTab = () => (
    <div className="space-y-4">
      {getSessionsByTab().length === 0 ? (
        <div className="text-center py-12">
          <Video className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No {activeTab} sessions found.</p>
          <p className="text-sm text-gray-400">Create a course stream to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {getSessionsByTab().map((session) => (
            <div key={session.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Video className="h-5 w-5 text-blue-500" />
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                    {session.status === 'live' ? 'LIVE COURSE' : session.status.toUpperCase()}
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
                    onClick={() => onStartCourseStream(session.id, 'course-1')}
                    className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium"
                  >
                    Start Course Stream
                  </button>
                )}
                
                {session.status === 'live' && (
                  <button className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium">
                    Join Live Course
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
  );

  const renderAnalyticsTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Course Streaming Analytics</h3>
      
      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Total Course Streams</h4>
          <div className="text-2xl font-bold text-blue-600">{sessions.length}</div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <h4 className="font-medium text-green-900 mb-2">Average Completion Rate</h4>
          <div className="text-2xl font-bold text-green-600">
            {Math.round(
              completedSessions.reduce((sum, s) => sum + s.analytics.engagementRate, 0) / 
              completedSessions.length || 0
            )}%
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <h4 className="font-medium text-purple-900 mb-2">Total Participants</h4>
          <div className="text-2xl font-bold text-purple-600">
            {sessions.reduce((sum, s) => sum + s.analytics.totalViewers, 0)}
          </div>
        </div>

        <div className="bg-amber-50 rounded-lg p-4">
          <h4 className="font-medium text-amber-900 mb-2">Avg Session Duration</h4>
          <div className="text-2xl font-bold text-amber-600">
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
      </div>

      {/* Course Performance */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="font-medium text-gray-900 mb-4">Course Performance</h4>
        <div className="space-y-4">
          {courses.map((course) => {
            const courseSessions = sessions.filter(s => s.title.includes(course.title));
            const avgEngagement = courseSessions.length > 0 
              ? Math.round(courseSessions.reduce((sum, s) => sum + s.analytics.engagementRate, 0) / courseSessions.length)
              : 0;
            
            return (
              <div key={course.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-medium text-gray-900">{course.title}</h5>
                  <span className="text-sm text-gray-600">{courseSessions.length} streams</span>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Engagement:</span>
                    <div className="font-medium">{avgEngagement}%</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Completion:</span>
                    <div className="font-medium">{Math.round(course.progress)}%</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Difficulty:</span>
                    <div className="font-medium capitalize">{course.difficulty}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Course Streaming Dashboard</h1>
          <p className="text-gray-600">Stream live training courses with interactive features</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            <Settings className="h-4 w-4" />
            <span>Stream Settings</span>
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Available Courses</p>
              <p className="text-3xl font-bold text-gray-900">{courses.length}</p>
            </div>
            <BookOpen className="h-10 w-10 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Live Courses</p>
              <p className="text-3xl font-bold text-red-600">{liveSessions.length}</p>
            </div>
            <Video className="h-10 w-10 text-red-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Participants</p>
              <p className="text-3xl font-bold text-gray-900">
                {sessions.reduce((sum, s) => sum + s.analytics.totalViewers, 0)}
              </p>
            </div>
            <Users className="h-10 w-10 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Engagement</p>
              <p className="text-3xl font-bold text-gray-900">
                {Math.round(sessions.reduce((sum, s) => sum + s.analytics.engagementRate, 0) / sessions.length || 0)}%
              </p>
            </div>
            <TrendingUp className="h-10 w-10 text-purple-500" />
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
          {activeTab === 'courses' && renderCoursesTab()}
          {activeTab === 'analytics' ? renderAnalyticsTab() : renderSessionsTab()}
        </div>
      </div>

      {/* Course Preview Modal */}
      {selectedCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">{selectedCourse.title}</h3>
                <button
                  onClick={() => setSelectedCourse(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Course Overview</h4>
                  <p className="text-gray-600 mb-4">{selectedCourse.description}</p>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Duration:</span>
                      <span className="font-medium">{selectedCourse.duration}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Difficulty:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(selectedCourse.difficulty)}`}>
                        {selectedCourse.difficulty}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Modules:</span>
                      <span className="font-medium">{selectedCourse.content.length}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Learning Objectives</h4>
                  <ul className="space-y-1">
                    {selectedCourse.learningObjectives.map((objective, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-start space-x-2">
                        <Target className="h-3 w-3 text-blue-500 mt-1 flex-shrink-0" />
                        <span>{objective}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">Course Content</h4>
                <div className="space-y-2">
                  {selectedCourse.content.map((content, index) => (
                    <div key={content.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{content.title}</div>
                        <div className="text-sm text-gray-600">{content.duration} min • {content.type}</div>
                      </div>
                      {content.type === 'video' && <Video className="h-4 w-4 text-red-500" />}
                      {content.type === 'interactive' && <Zap className="h-4 w-4 text-purple-500" />}
                      {content.type === 'quiz' && <CheckSquare className="h-4 w-4 text-blue-500" />}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => {
                    onCreateCourseStream(selectedCourse.id);
                    setSelectedCourse(null);
                  }}
                  className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Start Live Course Stream
                </button>
                <button
                  onClick={() => setSelectedCourse(null)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Course Stream Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Create Course Stream</h3>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Course
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="">Choose a course to stream...</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title} ({course.duration})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stream Title
                  </label>
                  <input
                    type="text"
                    placeholder="Live Course: Advanced Customer Success"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Scheduled Start
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="date"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                      type="time"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Participants
                  </label>
                  <input
                    type="number"
                    defaultValue={50}
                    min={1}
                    max={500}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Stream Features</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-sm text-gray-700">Enable chat</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-sm text-gray-700">Record session</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-sm text-gray-700">Enable polls</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-sm text-gray-700">Whiteboard</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-sm text-gray-700">Screen sharing</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-sm text-gray-700">AI transcription</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex space-x-4 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    // Create new course stream
                  }}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Create Stream
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}