import React from 'react';
import { 
  UserCircle, 
  Briefcase, 
  ArrowRightLeft, 
  CheckCircle, 
  BarChart2,
  TrendingUp,
  Users,
  Clock
} from 'lucide-react';

const Dashboard = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Smart Orchestrator Dashboard</h1>
        <div className="flex space-x-2">
          <button className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">
            New Profile
          </button>
          <button className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">
            New Gig
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Active Profiles</p>
              <p className="text-2xl font-semibold text-gray-900">248</p>
            </div>
            <div className="rounded-full bg-indigo-100 p-3 text-indigo-600">
              <Users className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="ml-1 text-green-500">12% increase</span>
            <span className="ml-1 text-gray-500">from last month</span>
          </div>
        </div>

        <div className="rounded-lg bg-white p-4 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Active Gigs</p>
              <p className="text-2xl font-semibold text-gray-900">156</p>
            </div>
            <div className="rounded-full bg-indigo-100 p-3 text-indigo-600">
              <Briefcase className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="ml-1 text-green-500">8% increase</span>
            <span className="ml-1 text-gray-500">from last month</span>
          </div>
        </div>

        <div className="rounded-lg bg-white p-4 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Successful Matches</p>
              <p className="text-2xl font-semibold text-gray-900">89</p>
            </div>
            <div className="rounded-full bg-indigo-100 p-3 text-indigo-600">
              <ArrowRightLeft className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="ml-1 text-green-500">15% increase</span>
            <span className="ml-1 text-gray-500">from last month</span>
          </div>
        </div>

        <div className="rounded-lg bg-white p-4 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Pending Approvals</p>
              <p className="text-2xl font-semibold text-gray-900">24</p>
            </div>
            <div className="rounded-full bg-indigo-100 p-3 text-indigo-600">
              <Clock className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-500">Requires attention</span>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Recent Activity</h2>
        <div className="space-y-4">
          {[
            {
              icon: <UserCircle className="h-5 w-5 text-indigo-600" />,
              title: "New profile created",
              description: "John Smith's profile was automatically generated",
              time: "10 minutes ago"
            },
            {
              icon: <Briefcase className="h-5 w-5 text-indigo-600" />,
              title: "Gig published",
              description: "Web Development Project for XYZ Corp",
              time: "1 hour ago"
            },
            {
              icon: <ArrowRightLeft className="h-5 w-5 text-indigo-600" />,
              title: "Match suggested",
              description: "5 HARX REPS matched with Digital Marketing Campaign",
              time: "2 hours ago"
            },
            {
              icon: <CheckCircle className="h-5 w-5 text-indigo-600" />,
              title: "Gig approved",
              description: "Mobile App Development for ABC Inc",
              time: "3 hours ago"
            },
            {
              icon: <BarChart2 className="h-5 w-5 text-indigo-600" />,
              title: "Optimization suggestion",
              description: "Improvements for Software Engineering gig description",
              time: "5 hours ago"
            }
          ].map((item, index) => (
            <div key={index} className="flex items-start space-x-3 border-b border-gray-100 pb-4 last:border-0 last:pb-0">
              <div className="mt-1">{item.icon}</div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{item.title}</p>
                <p className="text-sm text-gray-500">{item.description}</p>
              </div>
              <p className="text-xs text-gray-400">{item.time}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { icon: <UserCircle className="h-6 w-6" />, title: "Profile Creation", description: "Generate detailed HARX REP profiles" },
          { icon: <Briefcase className="h-6 w-6" />, title: "Gig Generation", description: "Create optimized gig listings" },
          { icon: <ArrowRightLeft className="h-6 w-6" />, title: "Matching", description: "Find the perfect HARX REP for each gig" },
          { icon: <CheckCircle className="h-6 w-6" />, title: "Approval & Publishing", description: "Review and publish gigs" },
          { icon: <BarChart2 className="h-6 w-6" />, title: "Optimization", description: "Improve performance of listings" }
        ].map((item, index) => (
          <div key={index} className="flex flex-col items-center rounded-lg bg-white p-6 text-center shadow hover:bg-indigo-50 cursor-pointer">
            <div className="mb-3 rounded-full bg-indigo-100 p-3 text-indigo-600">
              {item.icon}
            </div>
            <h3 className="mb-1 font-medium text-gray-900">{item.title}</h3>
            <p className="text-sm text-gray-500">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;