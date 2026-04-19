import React from 'react';
import {
  BarChart2,
  Users,
  MessageSquare,
  CheckCircle2,
  Clock,
  LineChart,
  PieChart,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

function AnalyticsPanel() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-100 rounded-lg">
              <BarChart2 className="w-6 h-6 text-rose-500" />
            </div>
            <h2 className="text-xl font-semibold">Analytics Overview</h2>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">
              Export
            </button>
            <button className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600">
              Generate Report
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-rose-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-rose-500" />
              <span className="font-medium">Total Users</span>
            </div>
            <div className="text-2xl font-bold">1,234</div>
            <div className="text-sm text-green-600 flex items-center gap-1">
              <ArrowUpRight className="w-4 h-4" />
              12% increase
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-5 h-5 text-green-600" />
              <span className="font-medium">Conversations</span>
            </div>
            <div className="text-2xl font-bold">856</div>
            <div className="text-sm text-green-600 flex items-center gap-1">
              <ArrowUpRight className="w-4 h-4" />
              8% increase
            </div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-purple-600" />
              <span className="font-medium">Resolution Rate</span>
            </div>
            <div className="text-2xl font-bold">94%</div>
            <div className="text-sm text-red-600 flex items-center gap-1">
              <ArrowDownRight className="w-4 h-4" />
              2% decrease
            </div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              <span className="font-medium">Avg. Response</span>
            </div>
            <div className="text-2xl font-bold">2.4h</div>
            <div className="text-sm text-green-600 flex items-center gap-1">
              <ArrowUpRight className="w-4 h-4" />
              5% improvement
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Traffic Overview</h3>
              <LineChart className="w-5 h-5 text-gray-400" />
            </div>
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
              {/* Chart would go here */}
              <span className="text-gray-400">Traffic chart visualization</span>
            </div>
          </div>
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Channel Distribution</h3>
              <PieChart className="w-5 h-5 text-gray-400" />
            </div>
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
              {/* Chart would go here */}
              <span className="text-gray-400">Distribution chart visualization</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsPanel;
