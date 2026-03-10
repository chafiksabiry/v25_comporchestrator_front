import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, AlertTriangle, Award, Calendar, Brain, Target, MessageSquare, Loader2 } from 'lucide-react';
import { TrainerDashboard as TrainerDashboardType, Rep, AIInsight } from '../../types';
import { JourneyService } from '../../infrastructure/services/JourneyService';
import { OnboardingService } from '../../infrastructure/services/OnboardingService';
import Cookies from 'js-cookie';

interface TrainerDashboardProps {
  dashboard?: TrainerDashboardType;
  onTraineeSelect: (trainee: Rep) => void;
  companyId?: string;
  gigId?: string;
}

export default function TrainerDashboard({ dashboard: propDashboard, onTraineeSelect, companyId, gigId }: TrainerDashboardProps) {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [dashboard, setDashboard] = useState<TrainerDashboardType | null>(null);
  const [journeys, setJourneys] = useState<any[]>([]);
  const [gigMap, setGigMap] = useState<Map<string, string>>(new Map()); // Map gigId -> gigTitle
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Always fetch from API - ignore propDashboard to use real data
    // If you need to use mock data for testing, pass it as propDashboard
    // but by default we fetch from API
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError(null);

        const effectiveCompanyId = companyId || Cookies.get('companyId');
        console.log('[TrainerDashboard] Fetching dashboard with:', {
          companyId: effectiveCompanyId,
          gigId
        });

        if (!effectiveCompanyId) {
          throw new Error('Company ID is required');
        }

        // Fetch gigs to create a map of gigId -> gigTitle
        try {
          const gigsResponse = await OnboardingService.fetchGigsByCompany(effectiveCompanyId);
          if (gigsResponse.data && gigsResponse.data.length > 0) {
            const gigMap = new Map<string, string>();
            gigsResponse.data.forEach((gig: any) => {
              if (gig._id && gig.title) {
                gigMap.set(gig._id, gig.title);
              }
            });
            setGigMap(gigMap);
            console.log('[TrainerDashboard] Loaded gig map:', gigMap.size, 'gigs');
          }
        } catch (err) {
          console.warn('[TrainerDashboard] Could not fetch gigs:', err);
          // Continue even if gigs fetch fails
        }

        // Fetch journeys using the new endpoints
        let journeysResponse;
        if (gigId) {
          console.log('[TrainerDashboard] Fetching journeys by company and gig');
          journeysResponse = await JourneyService.getJourneysByCompanyAndGig(effectiveCompanyId, gigId);
        } else {
          console.log('[TrainerDashboard] Fetching journeys by company');
          journeysResponse = await JourneyService.getJourneysByCompany(effectiveCompanyId);
        }

        if (journeysResponse.success && journeysResponse.data) {
          setJourneys((journeysResponse.data || []).filter((j: any) => j != null));
          console.log('[TrainerDashboard] Found journeys:', journeysResponse.data.length);
        } else {
          setJourneys([]);
          console.log('[TrainerDashboard] No journeys found');
        }

        // Fetch dashboard statistics
        const response = await JourneyService.getTrainerDashboard(effectiveCompanyId, gigId);
        console.log('[TrainerDashboard] API Response:', response);

        // The response structure is: {success: true, data: {...}}
        const dashboardData = response.success ? response.data : response;

        if (response.success && dashboardData) {
          // Map backend DTO to frontend type
          const mappedDashboard: TrainerDashboardType = {
            totalTrainees: dashboardData.totalTrainees || 0,
            activeTrainees: dashboardData.activeTrainees || 0,
            completionRate: Math.round(dashboardData.completionRate || 0),
            averageEngagement: Math.round(dashboardData.averageEngagement || 0),
            topPerformers: (dashboardData.topPerformers || [])
              .filter((tp: any) => tp != null)
              .map((tp: any) => ({
                id: tp.id,
                name: tp.name || 'Unknown',
                email: tp.email,
                role: 'trainee' as const,
                department: tp.department,
                enrolledJourneys: [],
                progress: []
              })),
            strugglingTrainees: (dashboardData.strugglingTrainees || [])
              .filter((st: any) => st != null)
              .map((st: any) => ({
                id: st.id,
                name: st.name || 'Unknown',
                email: st.email,
                role: 'trainee' as const,
                department: st.department,
                enrolledJourneys: [],
                progress: []
              })),
            aiInsights: (dashboardData.aiInsights || []).filter((i: any) => i != null).map((insight: any) => ({
              id: insight.id,
              title: insight.title,
              description: insight.description,
              priority: insight.priority as 'high' | 'medium' | 'low',
              suggestedActions: insight.suggestedActions || []
            })),
            upcomingDeadlines: (dashboardData.upcomingDeadlines || []).filter((d: any) => d != null).map((deadline: any) => ({
              traineeId: deadline.traineeId,
              traineeName: deadline.traineeName,
              task: deadline.task,
              dueDate: deadline.dueDate,
              riskLevel: deadline.riskLevel as 'low' | 'medium' | 'high'
            }))
          };

          console.log('[TrainerDashboard] Mapped dashboard:', mappedDashboard);
          setDashboard(mappedDashboard);
        } else {
          throw new Error(response.error || 'Failed to load dashboard');
        }
      } catch (err: any) {
        console.error('[TrainerDashboard] Error fetching dashboard:', err);
        const errorMessage = err?.message || err?.response?.data?.error || 'Failed to load dashboard data';
        setError(errorMessage);
        // Set empty dashboard to prevent blank screen
        setDashboard({
          totalTrainees: 0,
          activeTrainees: 0,
          completionRate: 0,
          averageEngagement: 0,
          topPerformers: [],
          strugglingTrainees: [],
          aiInsights: [],
          upcomingDeadlines: []
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [companyId, gigId]); // Removed propDashboard to always fetch from API

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'trainees', label: 'Trainees', icon: Users },
    { id: 'journeys', label: 'Journeys', icon: Target },
    { id: 'insights', label: 'AI Insights', icon: Brain },
    { id: 'deadlines', label: 'Deadlines', icon: Calendar },
  ];

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'text-red-600 bg-red-100';
      case 'medium':
        return 'text-amber-600 bg-amber-100';
      case 'low':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-3 text-gray-600">Loading dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-gray-600">No dashboard data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Trainer Dashboard</h1>
        <div className="flex items-center space-x-4">
          <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <MessageSquare className="h-4 w-4" />
            <span>Broadcast Message</span>
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Trainees</p>
              <p className="text-2xl font-bold text-gray-900">{dashboard.totalTrainees}</p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Trainees</p>
              <p className="text-2xl font-bold text-gray-900">{dashboard.activeTrainees}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completion Rate</p>
              <p className="text-2xl font-bold text-gray-900">{dashboard.completionRate}%</p>
            </div>
            <Award className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Engagement</p>
              <p className="text-2xl font-bold text-gray-900">{dashboard.averageEngagement}%</p>
            </div>
            <Target className="h-8 w-8 text-amber-500" />
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors ${selectedTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {selectedTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Performers */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performers</h3>
                <div className="space-y-3">
                  {dashboard.topPerformers.map((trainee, index) => (
                    <div
                      key={trainee.id}
                      className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
                      onClick={() => onTraineeSelect(trainee)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{trainee.name}</p>
                          <p className="text-sm text-gray-600">{trainee.department}</p>
                        </div>
                      </div>
                      <Award className="h-5 w-5 text-green-500" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Struggling Trainees */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Needs Attention</h3>
                <div className="space-y-3">
                  {dashboard.strugglingTrainees.map((trainee) => (
                    <div
                      key={trainee.id}
                      className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg cursor-pointer hover:bg-amber-100 transition-colors"
                      onClick={() => onTraineeSelect(trainee)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
                          <AlertTriangle className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{trainee.name}</p>
                          <p className="text-sm text-gray-600">{trainee.department}</p>
                        </div>
                      </div>
                      <button className="text-sm text-amber-600 hover:text-amber-700 font-medium">
                        Assist
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {selectedTab === 'trainees' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">All Trainees</h3>
                <div className="flex items-center space-x-2">
                  <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option>All Departments</option>
                    <option>Customer Success</option>
                    <option>Sales</option>
                    <option>Support</option>
                  </select>
                  <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option>All Status</option>
                    <option>Active</option>
                    <option>Struggling</option>
                    <option>Completed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dashboard.topPerformers.length === 0 && dashboard.strugglingTrainees.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    No trainees found
                  </div>
                ) : (
                  [...dashboard.topPerformers, ...dashboard.strugglingTrainees].map((trainee) => (
                    <div
                      key={trainee.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow cursor-pointer"
                      onClick={() => onTraineeSelect(trainee)}
                    >
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                          {trainee.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{trainee.name}</p>
                          <p className="text-sm text-gray-600">{trainee.department}</p>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Progress:</span>
                          <span className="font-medium">N/A</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Engagement:</span>
                          <span className="font-medium">N/A</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Last Active:</span>
                          <span className="font-medium">Never</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {selectedTab === 'journeys' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Training Journeys</h3>
                <span className="text-sm text-gray-600">
                  {journeys.length} {journeys.length === 1 ? 'journey' : 'journeys'} found
                  {gigId && ` for this gig`}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {journeys.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    No training journeys found
                    {gigId ? ' for this gig' : ' for this company'}
                  </div>
                ) : (
                  journeys.map((journey: any) => (
                    <div
                      key={journey.id || journey._id}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">
                            {journey.title || journey.name || 'Untitled Journey'}
                          </h4>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {journey.description || 'No description'}
                          </p>
                        </div>
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${journey.status === 'active' ? 'bg-green-100 text-green-700' :
                          journey.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                            journey.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                              'bg-amber-100 text-amber-700'
                          }`}>
                          {journey.status || 'unknown'}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm">
                        {journey.industryTitle && (
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-600">Industry:</span>
                            <span className="font-medium text-gray-900">{journey.industryTitle}</span>
                          </div>
                        )}
                        {/* Don't display industry ID - only show if we have the title */}
                        {journey.modules && (
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-600">Modules:</span>
                            <span className="font-medium text-gray-900">{journey.modules.length}</span>
                          </div>
                        )}
                        {journey.enrolledRepIds && (
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-600">Enrolled:</span>
                            <span className="font-medium text-gray-900">{journey.enrolledRepIds.length} trainees</span>
                          </div>
                        )}
                        {journey.gigTitle && (
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-600">Gig:</span>
                            <span className="font-medium text-gray-900 text-sm">{journey.gigTitle}</span>
                          </div>
                        )}
                        {!journey.gigTitle && journey.gigId && (
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-600">Gig ID:</span>
                            <span className="font-medium text-gray-900 text-xs truncate">{journey.gigId}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {selectedTab === 'insights' && (
            <div className="space-y-4">
              {dashboard.aiInsights.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No AI insights available at this time
                </div>
              ) : (
                dashboard.aiInsights.map((insight) => (
                  <div
                    key={insight.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{insight.title}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${insight.priority === 'high' ? 'bg-red-100 text-red-700' :
                        insight.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                        {insight.priority}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-3">{insight.description}</p>
                    {insight.suggestedActions.length > 0 && (
                      <div className="space-y-1">
                        {insight.suggestedActions.map((action, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <Target className="h-3 w-3 text-gray-400" />
                            <span className="text-sm text-gray-600">{action}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {selectedTab === 'deadlines' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Upcoming Deadlines</h3>
              <div className="space-y-3">
                {dashboard.upcomingDeadlines.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No upcoming deadlines
                  </div>
                ) : (
                  dashboard.upcomingDeadlines.map((deadline, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${getRiskColor(deadline.riskLevel).replace('text-', 'bg-').replace('bg-', 'bg-').split(' ')[0]}`} />
                        <div>
                          <p className="font-medium text-gray-900">{deadline.traineeName}</p>
                          <p className="text-sm text-gray-600">{deadline.task}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">{deadline.dueDate}</p>
                        <span className={`text-xs px-2 py-1 rounded-full ${getRiskColor(deadline.riskLevel)}`}>
                          {deadline.riskLevel} risk
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}