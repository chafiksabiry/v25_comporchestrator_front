import React from 'react';
import { CheckCircle, Clock, AlertCircle, TrendingUp } from 'lucide-react';

interface ProgressStats {
  completed: number;
  inProgress: number;
  pending: number;
  totalModules: number;
  overallProgress: number;
}

interface ProgressOverviewProps {
  stats: ProgressStats;
}

export default function ProgressOverview({ stats }: ProgressOverviewProps) {
  const progressPercentage = (stats.overallProgress / 100) * 100;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Your Progress</h2>
        <TrendingUp className="h-5 w-5 text-green-500" />
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Overall Completion</span>
          <span className="text-sm font-bold text-gray-900">{stats.overallProgress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          <div className="text-sm text-gray-600">Completed</div>
        </div>
        
        <div className="text-center p-4 bg-yellow-50 rounded-lg">
          <Clock className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
          <div className="text-sm text-gray-600">In Progress</div>
        </div>
        
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <AlertCircle className="h-8 w-8 text-gray-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-600">{stats.pending}</div>
          <div className="text-sm text-gray-600">Pending</div>
        </div>
      </div>

      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600">
          {stats.completed} of {stats.totalModules} modules completed
        </p>
      </div>
    </div>
  );
}