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

  React.useEffect(() => {
    // Dispatch global back navigation
    window.dispatchEvent(new CustomEvent('setGlobalBack', {
      detail: {
        label: 'Back to Onboarding',
        action: () => {
          localStorage.setItem('activeTab', 'company-onboarding');
          window.dispatchEvent(
            new CustomEvent('tabChange', { detail: { tab: 'company-onboarding' } })
          );
        }
      }
    }));

    return () => {
      window.dispatchEvent(new CustomEvent('setGlobalBack', { detail: null }));
    };
  }, []);

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
    <div className="space-y-4 p-4 animate-fade-in">
      <div className="flex items-center justify-between bg-gradient-harx p-4 rounded-xl shadow-lg border border-harx-600 mb-6">
        <div>
          <h1 className="text-xl font-black text-white uppercase tracking-tight">Optimization & Performance</h1>
          <p className="text-harx-50 text-xs font-bold uppercase tracking-widest opacity-80">AI-Powered Strategic Insights</p>
        </div>
        <div className="flex space-x-2">
          <select 
            className="rounded-lg border-white/20 bg-white/10 text-white py-1.5 pl-3 pr-8 text-xs font-bold focus:border-white focus:outline-none focus:ring-1 focus:ring-white sm:text-xs shadow-sm backdrop-blur-md appearance-none cursor-pointer"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="7d" className="text-gray-900">Last 7 days</option>
            <option value="30d" className="text-gray-900">Last 30 days</option>
            <option value="90d" className="text-gray-900">Last 90 days</option>
            <option value="all" className="text-gray-900">All time</option>
          </select>
          <button className="rounded-lg bg-white/20 p-1.5 text-white hover:bg-white/30 transition-all border border-white/20 backdrop-blur-md group">
            <RefreshCw className="h-4 w-4 group-active:rotate-180 transition-transform duration-500" />
          </button>
        </div>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 font-black uppercase tracking-widest text-[10px]">
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-black text-gray-400">Total Gigs</p>
              <p className="text-3xl font-black text-gray-900 mt-1">24</p>
            </div>
            <div className="rounded-xl bg-harx-50 p-3 text-harx-600">
              <Briefcase className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <TrendingUp className="h-4 w-4 text-green-500 mr-1.5" />
            <span className="text-green-500 font-black">+8%</span>
            <span className="ml-1.5 text-gray-400">vs last period</span>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-black text-gray-400">Total Views</p>
              <p className="text-3xl font-black text-gray-900 mt-1">3,842</p>
            </div>
            <div className="rounded-xl bg-harx-50 p-3 text-harx-600">
              <BarChart2 className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <TrendingUp className="h-4 w-4 text-green-500 mr-1.5" />
            <span className="text-green-500 font-black">+15%</span>
            <span className="ml-1.5 text-gray-400">vs last period</span>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-black text-gray-400">Applications</p>
              <p className="text-3xl font-black text-gray-900 mt-1">267</p>
            </div>
            <div className="rounded-xl bg-harx-50 p-3 text-harx-600">
              <UserCircle className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <TrendingUp className="h-4 w-4 text-green-500 mr-1.5" />
            <span className="text-green-500 font-black">+12%</span>
            <span className="ml-1.5 text-gray-400">vs last period</span>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-black text-gray-400">Avg. Conv. Rate</p>
              <p className="text-3xl font-black text-gray-900 mt-1">6.9%</p>
            </div>
            <div className="rounded-xl bg-harx-50 p-3 text-harx-600">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <TrendingUp className="h-4 w-4 text-green-500 mr-1.5" />
            <span className="text-green-500 font-black">+2.1%</span>
            <span className="ml-1.5 text-gray-400">vs last period</span>
          </div>
        </div>
      </div>

      {/* Performance Chart Placeholder */}
      <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
        <h2 className="mb-6 text-xl font-black text-gray-900 uppercase tracking-tight">Performance Trends</h2>
        <div className="h-72 rounded-3xl bg-gray-50 flex items-center justify-center border-2 border-dashed border-gray-100 relative group/chart">
          <div className="absolute inset-0 bg-gradient-harx opacity-0 group-hover/chart:opacity-[0.02] transition-opacity" />
          <p className="text-gray-400 font-black uppercase tracking-widest text-xs italic">Intelligent data stream loading...</p>
        </div>
        <div className="mt-8 flex justify-center gap-3">
          <button className="rounded-full bg-harx-500 px-6 py-2 text-xs font-black text-white shadow-lg shadow-harx-500/25 uppercase tracking-widest">Views</button>
          <button className="rounded-full bg-gray-50 px-6 py-2 text-xs font-black text-gray-400 hover:bg-gray-100 hover:text-gray-600 uppercase tracking-widest transition-all">Applications</button>
          <button className="rounded-full bg-gray-50 px-6 py-2 text-xs font-black text-gray-400 hover:bg-gray-100 hover:text-gray-600 uppercase tracking-widest transition-all">Conversion</button>
          <button className="rounded-full bg-gray-50 px-6 py-2 text-xs font-black text-gray-400 hover:bg-gray-100 hover:text-gray-600 uppercase tracking-widest transition-all">Matches</button>
        </div>
      </div>

      {/* Gig Optimization */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Gig Optimization</h2>
        
        {gigs.map((gig) => (
          <div key={gig.id} className="rounded-lg bg-white shadow">
            <div 
              className="flex cursor-pointer items-center justify-between p-6 hover:bg-harx-50/30 transition-colors"
              onClick={() => toggleGig(gig.id)}
            >
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 flex-shrink-0 rounded-2xl bg-harx-50 flex items-center justify-center shadow-inner">
                  <Briefcase className="h-6 w-6 text-harx-600" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 tracking-tight">{gig.title}</h3>
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-widest text-[10px]">{gig.client}</p>
                </div>
              </div>
              <div className="flex items-center space-x-6">
                <div className="text-right">
                  <p className="text-sm font-black text-gray-900 tabular-nums">{gig.conversionRate}</p>
                  <div className="flex items-center justify-end mt-0.5">
                    {gig.trend === 'up' ? (
                      <TrendingUp className="h-3 w-3 text-green-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    )}
                    <span className={`ml-1 text-[10px] font-black tracking-widest ${gig.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                      {gig.trendValue}
                    </span>
                  </div>
                </div>
                {expandedGig === gig.id ? (
                  <ChevronUp className="h-5 w-5 text-gray-300" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-300" />
                )}
              </div>
            </div>
            
            {expandedGig === gig.id && (
              <div className="border-t border-gray-100 p-6 animate-fade-in">
                <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl bg-gray-50 p-4 border border-transparent hover:border-harx-100 transition-colors">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Views</p>
                    <p className="text-xl font-black text-gray-900 tabular-nums">{gig.views}</p>
                  </div>
                  <div className="rounded-2xl bg-gray-50 p-4 border border-transparent hover:border-harx-100 transition-colors">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Applications</p>
                    <p className="text-xl font-black text-gray-900 tabular-nums">{gig.applications}</p>
                  </div>
                  <div className="rounded-2xl bg-gray-50 p-4 border border-transparent hover:border-harx-100 transition-colors">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Conversion</p>
                    <p className="text-xl font-black text-harx-600 tabular-nums">{gig.conversionRate}</p>
                  </div>
                </div>
                
                <div className="rounded-3xl bg-harx-50/30 p-8 border border-harx-100 relative overflow-hidden group/suggestions">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Sparkles size={120} className="text-harx-500" />
                  </div>
                  <div className="flex items-start relative">
                    <div className="p-3 bg-white rounded-2xl shadow-sm mr-6">
                      <Sparkles className="h-6 w-6 text-harx-500" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-4">AI Strategic Recommendations</h4>
                      <ul className="mb-8 space-y-4">
                        {gig.suggestions.map((suggestion, index) => (
                          <li key={index} className="flex items-start group/li">
                            <div className={`mt-1.5 mr-4 h-2 w-2 rounded-full flex-shrink-0 transition-transform group-hover/li:scale-150 ${
                              suggestion.type === 'high' ? 'bg-red-500' : 
                              suggestion.type === 'medium' ? 'bg-orange-400' : 'bg-green-500'
                            }`} />
                            <span className="text-sm text-gray-700 font-medium leading-relaxed">{suggestion.text}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="flex gap-4">
                        <button className="rounded-xl bg-gradient-harx px-8 py-3 text-xs font-black text-white shadow-xl shadow-harx-500/25 uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">
                          Apply Intelligence
                        </button>
                        <button className="rounded-xl bg-white px-8 py-3 text-xs font-black text-harx-600 shadow-sm border border-harx-100 uppercase tracking-widest hover:bg-harx-50 transition-all">
                          Expert Review
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