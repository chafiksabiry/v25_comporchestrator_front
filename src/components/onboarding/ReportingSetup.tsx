import React, { useState } from 'react';
import {
  BarChart2,
  LineChart,
  PieChart,
  Settings,
  Bell,
  Mail,
  Download,
  Share2,
  Plus,
  Trash2,
  Edit,
  CheckCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Calendar,
  Users,
  PhoneCall,
  DollarSign,
  ArrowUp,
  ArrowDown,
  MessageSquare,
  Mail as MailIcon,
  Facebook,
  Twitter,
  Instagram,
  MessageCircle,
  Video,
  Globe,
  Filter,
  Inbox,
  BarChart,
  Activity
} from 'lucide-react';

const ReportingSetup = () => {
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['calls', 'conversion']);
  const [reportSchedule, setReportSchedule] = useState('weekly');
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['voice', 'email', 'chat']);
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    threshold: true
  });

  const channels = [
    {
      id: 'voice',
      name: 'Voice Calls',
      description: 'Traditional phone call metrics',
      icon: PhoneCall,
      metrics: ['volume', 'duration', 'quality']
    },
    {
      id: 'email',
      name: 'Email',
      description: 'Email communication tracking',
      icon: MailIcon,
      metrics: ['response_time', 'resolution_rate', 'volume']
    },
    {
      id: 'chat',
      name: 'Live Chat',
      description: 'Web chat interactions',
      icon: MessageSquare,
      metrics: ['response_time', 'satisfaction', 'volume']
    },
    {
      id: 'social',
      name: 'Social Media',
      description: 'Social platform engagement',
      icon: Facebook,
      metrics: ['response_time', 'sentiment', 'engagement']
    },
    {
      id: 'video',
      name: 'Video Calls',
      description: 'Video conference metrics',
      icon: Video,
      metrics: ['quality', 'duration', 'technical_issues']
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      description: 'WhatsApp business metrics',
      icon: MessageCircle,
      metrics: ['response_time', 'volume', 'engagement']
    }
  ];

  const metrics = [
    {
      id: 'channel_performance',
      name: 'Channel Performance',
      description: 'Compare metrics across different channels',
      icon: BarChart2,
      category: 'cross_channel'
    },
    {
      id: 'response_times',
      name: 'Response Times',
      description: 'Track response times per channel',
      icon: Clock,
      category: 'efficiency'
    },
    {
      id: 'resolution_rates',
      name: 'Resolution Rates',
      description: 'First contact and overall resolution',
      icon: CheckCircle,
      category: 'quality'
    },
    {
      id: 'customer_satisfaction',
      name: 'Customer Satisfaction',
      description: 'CSAT scores across channels',
      icon: Activity,
      category: 'quality'
    },
    {
      id: 'channel_utilization',
      name: 'Channel Utilization',
      description: 'Usage patterns across channels',
      icon: BarChart,
      category: 'efficiency'
    },
    {
      id: 'cross_channel_journey',
      name: 'Customer Journey',
      description: 'Track multi-channel customer journeys',
      icon: Globe,
      category: 'analysis'
    },
    {
      id: 'queue_metrics',
      name: 'Queue Metrics',
      description: 'Wait times and queue management',
      icon: Users,
      category: 'efficiency'
    },
    {
      id: 'channel_costs',
      name: 'Channel Costs',
      description: 'Cost per contact by channel',
      icon: DollarSign,
      category: 'financial'
    }
  ];

  const dashboards = [
    {
      id: 1,
      name: 'Omnichannel Overview',
      description: 'Cross-channel performance metrics',
      type: 'standard',
      metrics: ['channel_performance', 'response_times', 'customer_satisfaction']
    },
    {
      id: 2,
      name: 'Channel Efficiency',
      description: 'Response times and resolution rates',
      type: 'custom',
      metrics: ['response_times', 'resolution_rates', 'queue_metrics']
    },
    {
      id: 3,
      name: 'Quality Monitoring',
      description: 'Quality metrics across channels',
      type: 'standard',
      metrics: ['customer_satisfaction', 'resolution_rates']
    },
    {
      id: 4,
      name: 'Customer Journey Analysis',
      description: 'Multi-channel interaction tracking',
      type: 'custom',
      metrics: ['cross_channel_journey', 'channel_utilization']
    }
  ];

  const toggleMetric = (metricId: string) => {
    if (selectedMetrics.includes(metricId)) {
      setSelectedMetrics(selectedMetrics.filter(id => id !== metricId));
    } else {
      setSelectedMetrics([...selectedMetrics, metricId]);
    }
  };

  const toggleChannel = (channelId: string) => {
    if (selectedChannels.includes(channelId)) {
      setSelectedChannels(selectedChannels.filter(id => id !== channelId));
    } else {
      setSelectedChannels([...selectedChannels, channelId]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Multi-Channel Reporting Setup</h2>
          <p className="text-sm text-gray-500">Configure reporting across all communication channels</p>
        </div>
        <div className="flex space-x-3">
          <button className="flex items-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </button>
          <button className="flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
            <Plus className="mr-2 h-4 w-4" />
            New Dashboard
          </button>
        </div>
      </div>

      {/* Channel Selection */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="text-lg font-medium text-gray-900">Communication Channels</h3>
        <p className="mt-1 text-sm text-gray-500">Select channels to include in your reports</p>
        
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {channels.map((channel) => {
            const Icon = channel.icon;
            const isSelected = selectedChannels.includes(channel.id);
            
            return (
              <div
                key={channel.id}
                className={`cursor-pointer rounded-lg border p-4 ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => toggleChannel(channel.id)}
              >
                <div className="flex items-center space-x-3">
                  <div className={`rounded-lg p-2 ${
                    isSelected ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{channel.name}</h4>
                    <p className="text-sm text-gray-500">{channel.description}</p>
                  </div>
                </div>
                {isSelected && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {channel.metrics.map((metric) => (
                      <span
                        key={metric}
                        className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800"
                      >
                        {metric.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Cross-Channel Metrics */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="text-lg font-medium text-gray-900">Cross-Channel Metrics</h3>
        <p className="mt-1 text-sm text-gray-500">Select metrics to track across all channels</p>
        
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            const isSelected = selectedMetrics.includes(metric.id);
            
            return (
              <div
                key={metric.id}
                className={`cursor-pointer rounded-lg border p-4 ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => toggleMetric(metric.id)}
              >
                <div className="flex items-center space-x-3">
                  <div className={`rounded-lg p-2 ${
                    isSelected ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{metric.name}</h4>
                    <p className="text-sm text-gray-500">{metric.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dashboards */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="text-lg font-medium text-gray-900">Multi-Channel Dashboards</h3>
        <div className="mt-4 space-y-4">
          {dashboards.map((dashboard) => (
            <div key={dashboard.id} className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">{dashboard.name}</h4>
                  <p className="text-sm text-gray-500">{dashboard.description}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {dashboard.metrics.map((metricId) => {
                      const metric = metrics.find(m => m.id === metricId);
                      if (!metric) return null;
                      
                      return (
                        <span
                          key={metricId}
                          className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800"
                        >
                          {metric.name}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500">
                    <Share2 className="h-4 w-4" />
                  </button>
                  <button className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Report Scheduling */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="text-lg font-medium text-gray-900">Report Scheduling</h3>
        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Report Frequency</label>
            <select
              className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              value={reportSchedule}
              onChange={(e) => setReportSchedule(e.target.value)}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Delivery Method</label>
            <div className="mt-2 space-y-4">
              <div className="flex items-center">
                <input
                  id="email-notifications"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  checked={notifications.email}
                  onChange={(e) => setNotifications({ ...notifications, email: e.target.checked })}
                />
                <label htmlFor="email-notifications" className="ml-2 flex items-center text-sm text-gray-700">
                  <Mail className="mr-2 h-4 w-4" />
                  Email Reports
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="push-notifications"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  checked={notifications.push}
                  onChange={(e) => setNotifications({ ...notifications, push: e.target.checked })}
                />
                <label htmlFor="push-notifications" className="ml-2 flex items-center text-sm text-gray-700">
                  <Bell className="mr-2 h-4 w-4" />
                  Push Notifications
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="threshold-alerts"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  checked={notifications.threshold}
                  onChange={(e) => setNotifications({ ...notifications, threshold: e.target.checked })}
                />
                <label htmlFor="threshold-alerts" className="ml-2 flex items-center text-sm text-gray-700">
                  <AlertCircle className="mr-2 h-4 w-4" />
                  Threshold Alerts
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Visualization */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="text-lg font-medium text-gray-900">Cross-Channel Visualization</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-center space-x-3">
              <BarChart2 className="h-5 w-5 text-indigo-600" />
              <div>
                <h4 className="font-medium text-gray-900">Channel Comparison</h4>
                <p className="text-sm text-gray-500">Compare metrics across channels</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-center space-x-3">
              <LineChart className="h-5 w-5 text-indigo-600" />
              <div>
                <h4 className="font-medium text-gray-900">Trend Analysis</h4>
                <p className="text-sm text-gray-500">Track patterns over time</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-center space-x-3">
              <PieChart className="h-5 w-5 text-indigo-600" />
              <div>
                <h4 className="font-medium text-gray-900">Channel Distribution</h4>
                <p className="text-sm text-gray-500">Volume distribution by channel</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Export Options */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Export Options</h3>
            <p className="mt-1 text-sm text-gray-500">Download or share your cross-channel reports</p>
          </div>
          <div className="flex space-x-3">
            <button className="flex items-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </button>
            <button className="flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
              <Download className="mr-2 h-4 w-4" />
              Export
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportingSetup;