import React, { useState } from 'react';
import { BarChart3, TrendingUp, Users, Award, DollarSign, Clock, Brain, Target } from 'lucide-react';
import { CompanyAnalytics as CompanyAnalyticsType } from '../../types';

interface CompanyAnalyticsProps {
  analytics: CompanyAnalyticsType;
}

export default function CompanyAnalytics({ analytics }: CompanyAnalyticsProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState('30d');
  const [selectedMetric, setSelectedMetric] = useState('completion');

  const timeframes = [
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' },
    { value: '1y', label: '1 Year' },
  ];

  const metrics = [
    { value: 'completion', label: 'Completion Rate', icon: Award },
    { value: 'engagement', label: 'Engagement', icon: Target },
    { value: 'time', label: 'Time to Completion', icon: Clock },
    { value: 'cost', label: 'Cost Analysis', icon: DollarSign },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Company Analytics</h1>
        <div className="flex items-center space-x-4">
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            {timeframes.map((tf) => (
              <option key={tf.value} value={tf.value}>{tf.label}</option>
            ))}
          </select>
          <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <BarChart3 className="h-4 w-4" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total REPs</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.totalReps}</p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
          <div className="mt-2">
            <span className="text-sm text-green-600">↑ 12% from last month</span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.onboardingInProgress}</p>
            </div>
            <Clock className="h-8 w-8 text-amber-500" />
          </div>
          <div className="mt-2">
            <span className="text-sm text-amber-600">↑ 5% from last month</span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Certification Rate</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.certificationRate}%</p>
            </div>
            <Award className="h-8 w-8 text-green-500" />
          </div>
          <div className="mt-2">
            <span className="text-sm text-green-600">↑ 8% from last month</span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Time to Complete</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.averageTimeToCompletion}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-500" />
          </div>
          <div className="mt-2">
            <span className="text-sm text-green-600">↓ 15% from last month</span>
          </div>
        </div>
      </div>

      {/* Charts and Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Skill Gap Analysis */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Skill Gap Analysis</h3>
          <div className="space-y-4">
            {analytics.skillGapAnalysis.map((skill, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">{skill.skill}</span>
                  <span className="text-sm text-gray-600">
                    {skill.currentLevel}/{skill.targetLevel}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${(skill.currentLevel / skill.targetLevel) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Current: {skill.currentLevel}</span>
                  <span>Gap: {skill.gap}</span>
                  <span>Target: {skill.targetLevel}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Department Performance */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Department Performance</h3>
          <div className="space-y-4">
            {analytics.departmentPerformance.map((dept, index) => (
              <div key={index} className="border border-gray-100 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{dept.department}</h4>
                  <span className="text-sm text-gray-600">{dept.completionRate}% complete</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Completion:</span>
                    <div className="font-medium">{dept.completionRate}%</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Avg Score:</span>
                    <div className="font-medium">{dept.averageScore}%</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Engagement:</span>
                    <div className="font-medium">{dept.engagementLevel}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Predictions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Brain className="h-5 w-5 text-blue-500" />
          <h3 className="text-lg font-semibold text-gray-900">AI Predictions & Insights</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Risk of Dropout */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-medium text-red-800 mb-2">At Risk of Dropout</h4>
            <div className="text-2xl font-bold text-red-600 mb-2">
              {analytics.aiPredictions.riskOfDropout.length}
            </div>
            <div className="space-y-1">
              {analytics.aiPredictions.riskOfDropout.slice(0, 3).map((rep, index) => (
                <div key={index} className="text-sm text-red-700">
                  {rep.name} - {rep.department}
                </div>
              ))}
            </div>
          </div>

          {/* High Potential */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-800 mb-2">High Potential</h4>
            <div className="text-2xl font-bold text-green-600 mb-2">
              {analytics.aiPredictions.highPotential.length}
            </div>
            <div className="space-y-1">
              {analytics.aiPredictions.highPotential.slice(0, 3).map((rep, index) => (
                <div key={index} className="text-sm text-green-700">
                  {rep.name} - {rep.department}
                </div>
              ))}
            </div>
          </div>

          {/* Resource Needs */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">Resource Needs</h4>
            <div className="space-y-2">
              {analytics.aiPredictions.resourceNeeds.map((need, index) => (
                <div key={index} className="text-sm text-blue-700 flex items-center space-x-2">
                  <Target className="h-3 w-3" />
                  <span>{need}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Cost Analysis */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Analysis & ROI</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              ${analytics.costAnalysis.trainingCostPerRep.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Cost per REP</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {analytics.costAnalysis.timeToProductivity}
            </div>
            <div className="text-sm text-gray-600">Time to Productivity</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">
              {analytics.costAnalysis.roi}%
            </div>
            <div className="text-sm text-gray-600">ROI</div>
          </div>
        </div>
      </div>
    </div>
  );
}