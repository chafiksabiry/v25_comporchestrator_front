import React, { useState } from 'react';
import {
  Users,
  Star,
  CheckCircle,
  XCircle,
  MessageSquare,
  Phone,
  Mail,
  Video,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  Filter,
  Search,
  ArrowRight,
  Clock,
  Globe,
  Briefcase,
  Award,
  ThumbsUp,
  AlertCircle,
  Calendar,
  MapPin,
  DollarSign,
  FileText,
  Settings,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const MatchHarxReps = () => {
  const [selectedFilters, setSelectedFilters] = useState({
    skills: [],
    experience: 'all',
    channels: ['voice', 'email'],
    availability: 'all'
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRep, setExpandedRep] = useState<number | null>(null);

  const reps = [
    {
      id: 1,
      name: 'John Smith',
      rating: 4.8,
      experience: '5+ years',
      skills: ['Customer Support', 'Technical Support', 'Sales'],
      channels: ['voice', 'email', 'chat'],
      languages: ['English', 'Spanish'],
      availability: 'Full-time',
      matchScore: 95,
      status: 'available',
      location: 'New York, USA',
      timezone: 'EST',
      completedGigs: 127,
      successRate: '98%',
      responseTime: '< 2 hours',
      specializations: ['B2B Support', 'Technical Troubleshooting', 'Account Management'],
      certifications: ['Customer Service Excellence', 'Technical Support Level 2']
    },
    {
      id: 2,
      name: 'Sarah Johnson',
      rating: 4.9,
      experience: '7+ years',
      skills: ['Account Management', 'Sales', 'Social Media'],
      channels: ['voice', 'email', 'social'],
      languages: ['English', 'French'],
      availability: 'Part-time',
      matchScore: 88,
      status: 'available',
      location: 'London, UK',
      timezone: 'GMT',
      completedGigs: 243,
      successRate: '96%',
      responseTime: '< 1 hour',
      specializations: ['Social Media Management', 'Lead Generation', 'CRM'],
      certifications: ['Social Media Marketing', 'Sales Excellence']
    },
    {
      id: 3,
      name: 'Michael Brown',
      rating: 4.7,
      experience: '3+ years',
      skills: ['Technical Support', 'Customer Service', 'Chat Support'],
      channels: ['chat', 'email', 'voice'],
      languages: ['English'],
      availability: 'Full-time',
      matchScore: 82,
      status: 'engaged',
      location: 'Toronto, Canada',
      timezone: 'EST',
      completedGigs: 89,
      successRate: '94%',
      responseTime: '< 3 hours',
      specializations: ['Live Chat Support', 'Product Support', 'Customer Onboarding'],
      certifications: ['Chat Support Specialist', 'Customer Experience']
    }
  ];

  const channels = [
    { id: 'voice', name: 'Voice Calls', icon: Phone },
    { id: 'email', name: 'Email Support', icon: Mail },
    { id: 'chat', name: 'Live Chat', icon: MessageSquare },
    { id: 'video', name: 'Video Calls', icon: Video },
    { id: 'facebook', name: 'Facebook', icon: Facebook },
    { id: 'twitter', name: 'Twitter', icon: Twitter },
    { id: 'instagram', name: 'Instagram', icon: Instagram },
    { id: 'linkedin', name: 'LinkedIn', icon: Linkedin },
    { id: 'youtube', name: 'YouTube', icon: Youtube }
  ];

  const toggleRepExpansion = (repId: number) => {
    setExpandedRep(expandedRep === repId ? null : repId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Match HARX REPS</h2>
          <p className="text-sm text-gray-500">Find and match qualified REPS for your requirements</p>
        </div>
        <div className="flex space-x-3">
          <button className="flex items-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
            <Filter className="mr-2 h-4 w-4" />
            Advanced Filters
          </button>
          <button className="flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
            Auto-Match
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div className="flex-1 sm:mr-4">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full rounded-md border-gray-300 pl-10 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="Search REPS by name, skills, or experience..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex space-x-4">
            <select
              className="rounded-md border-gray-300 py-2 pl-3 pr-10 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              value={selectedFilters.experience}
              onChange={(e) => setSelectedFilters({ ...selectedFilters, experience: e.target.value })}
            >
              <option value="all">All Experience</option>
              <option value="junior">Junior (1-2 years)</option>
              <option value="mid">Mid-Level (3-5 years)</option>
              <option value="senior">Senior (5+ years)</option>
            </select>
            <select
              className="rounded-md border-gray-300 py-2 pl-3 pr-10 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              value={selectedFilters.availability}
              onChange={(e) => setSelectedFilters({ ...selectedFilters, availability: e.target.value })}
            >
              <option value="all">All Availability</option>
              <option value="full-time">Full-time</option>
              <option value="part-time">Part-time</option>
              <option value="flexible">Flexible</option>
            </select>
          </div>
        </div>

        {/* Channel Filters */}
        <div className="mt-4 flex flex-wrap gap-2">
          {channels.map((channel) => {
            const Icon = channel.icon;
            const isSelected = selectedFilters.channels.includes(channel.id);
            
            return (
              <button
                key={channel.id}
                className={`flex items-center rounded-full px-3 py-1 text-sm ${
                  isSelected
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => {
                  const newChannels = isSelected
                    ? selectedFilters.channels.filter(c => c !== channel.id)
                    : [...selectedFilters.channels, channel.id];
                  setSelectedFilters({ ...selectedFilters, channels: newChannels });
                }}
              >
                <Icon className="mr-1 h-4 w-4" />
                {channel.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* REP List */}
      <div className="space-y-4">
        {reps.map((rep) => (
          <div key={rep.id} className="rounded-lg bg-white shadow">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 flex-shrink-0 rounded-full bg-indigo-100 flex items-center justify-center">
                    <Users className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{rep.name}</h3>
                    <div className="mt-1 flex items-center space-x-2">
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-400" />
                        <span className="ml-1 text-sm text-gray-600">{rep.rating}</span>
                      </div>
                      <span className="text-sm text-gray-500">{rep.experience}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-sm font-medium text-green-800">
                      {rep.matchScore}% Match
                    </span>
                    <p className="mt-1 text-sm text-gray-500">{rep.status}</p>
                  </div>
                  <button
                    onClick={() => toggleRepExpansion(rep.id)}
                    className="rounded-full p-1 hover:bg-gray-100"
                  >
                    {expandedRep === rep.id ? (
                      <ChevronUp className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}
                  </button>
                </div>
              </div>

              {/* Channel Icons */}
              <div className="mt-4 flex space-x-2">
                {rep.channels.map((channelId) => {
                  const channel = channels.find(c => c.id === channelId);
                  if (!channel) return null;
                  const Icon = channel.icon;
                  return (
                    <div
                      key={channelId}
                      className="rounded-full bg-gray-100 p-2 text-gray-600"
                      title={channel.name}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                  );
                })}
              </div>

              {/* Skills */}
              <div className="mt-4 flex flex-wrap gap-2">
                {rep.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800"
                  >
                    {skill}
                  </span>
                ))}
              </div>

              {/* Expanded Details */}
              {expandedRep === rep.id && (
                <div className="mt-6 border-t border-gray-200 pt-6">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Location & Availability</h4>
                      <div className="mt-2 space-y-2 text-sm text-gray-500">
                        <div className="flex items-center">
                          <MapPin className="mr-2 h-4 w-4" />
                          {rep.location}
                        </div>
                        <div className="flex items-center">
                          <Clock className="mr-2 h-4 w-4" />
                          {rep.timezone}
                        </div>
                        <div className="flex items-center">
                          <Calendar className="mr-2 h-4 w-4" />
                          {rep.availability}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Performance Metrics</h4>
                      <div className="mt-2 space-y-2 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Briefcase className="mr-2 h-4 w-4" />
                          {rep.completedGigs} Completed Gigs
                        </div>
                        <div className="flex items-center">
                          <ThumbsUp className="mr-2 h-4 w-4" />
                          {rep.successRate} Success Rate
                        </div>
                        <div className="flex items-center">
                          <Clock className="mr-2 h-4 w-4" />
                          {rep.responseTime} Avg. Response Time
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Languages</h4>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {rep.languages.map((language, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800"
                          >
                            {language}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-900">Specializations</h4>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {rep.specializations.map((spec, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800"
                        >
                          {spec}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-900">Certifications</h4>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {rep.certifications.map((cert, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800"
                        >
                          <Award className="mr-1 h-3 w-3" />
                          {cert}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button className="rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                      View Profile
                    </button>
                    <button className="rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                      Schedule Interview
                    </button>
                    <button className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
                      Match REP
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MatchHarxReps;