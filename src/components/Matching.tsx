import React, { useState } from 'react';
import { 
  ArrowRightLeft, 
  Search, 
  UserCircle, 
  Briefcase, 
  Star, 
  ChevronDown, 
  ChevronUp,
  Filter,
  CheckCircle,
  XCircle,
  MessageCircle
} from 'lucide-react';

const Matching = () => {
  const [expandedGig, setExpandedGig] = useState<number | null>(1);
  const [selectedFilters, setSelectedFilters] = useState({
    skills: ['Web Development', 'React'],
    experience: 'All',
    rating: 'All',
    availability: 'All'
  });

  const gigs = [
    { 
      id: 1, 
      title: 'Web Development Project', 
      client: 'XYZ Corp', 
      budget: '$2,500', 
      matches: [
        { id: 101, name: 'John Smith', rating: 4.9, skills: ['Web Development', 'React', 'Node.js'], match: '95%' },
        { id: 102, name: 'Emily Davis', rating: 4.7, skills: ['Web Development', 'JavaScript', 'UI/UX'], match: '87%' },
        { id: 103, name: 'Michael Brown', rating: 4.5, skills: ['Web Development', 'React', 'MongoDB'], match: '82%' },
      ]
    },
    { 
      id: 2, 
      title: 'Mobile App Development', 
      client: 'Tech Startup', 
      budget: '$5,000', 
      matches: [
        { id: 104, name: 'Sarah Johnson', rating: 4.8, skills: ['Mobile Development', 'React Native', 'iOS'], match: '91%' },
        { id: 105, name: 'David Wilson', rating: 4.6, skills: ['Mobile Development', 'Flutter', 'Android'], match: '85%' },
      ]
    },
    { 
      id: 3, 
      title: 'UI/UX Design for Website', 
      client: 'E-commerce Store', 
      budget: '$1,200', 
      matches: [
        { id: 106, name: 'Jessica Lee', rating: 4.9, skills: ['UI/UX Design', 'Figma', 'Wireframing'], match: '93%' },
        { id: 107, name: 'Robert Chen', rating: 4.7, skills: ['UI/UX Design', 'Adobe XD', 'Prototyping'], match: '88%' },
        { id: 108, name: 'Amanda Taylor', rating: 4.5, skills: ['UI/UX Design', 'User Research', 'Sketch'], match: '81%' },
      ]
    },
  ];

  const toggleGig = (id: number) => {
    setExpandedGig(expandedGig === id ? null : id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Matching & Recommendations</h1>
        <div className="flex space-x-2">
          <button className="rounded-lg bg-white px-4 py-2 text-gray-700 shadow hover:bg-gray-50">
            <Filter className="h-5 w-5" />
          </button>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full rounded-lg border-gray-300 pl-10 focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Search gigs or profiles..."
            />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Matching Filters</h2>
            <p className="text-sm text-gray-500">Refine recommendations based on specific criteria</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700">Skills</label>
              <select className="mt-1 block w-full rounded-md border-gray-300 py-1 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm">
                <option>All Skills</option>
                <option>Web Development</option>
                <option>Mobile Development</option>
                <option>UI/UX Design</option>
                <option>Digital Marketing</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Experience</label>
              <select className="mt-1 block w-full rounded-md border-gray-300 py-1 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm">
                <option>All Levels</option>
                <option>Entry Level</option>
                <option>Intermediate</option>
                <option>Expert</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Rating</label>
              <select className="mt-1 block w-full rounded-md border-gray-300 py-1 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm">
                <option>All Ratings</option>
                <option>4.5+ Stars</option>
                <option>4.0+ Stars</option>
                <option>3.5+ Stars</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Availability</label>
              <select className="mt-1 block w-full rounded-md border-gray-300 py-1 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm">
                <option>All</option>
                <option>Full-time</option>
                <option>Part-time</option>
                <option>Weekends</option>
              </select>
            </div>
          </div>
          <div>
            <button className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
              Apply Filters
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-0.5 text-sm font-medium text-indigo-800">
            Web Development <XCircle className="ml-1 h-4 w-4 cursor-pointer" />
          </span>
          <span className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-0.5 text-sm font-medium text-indigo-800">
            React <XCircle className="ml-1 h-4 w-4 cursor-pointer" />
          </span>
        </div>
      </div>

      {/* Gigs with Matches */}
      <div className="space-y-4">
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
                  <p className="text-sm text-gray-500">{gig.client} • {gig.budget}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-sm font-medium text-indigo-800">
                  {gig.matches.length} matches
                </span>
                {expandedGig === gig.id ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </div>
            
            {expandedGig === gig.id && (
              <div className="border-t border-gray-200 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="font-medium text-gray-700">Recommended HARX REPS</h4>
                  <button className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                    View All Matches
                  </button>
                </div>
                <div className="space-y-4">
                  {gig.matches.map((match) => (
                    <div key={match.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-4 hover:bg-gray-50">
                      <div className="flex items-center space-x-4">
                        <div className="h-12 w-12 flex-shrink-0 rounded-full bg-indigo-100 flex items-center justify-center">
                          <UserCircle className="h-8 w-8 text-indigo-600" />
                        </div>
                        <div>
                          <h5 className="font-medium text-gray-900">{match.name}</h5>
                          <div className="flex items-center">
                            <Star className="h-4 w-4 text-yellow-400" />
                            <span className="ml-1 text-sm text-gray-600">{match.rating}</span>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {match.skills.map((skill, index) => (
                              <span key={index} className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-sm font-medium text-green-800">
                          {match.match} match
                        </span>
                        <div className="flex space-x-2">
                          <button className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                            <MessageCircle className="h-4 w-4" />
                          </button>
                          <button className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
                            Invite
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-lg bg-indigo-50 p-4">
                  <div className="flex items-start">
                    <ArrowRightLeft className="mr-2 h-5 w-5 text-indigo-600" />
                    <div>
                      <h5 className="font-medium text-indigo-900">AI Matching Insights</h5>
                      <p className="mt-1 text-sm text-indigo-700">
                        These matches are based on skills alignment, past performance on similar projects, and availability. John Smith has the highest match rate due to his extensive experience with React development and previous work with similar clients.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Manual Matching */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Manual Matching</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Select Gig</label>
            <select className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm">
              <option>Web Development Project - XYZ Corp</option>
              <option>Mobile App Development - Tech Startup</option>
              <option>UI/UX Design for Website - E-commerce Store</option>
              <option>Digital Marketing Campaign - ABC Inc</option>
              <option>Content Creation for Blog - Marketing Agency</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Select HARX REP</label>
            <select className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm">
              <option>John Smith - Web Development</option>
              <option>Sarah Johnson - Digital Marketing</option>
              <option>Michael Brown - Project Management</option>
              <option>Emily Davis - Data Analysis</option>
              <option>David Wilson - Mobile Development</option>
            </select>
          </div>
        </div>
        <button className="mt-4 w-full rounded-md bg-indigo-600 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
          Create Match
        </button>
      </div>
    </div>
  );
};

export default Matching;