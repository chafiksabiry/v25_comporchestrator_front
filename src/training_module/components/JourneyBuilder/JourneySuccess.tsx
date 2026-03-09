import React, { useEffect } from 'react';
import { CheckCircle, Rocket, Users, BarChart3, Calendar, Bell, Eye, Download, Share2, Settings } from 'lucide-react';
import { TrainingJourney, TrainingModule, Rep } from '../../types';

interface JourneySuccessProps {
  journey: TrainingJourney;
  modules: TrainingModule[];
  enrolledReps: Rep[];
  onViewDashboard: () => void;
  onCreateAnother: () => void;
  onPreviewAsLearner?: () => void;
  onExportReport?: () => void;
  onShareJourney?: () => void;
  onJourneySettings?: () => void;
  onManageParticipants?: () => void;
  onSendReminder?: () => void;
}

export default function JourneySuccess({ 
  journey, 
  modules, 
  enrolledReps, 
  onViewDashboard, 
  onCreateAnother,
  onPreviewAsLearner,
  onExportReport,
  onShareJourney,
  onJourneySettings,
  onManageParticipants,
  onSendReminder
}: JourneySuccessProps) {
  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Ensure journey exists
  if (!journey) {
    return <div>Error: Journey data not available</div>;
  }

  const totalDuration = (modules || []).reduce((sum, module) => sum + (module.duration || 0), 0);
  const totalAssessments = (modules || []).reduce((sum, module) => sum + (module.assessments?.length || 0), 0);
  
  // Safe defaults for optional arrays - ensure they are always arrays
  const safeEnrolledReps = Array.isArray(enrolledReps) ? enrolledReps.filter(rep => rep != null && rep !== undefined) : [];
  const safeTargetRoles = Array.isArray(journey?.targetRoles) ? journey.targetRoles.filter(role => role != null && role !== undefined && typeof role === 'string') : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Success Animation */}
        <div className="text-center mb-8">
          <div className="relative inline-block">
            <div className="w-32 h-32 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl animate-pulse">
              <CheckCircle className="h-16 w-16 text-white" />
            </div>
            <div className="absolute -top-4 -right-4 w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center animate-bounce">
              <Rocket className="h-6 w-6 text-yellow-900" />
            </div>
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🎉 Training Journey Launched Successfully!
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Your AI-enhanced training program is now live and your team members have been enrolled. 
            They'll receive notifications and can start their learning journey immediately.
          </p>
        </div>

        {/* Launch Summary */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Launch Summary</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
              <Users className="h-10 w-10 text-blue-600 mx-auto mb-3" />
              <div className="text-2xl font-bold text-blue-600 mb-1">{safeEnrolledReps.length}</div>
              <div className="text-sm text-gray-600">Team Members Enrolled</div>
            </div>
            
            <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200">
              <Rocket className="h-10 w-10 text-purple-600 mx-auto mb-3" />
              <div className="text-2xl font-bold text-purple-600 mb-1">{(modules || []).length}</div>
              <div className="text-sm text-gray-600">Enhanced Modules</div>
            </div>
            
            <div className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
              <Calendar className="h-10 w-10 text-green-600 mx-auto mb-3" />
              <div className="text-2xl font-bold text-green-600 mb-1">{Math.round(totalDuration / 60)}h</div>
              <div className="text-sm text-gray-600">Total Training Hours</div>
            </div>
            
            <div className="text-center p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200">
              <BarChart3 className="h-10 w-10 text-amber-600 mx-auto mb-3" />
              <div className="text-2xl font-bold text-amber-600 mb-1">{totalAssessments}</div>
              <div className="text-sm text-gray-600">Assessments Created</div>
            </div>
          </div>

          {/* Journey Details */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{journey.name || journey.title || 'Untitled Journey'}</h3>
            <p className="text-gray-700 mb-4">{journey.description || 'No description available'}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Target Roles:</h4>
                <div className="flex flex-wrap gap-2">
                  {safeTargetRoles.length > 0 ? (
                    safeTargetRoles.map((role, index) => (
                      <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                        {role}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500">No target roles specified</span>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Enrolled Team Members:</h4>
                <div className="flex flex-wrap gap-2">
                  {safeEnrolledReps.length > 0 ? (
                    <>
                      {safeEnrolledReps.slice(0, 5).map((rep) => (
                        <span key={rep?.id || Math.random()} className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                          {rep?.name || 'Unknown'}
                        </span>
                      ))}
                      {safeEnrolledReps.length > 5 && (
                        <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                          +{safeEnrolledReps.length - 5} more
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-sm text-gray-500">No team members enrolled yet</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Notifications Sent */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-3">
              <Bell className="h-6 w-6 text-blue-600" />
              <h4 className="font-semibold text-blue-900">🔔 Deployment Notifications Sent</h4>
            </div>
            <p className="text-blue-700 mb-3">
              All enrolled team members have been notified via email and will see the comprehensive 360° training journey 
              in their dashboard with full methodology components activated.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-white rounded-lg">
                <div className="text-lg font-bold text-blue-600">{safeEnrolledReps.length}</div>
                <div className="text-xs text-gray-600">Email Notifications</div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg">
                <div className="text-lg font-bold text-blue-600">{safeEnrolledReps.length}</div>
                <div className="text-xs text-gray-600">Dashboard Updates</div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg">
                <div className="text-lg font-bold text-blue-600">360°</div>
                <div className="text-xs text-gray-600">Methodology Active</div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            onClick={onViewDashboard}
            className="flex items-center justify-center space-x-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-semibold text-lg shadow-lg hover:shadow-xl"
          >
            <BarChart3 className="h-6 w-6" />
            <span>View Training Dashboard</span>
          </button>
          
          <button
            onClick={onCreateAnother}
            className="flex items-center justify-center space-x-3 px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-semibold text-lg"
          >
            <Rocket className="h-6 w-6" />
            <span>Create Another Journey</span>
          </button>
        </div>

        {/* Additional Actions */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Manage Your Training Journey</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button 
              onClick={onPreviewAsLearner}
              className="flex items-center space-x-3 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Eye className="h-5 w-5" />
              <span>Preview as Learner</span>
            </button>
            
            <button 
              onClick={onExportReport}
              className="flex items-center space-x-3 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download className="h-5 w-5" />
              <span>Export Report</span>
            </button>
            
            <button 
              onClick={onShareJourney}
              className="flex items-center space-x-3 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Share2 className="h-5 w-5" />
              <span>Share Journey</span>
            </button>
            
            <button 
              onClick={onJourneySettings}
              className="flex items-center space-x-3 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Settings className="h-5 w-5" />
              <span>Journey Settings</span>
            </button>
            
            <button 
              onClick={onManageParticipants}
              className="flex items-center space-x-3 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Users className="h-5 w-5" />
              <span>Manage Participants</span>
            </button>
            
            <button 
              onClick={onSendReminder}
              className="flex items-center space-x-3 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Bell className="h-5 w-5" />
              <span>Send Reminder</span>
            </button>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6 text-center">
          <h3 className="text-lg font-semibold text-purple-900 mb-2">What's Next?</h3>
          <p className="text-purple-700 mb-4">
            Your team can now access their personalized training dashboard and begin their learning journey. 
            You can monitor progress, provide support, and track completion in real-time.
          </p>
          <div className="flex justify-center space-x-4">
            <div className="flex items-center space-x-2 text-purple-700">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Real-time progress tracking</span>
            </div>
            <div className="flex items-center space-x-2 text-purple-700">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">AI-powered insights</span>
            </div>
            <div className="flex items-center space-x-2 text-purple-700">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Automated certificates</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}