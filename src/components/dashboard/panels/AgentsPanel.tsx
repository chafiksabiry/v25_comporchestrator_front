import React, { useEffect, useState } from 'react';
import { 
  Users,
  Star,
  Globe,
  MoreVertical,
  UserPlus,
  Languages,
  Search,
  Filter,
  UserCheck
} from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ComponentType<any>;
  trend?: string;
  trendUp?: boolean;
  detail?: string | null;
}

function StatCard({ title, value, icon: Icon, trend, trendUp = true, detail = null }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-rose-50 rounded-lg">
            <Icon className="w-5 h-5 text-rose-500" />
          </div>
          <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        </div>
        {trend && (
          <span className={`flex items-center text-sm ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
            {trend}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {detail && <p className="mt-1 text-sm text-gray-500">{detail}</p>}
    </div>
  );
}

function AgentsPanel() {
  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agent Management</h1>
          <p className="text-gray-500">Monitor and manage your global workforce</p>
        </div>
        <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-rose-500 hover:bg-rose-600">
          <UserPlus className="w-4 h-4 mr-2" />
          Add New Agent
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { title: "Total Agents", value: "1,284", icon: Users, trend: "+85" },
          { title: "Active Now", value: "845", icon: UserCheck, trend: "+12" },
          { title: "Avg. Rating", value: "4.8", icon: Star, trend: "+0.2" },
          { title: "Languages", value: "12", icon: Languages, trend: "+2" }
        ].map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search agents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-rose-400 focus:border-rose-400"
                />
              </div>
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="border border-gray-300 rounded-md py-2 pl-3 pr-10 focus:ring-rose-400 focus:border-rose-400"
              >
                <option value="all">All Regions</option>
                <option value="na">North America</option>
                <option value="eu">Europe</option>
                <option value="asia">Asia</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <button className="p-2 text-gray-400 hover:text-gray-500">
                <Filter className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            {[
              {
                name: "Sarah Wilson",
                region: "North America",
                languages: ["English", "Spanish"],
                status: "active",
                calls: 145,
                rating: 4.9,
                revenue: "$4,520"
              },
              {
                name: "Michael Chen",
                region: "Asia",
                languages: ["English", "Mandarin"],
                status: "active",
                calls: 132,
                rating: 4.8,
                revenue: "$4,120"
              },
              {
                name: "Emma Thompson",
                region: "Europe",
                languages: ["English", "French", "German"],
                status: "break",
                calls: 128,
                rating: 4.7,
                revenue: "$3,840"
              }
            ].map((agent) => (
              <div key={agent.name} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center space-x-4">
                    <img
                      className="h-10 w-10 rounded-full"
                      src={`https://ui-avatars.com/api/?name=${agent.name.replace(' ', '+')}&background=indigo&color=fff`}
                      alt={agent.name}
                    />
                    <div>
                      <h3 className="font-medium">{agent.name}</h3>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Globe className="w-4 h-4" />
                        <span>{agent.region}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      agent.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                    }`}>
                      {agent.status}
                    </span>
                    <button className="text-gray-400 hover:text-gray-500">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Languages</p>
                    <p className="font-medium">{agent.languages.join(', ')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Calls Today</p>
                    <p className="font-medium">{agent.calls}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Rating</p>
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="ml-1 font-medium">{agent.rating}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Revenue</p>
                    <p className="font-medium text-green-600">{agent.revenue}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AgentsPanel;
