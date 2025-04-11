import React, { useState } from 'react';
import { 
  BarChart2, 
  TrendingUp, 
  TrendingDown, 
  Briefcase, 
  UserCircle, 
  ArrowRight, 
  Sparkles,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';

const Optimization = () => {
  const [expandedGig, setExpandedGig] = useState<number | null>(1);
  const [timeRange, setTimeRange] = useState('30d');

  const gigs = [
    { 
      id: 1, 
      title: 'Web Development Project', 
      client: 'XYZ Corp', 
      views: 245,
      applications: 18,
      conversionRate: '7.3%',
      trend: 'up',
      trendValue: '+12%',
      suggestions: [
        { type: 'high', text: 'Add more specific technical requirements to attract qualified candidates' },
        { type: 'medium', text: 'Include information about the development team structure' },
        { type: 'low', text: 'Consider increasing the budget range to attract more senior developers' }
      ]
    },
    { 
      id: 2, 
      title: 'Digital Marketing Campaign', 
      client: 'ABC Inc', 
      views: 187,
      applications: 9,
      conversionRate: '4.8%',
      trend: 'down',
      trendValue: '-5%',
      suggestions: [
        { type: 'high', text: 'Specify target audience demographics and platforms' },
        { type: 'high', text: 'Include examples of successful campaigns you admire' },
        { type: 'medium', text: 'Add KPIs and success metrics to the description' }
      ]
    },
    { 
      id: 3, 
      title: 'Mobile App Development', 
      client: 'Tech Startup', 
      views: 312,
      applications: 24,
      conversionRate: '7.7%',
      trend: 'up',
      trendValue: '+18%',
      suggestions: [
        { type: 'medium', text: 'Clarify whether this is for iOS, Android, or both platforms' },
        { type: 'low', text: "Add information about the app's target user base" }
      ]
    },
  ];

  const toggleGig = (id: number) => {
    setExpandedGig(expandedGig === id ? null : id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Optimization & Performance</h1>
        <div className="flex space-x-2">
          <select 
            className="rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>
          <button className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Gigs</p>
              <p className="text-2xl font-semibold text-gray-900">24</p>
            </div>
            <div className="rounded-full bg-indigo-100 p-3 text-indigo-600">
              <Briefcase className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="ml-1 text-green-500">+8%</span>
            <span className="ml-1 text-gray-500">from last period</span>
          </div>
        </div>

        <div className="rounded-lg bg-white p-4 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Views</p>
              <p className="text-2xl font-semibold text-gray-900">3,842</p>
            </div>
            <div className="rounded-full bg-indigo-100 p-3 text-indigo-600">
              <BarChart2 className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="ml-1 text-green-500">+15%</span>
            <span className="ml-1 text-gray-500">from last period</span>
          </div>
        </div>

        <div className="rounded-lg bg-white p-4 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Applications</p>
              <p className="text-2xl font-semibold text-gray-900">267</p>
            </div>
            <div className="rounded-full bg-indigo-100 p-3 text-indigo-600">
              <UserCircle className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="ml-1 text-green-500">+12%</span>
            <span className="ml-1 text-gray-500">from last period</span>
          </div>
        </div>

        <div className="rounded-lg bg-white p-4 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Avg. Conversion Rate</p>
              <p className="text-2xl font-semibold text-gray-900">6.9%</p>
            </div>
            <div className="rounded-full bg-indigo-100 p-3 text-indigo-600">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="ml-1 text-green-500">+2.1%</span>
            <span className="ml-1 text-gray-500">from last period</span>
          </div>
        </div>
      </div>

      {/* Performance Chart Placeholder */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Performance Trends</h2>
        <div className="h-64 rounded-lg bg-gray-100 flex items-center justify-center">
          <p className="text-gray-500">Performance chart visualization would appear here</p>
        </div>
        <div className="mt-4 flex justify-center space-x-4">
          <button className="rounded-full bg-indigo-100 px-4 py-1 text-sm font-medium text-indigo-700">Views</button>
          <button className="rounded-full px-4 py-1 text-sm font-medium text-gray-500 hover:bg-gray-100">Applications</button>
          <button className="rounded-full px-4 py-1 text-sm font-medium text-gray-500 hover:bg-gray-100">Conversion Rate</button>
          <button className="rounded-full px-4 py-1 text-sm font-medium text-gray-500 hover:bg-gray-100">Matches</button>
        </div>
      </div>

      {/* Gig Optimization */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Gig Optimization</h2>
        
        {gigs.map((gig) => (
          <div key={gig.id} className="rounded-lg bg-white shadow">
            <div 
              className="flex cursor-pointer items-center justify-between p-4"
              onClick={() => toggleGig(gig.id)}
            >
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 flex-shrink-0 rounded-full bg-indigo-100 flex items-center justify-center">
                  <Briefcase className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{gig.title}</h3>
                  <p className="text-sm text-gray-500">{gig.client}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{gig.conversionRate} conversion</p>
                  <div className="flex items-center justify-end">
                    {gig.trend === 'up' ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                    <span className={`ml-1 text-sm ${gig.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                      {gig.trendValue}
                    </span>
                  </div>
                </div>
                {expandedGig === gig.id ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </div>
            
            {expandedGig === gig.id && (
              <div className="border-t border-gray-200 p-4">
                <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs font-medium text-gray-500">Views</p>
                    <p className="text-lg font-semibold text-gray-900">{gig.views}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs font-medium text-gray-500">Applications</p>
                    <p className="text-lg font-semibold text-gray-900">{gig.applications}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs font-medium text-gray-500">Conversion Rate</p>
                    <p className="text-lg font-semibold text-gray-900">{gig.conversionRate}</p>
                  </div>
                </div>
                
                <div className="rounded-lg bg-indigo-50 p-4">
                  <div className="flex items-start">
                    <Sparkles className="mr-2 h-5 w-5 text-indigo-600" />
                    <div>
                      <h4 className="font-medium text-indigo-900">AI Optimization Suggestions</h4>
                      <ul className="mt-2 space-y-2">
                        {gig.suggestions.map((suggestion, index) => (
                          <li key={index} className="flex items-start">
                            {suggestion.type === 'high' ? (
                              <span className="mr-2 mt-0.5 h-2 w-2 rounded-full bg-red-500"></span>
                            ) : suggestion.type === 'medium' ? (
                              <span className="mr-2 mt-0.5 h-2 w-2 rounded-full bg-yellow-500"></span>
                            ) : (
                              <span className="mr-2 mt-0.5 h-2 w-2 rounded-full bg-green-500"></span>
                            )}
                            <span className="text-sm text-indigo-700">{suggestion.text}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-3 flex space-x-3">
                        <button className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
                          Apply All
                        </button>
                        <button className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-indigo-600 shadow-sm ring-1 ring-inset ring-indigo-300 hover:bg-indigo-50">
                          Review Individually
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Best Practices */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Best Practices</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-gray-200 p-4">
            <h3 className="flex items-center text-base font-medium text-gray-900">
              <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
              High-Converting Gig Elements
            </h3>
            <ul className="mt-2 space-y-2 pl-7">
              <li className="flex items-center text-sm text-gray-700">
                <ArrowRight className="mr-2 h-4 w-4 text-indigo-600" />
                Clear, specific titles that include key skills
              </li>
              <li className="flex items-center text-sm text-gray-700">
                <ArrowRight className="mr-2 h-4 w-4 text-indigo-600" />
                Detailed project scope with measurable deliverables
              </li>
              <li className="flex items-center text-sm text-gray-700">
                <ArrowRight className="mr-2 h-4 w-4 text-indigo-600" />
                Competitive budget ranges based on market rates
              </li>
              <li className="flex items-center text-sm text-gray-700">
                <ArrowRight className="mr-2 h-4 w-4 text-indigo-600" />
                Clear timeline expectations with milestones
              </li>
              <li className="flex items-center text-sm text-gray-700">
                <ArrowRight className="mr-2 h-4 w-4 text-indigo-600" />
                Information about the client's company/team
              </li>
            </ul>
          </div>
          
          <div className="rounded-lg border border-gray-200 p-4">
            <h3 className="flex items-center text-base font-medium text-gray-900">
              <AlertCircle className="mr-2 h-5 w-5 text-red-500" />
              Common Conversion Blockers
            </h3>
            <ul className="mt-2 space-y-2 pl-7">
              <li className="flex items-center text-sm text-gray-700">
                <ArrowRight className="mr-2 h-4 w-4 text-indigo-600" />
                Vague or generic project descriptions
              </li>
              <li className="flex items-center text-sm text-gray-700">
                <ArrowRight className="mr-2 h-4 w-4 text-indigo-600" />
                Unrealistic budget expectations
              </li>
              <li className="flex items-center text-sm text-gray-700">
                <ArrowRight className="mr-2 h-4 w-4 text-indigo-600" />
                Too many required skills (skill bloat)
              </li>
              <li className="flex items-center text-sm text-gray-700">
                <ArrowRight className="mr-2 h-4 w-4 text-indigo-600" />
                Missing information about work environment
              </li>
              <li className="flex items-center text-sm text-gray-700">
                <ArrowRight className="mr-2 h-4 w-4 text-indigo-600" />
                Unclear communication expectations
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-4 rounded-lg bg-gray-50 p-4">
          <h3 className="text-base font-medium text-gray-900">Resources</h3>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <a href="#" className="flex items-center rounded-md p-2 text-sm text-indigo-600 hover:bg-indigo-50">
              <ExternalLink className="mr-2 h-4 w-4" />
              Guide: Writing High-Converting Gig Descriptions
            </a>
            <a href="#" className="flex items-center rounded-md p-2 text-sm text-indigo-600 hover:bg-indigo-50">
              <ExternalLink className="mr-2 h-4 w-4" />
              Template: Optimized Gig Structure
            </a>
            <a href="#" className="flex items-center rounded-md p-2 text-sm text-indigo-600 hover:bg-indigo-50">
              <ExternalLink className="mr-2 h-4 w-4" />
              Case Study: Top-Performing Gigs Analysis
            </a>
            <a href="#" className="flex items-center rounded-md p-2 text-sm text-indigo-600 hover:bg-indigo-50">
              <ExternalLink className="mr-2 h-4 w-4" />
              Webinar: Maximizing Gig Visibility and Conversions
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Optimization;