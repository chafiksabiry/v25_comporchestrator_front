import React, { useState } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Eye, 
  Edit, 
  Briefcase,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  CheckSquare,
  Square
} from 'lucide-react';

const ApprovalPublishing = () => {
  const [expandedGig, setExpandedGig] = useState<number | null>(1);
  const [selectedGigs, setSelectedGigs] = useState<number[]>([]);
  const [filter, setFilter] = useState('pending');

  const gigs = [
    { 
      id: 1, 
      title: 'Web Development Project', 
      client: 'XYZ Corp', 
      budget: '$2,500', 
      status: 'pending',
      submittedBy: 'John Smith',
      submittedAt: '2 hours ago',
      issues: []
    },
    { 
      id: 2, 
      title: 'Digital Marketing Campaign', 
      client: 'ABC Inc', 
      budget: '$1,800', 
      status: 'pending',
      submittedBy: 'Sarah Johnson',
      submittedAt: '5 hours ago',
      issues: ['Missing target audience information', 'Budget details incomplete']
    },
    { 
      id: 3, 
      title: 'Mobile App Development', 
      client: 'Tech Startup', 
      budget: '$5,000', 
      status: 'approved',
      submittedBy: 'Michael Brown',
      submittedAt: '1 day ago',
      issues: []
    },
    { 
      id: 4, 
      title: 'Content Creation for Blog', 
      client: 'Marketing Agency', 
      budget: '$800', 
      status: 'rejected',
      submittedBy: 'Emily Davis',
      submittedAt: '2 days ago',
      issues: ['Scope of work unclear', 'Timeline not specified', 'Budget too low for requirements']
    },
    { 
      id: 5, 
      title: 'UI/UX Design for Website', 
      client: 'E-commerce Store', 
      budget: '$1,200', 
      status: 'approved',
      submittedBy: 'David Wilson',
      submittedAt: '3 days ago',
      issues: []
    },
  ];

  const toggleGig = (id: number) => {
    setExpandedGig(expandedGig === id ? null : id);
  };

  const toggleSelectGig = (id: number) => {
    if (selectedGigs.includes(id)) {
      setSelectedGigs(selectedGigs.filter(gigId => gigId !== id));
    } else {
      setSelectedGigs([...selectedGigs, id]);
    }
  };

  const selectAllGigs = () => {
    if (selectedGigs.length === filteredGigs.length) {
      setSelectedGigs([]);
    } else {
      setSelectedGigs(filteredGigs.map(gig => gig.id));
    }
  };

  const filteredGigs = gigs.filter(gig => {
    if (filter === 'all') return true;
    return gig.status === filter;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Approval & Publishing</h1>
        <div className="flex space-x-2">
          <button 
            className={`rounded-lg px-4 py-2 ${selectedGigs.length > 0 ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
            disabled={selectedGigs.length === 0}
          >
            Approve Selected
          </button>
          <button 
            className={`rounded-lg px-4 py-2 ${selectedGigs.length > 0 ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
            disabled={selectedGigs.length === 0}
          >
            Reject Selected
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex space-x-1 rounded-lg bg-white p-1 shadow">
        <button
          className={`flex-1 rounded-md py-2 text-sm font-medium ${
            filter === 'all' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'
          }`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={`flex-1 rounded-md py-2 text-sm font-medium ${
            filter === 'pending' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'
          }`}
          onClick={() => setFilter('pending')}
        >
          Pending
        </button>
        <button
          className={`flex-1 rounded-md py-2 text-sm font-medium ${
            filter === 'approved' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'
          }`}
          onClick={() => setFilter('approved')}
        >
          Approved
        </button>
        <button
          className={`flex-1 rounded-md py-2 text-sm font-medium ${
            filter === 'rejected' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'
          }`}
          onClick={() => setFilter('rejected')}
        >
          Rejected
        </button>
      </div>

      {/* Gigs for Approval */}
      <div className="rounded-lg bg-white shadow">
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <div className="flex items-center space-x-3">
            <button onClick={selectAllGigs}>
              {selectedGigs.length === filteredGigs.length && filteredGigs.length > 0 ? (
                <CheckSquare className="h-5 w-5 text-indigo-600" />
              ) : (
                <Square className="h-5 w-5 text-gray-400" />
              )}
            </button>
            <span className="font-medium text-gray-700">
              {selectedGigs.length} of {filteredGigs.length} selected
            </span>
          </div>
          <div className="text-sm text-gray-500">
            {filteredGigs.filter(g => g.status === 'pending').length} pending approval
          </div>
        </div>

        {filteredGigs.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No gigs found matching the current filter.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredGigs.map((gig) => (
              <div key={gig.id} className="hover:bg-gray-50">
                <div className="flex items-center p-4">
                  <div className="mr-3">
                    <button onClick={() => toggleSelectGig(gig.id)}>
                      {selectedGigs.includes(gig.id) ? (
                        <CheckSquare className="h-5 w-5 text-indigo-600" />
                      ) : (
                        <Square className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                  <div 
                    className="flex flex-1 cursor-pointer items-center justify-between"
                    onClick={() => toggleGig(gig.id)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 flex-shrink-0 rounded-full bg-indigo-100 flex items-center justify-center">
                        <Briefcase className="h-6 w-6 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="text-base font-medium text-gray-900">{gig.title}</h3>
                        <p className="text-sm text-gray-500">{gig.client} • {gig.budget}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      {gig.status === 'pending' && (
                        <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                          <Clock className="mr-1 h-3 w-3" />
                          Pending
                        </span>
                      )}
                      {gig.status === 'approved' && (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Approved
                        </span>
                      )}
                      {gig.status === 'rejected' && (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                          <XCircle className="mr-1 h-3 w-3" />
                          Rejected
                        </span>
                      )}
                      {expandedGig === gig.id ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>
                
                {expandedGig === gig.id && (
                  <div className="border-t border-gray-100 bg-gray-50 p-4">
                    <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div>
                        <p className="text-xs font-medium text-gray-500">Submitted By</p>
                        <p className="text-sm font-medium text-gray-900">{gig.submittedBy}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500">Submitted</p>
                        <p className="text-sm font-medium text-gray-900">{gig.submittedAt}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500">Status</p>
                        <p className="text-sm font-medium text-gray-900 capitalize">{gig.status}</p>
                      </div>
                    </div>
                    
                    {gig.issues.length > 0 && (
                      <div className="mb-4 rounded-md bg-yellow-50 p-3">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <AlertTriangle className="h-5 w-5 text-yellow-400" />
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-yellow-800">Issues Requiring Attention</h3>
                            <div className="mt-2 text-sm text-yellow-700">
                              <ul className="list-disc space-y-1 pl-5">
                                {gig.issues.map((issue, index) => (
                                  <li key={index}>{issue}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex space-x-3">
                      <button className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
                        <Eye className="mr-2 h-4 w-4" />
                        Preview
                      </button>
                      <button className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </button>
                      <button className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Comment
                      </button>
                      
                      {gig.status === 'pending' && (
                        <>
                          <button className="inline-flex items-center rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700">
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Approve
                          </button>
                          <button className="inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700">
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject
                          </button>
                        </>
                      )}
                      
                      {gig.status === 'approved' && (
                        <button className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
                          Publish Now
                        </button>
                      )}
                      
                      {gig.status === 'rejected' && (
                        <button className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
                          Request Revision
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Publishing Settings */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Publishing Settings</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <h3 className="text-sm font-medium text-gray-700">Automatic Publishing</h3>
            <div className="mt-2 space-y-4">
              <div className="flex items-center">
                <input
                  id="auto-publish"
                  name="publish-setting"
                  type="radio"
                  className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  defaultChecked
                />
                <label htmlFor="auto-publish" className="ml-3 block text-sm font-medium text-gray-700">
                  Publish immediately after approval
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="schedule-publish"
                  name="publish-setting"
                  type="radio"
                  className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="schedule-publish" className="ml-3 block text-sm font-medium text-gray-700">
                  Schedule publishing
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="manual-publish"
                  name="publish-setting"
                  type="radio"
                  className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="manual-publish" className="ml-3 block text-sm font-medium text-gray-700">
                  Manual publishing only
                </label>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-700">Approval Requirements</h3>
            <div className="mt-2 space-y-2">
              <div className="flex items-center">
                <input
                  id="req-complete-profile"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  defaultChecked
                />
                <label htmlFor="req-complete-profile" className="ml-2 text-sm text-gray-700">
                  Complete profile information
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="req-budget"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  defaultChecked
                />
                <label htmlFor="req-budget" className="ml-2 text-sm text-gray-700">
                  Budget details specified
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="req-timeline"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  defaultChecked
                />
                <label htmlFor="req-timeline" className="ml-2 text-sm text-gray-700">
                  Timeline/deadline included
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="req-skills"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  defaultChecked
                />
                <label htmlFor="req-skills" className="ml-2 text-sm text-gray-700">
                  Required skills listed
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="req-outcomes"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  defaultChecked
                />
                <label htmlFor="req-outcomes" className="ml-2 text-sm text-gray-700">
                  Clear deliverables/outcomes
                </label>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApprovalPublishing;