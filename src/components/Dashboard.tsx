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
        <h1 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Smart Orchestrator Dashboard</h1>
        <div className="flex space-x-3">
          <button className="rounded-xl bg-white border border-harx-100 px-6 py-2.5 text-harx-600 font-black text-xs uppercase tracking-widest hover:bg-harx-50 transition-all shadow-sm">
            New Profile
          </button>
          <button className="rounded-xl bg-gradient-harx px-6 py-2.5 text-white font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-harx-500/20">
            New Gig
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Active Profiles', value: '248', icon: <Users className="h-6 w-6" />, trend: '+12%', subtext: 'vs last month' },
          { label: 'Active Gigs', value: '156', icon: <Briefcase className="h-6 w-6" />, trend: '+8%', subtext: 'vs last month' },
          { label: 'Successful Matches', value: '89', icon: <ArrowRightLeft className="h-6 w-6" />, trend: '+15%', subtext: 'vs last month' },
          { label: 'Pending Approvals', value: '24', icon: <Clock className="h-6 w-6" />, trend: null, subtext: 'Requires attention' }
        ].map((stat, i) => (
          <div key={i} className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 group hover:border-harx-100 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
                <p className="text-3xl font-black text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className="rounded-xl bg-harx-50 p-3 text-harx-600 group-hover:scale-110 transition-transform">
                {stat.icon}
              </div>
            </div>
            <div className="flex items-center text-[10px] font-black uppercase tracking-widest">
              {stat.trend && <TrendingUp className="h-3 w-3 text-green-500 mr-1" />}
              <span className={stat.trend ? "text-green-500" : "text-harx-500"}>{stat.trend || "Action Required"}</span>
              <span className="ml-1.5 text-gray-400 font-bold">{stat.subtext}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="rounded-[2rem] bg-white p-8 border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-harx-50/30 blur-3xl rounded-full -mr-16 -mt-16" />
        <h2 className="mb-8 text-xl font-black text-gray-900 uppercase tracking-tight relative z-10">Intelligence Stream</h2>
        <div className="space-y-6 relative z-10">
          {[
            {
              icon: <UserCircle className="h-5 w-5 text-harx-600" />,
              title: "Profile Synchronized",
              description: "John Smith's neuro-profile was automatically generated",
              time: "10m ago"
            },
            {
              icon: <Briefcase className="h-5 w-5 text-harx-600" />,
              title: "Gig Deployment",
              description: "Web Development Project for XYZ Corp is now live",
              time: "1h ago"
            },
            {
              icon: <ArrowRightLeft className="h-5 w-5 text-harx-600" />,
              title: "Algorithm Match",
              description: "5 HARX REPS matched with Digital Marketing Campaign",
              time: "2h ago"
            },
            {
              icon: <CheckCircle className="h-5 w-5 text-harx-600" />,
              title: "Strategic Approval",
              description: "Mobile App Development for ABC Inc validated",
              time: "3h ago"
            }
          ].map((item, index) => (
            <div key={index} className="flex items-start space-x-4 group/item">
              <div className="mt-1 p-2 rounded-xl bg-harx-50 group-hover/item:bg-harx-100 transition-colors">{item.icon}</div>
              <div className="flex-1">
                <p className="font-black text-gray-900 text-sm tracking-tight">{item.title}</p>
                <p className="text-xs text-gray-500 font-medium leading-relaxed uppercase tracking-tighter opacity-80 mt-0.5">{item.description}</p>
              </div>
              <p className="text-[10px] font-black text-gray-300 uppercase italic">{item.time}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { icon: <UserCircle className="h-6 w-6" />, title: "Profile Unit", description: "Neuro-profile generation" },
          { icon: <Briefcase className="h-6 w-6" />, title: "Gig Forge", description: "Optimization engine" },
          { icon: <ArrowRightLeft className="h-6 w-6" />, title: "Match Matrix", description: "Algorithmic pairing" },
          { icon: <CheckCircle className="h-6 w-6" />, title: "Validator", description: "Publishing & compliance" },
          { icon: <BarChart2 className="h-6 w-6" />, title: "Growth Lab", description: "Performance scaling" }
        ].map((item, index) => (
          <div key={index} className="flex flex-col items-center rounded-2xl bg-white p-6 text-center border border-gray-100 shadow-sm hover:border-harx-200 hover:shadow-xl hover:shadow-harx-500/5 hover:-translate-y-1 cursor-pointer transition-all group">
            <div className="mb-4 rounded-xl bg-harx-50 p-4 text-harx-600 group-hover:bg-gradient-harx group-hover:text-white transition-all">
              {item.icon}
            </div>
            <h3 className="mb-1 font-black text-gray-900 text-xs uppercase tracking-widest">{item.title}</h3>
            <p className="text-[10px] text-gray-400 font-bold leading-tight opacity-0 group-hover:opacity-100 transition-opacity">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;