import React, { useState, useEffect } from 'react';
import axios from 'axios';
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
  Square,
  ArrowLeft
} from 'lucide-react';
import Cookies from 'js-cookie';

interface Gig {
  _id: string;
  title: string;
  description?: string;
  status: string;
  category?: string;
  budget?: string;
  companyId: string;
  companyName?: string;
  createdAt: string;
  updatedAt: string;
  submittedBy?: string;
  issues?: string[];
}

interface Company {
  _id: string;
  name: string;
  industry?: string;
  contact?: {
    email?: string;
    phone?: string;
    address?: string;
    website?: string;
  };
}

interface CompanyResponse {
  success: boolean;
  message: string;
  data: Company;
}

const ApprovalPublishing = () => {
  const [expandedGig, setExpandedGig] = useState<string | null>(null);
  const [selectedGigs, setSelectedGigs] = useState<string[]>([]);
  const [filter, setFilter] = useState('pending');
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGigs();
    fetchCompanyDetails();
  }, []);

    const fetchCompanyDetails = async () => {
    try {
      const companyId = Cookies.get('companyId');
      if (!companyId) {
        console.error('❌ Company ID not found for company details');
        return;
      }

      const response = await axios.get<CompanyResponse>(`${import.meta.env.VITE_COMPANY_API_URL}/companies/${companyId}/details`);
      console.log('🏢 Company details fetched:', response.data.data);
      setCompany(response.data.data);
    } catch (err) {
      console.error('❌ Error fetching company details:', err);
    }
  };

  const fetchGigs = async () => {
    console.log('🔄 Starting fetchGigs...');
    setIsLoading(true);
    setError(null);
    
    try {
      const companyId = Cookies.get('companyId');
      const gigId = Cookies.get('gigId');
      const userId = Cookies.get('userId');
      
      console.log('📋 Cookies found:', { companyId, gigId, userId });
      
      if (!companyId) {
        console.error('❌ Company ID not found in cookies');
        throw new Error('Company ID not found');
      }

      const apiUrl = `${import.meta.env.VITE_GIGS_API}/gigs/company/${companyId}`;
      console.log('🌐 Fetching from API:', apiUrl);
      
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${gigId}:${userId}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 API Response status:', response.status);
      console.log('📡 API Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        console.error('❌ API request failed:', response.status, response.statusText);
        throw new Error('Failed to fetch gigs');
      }

      const data = await response.json();
      console.log('📦 Raw API data:', data);
      
      if (data.data) {
        console.log('📊 Found gigs data, transforming...');
        // Transformer les données pour correspondre à l'interface attendue
        const transformedGigs = data.data.map((gig: any) => {
          const transformed = {
            _id: gig._id,
            title: gig.title,
            description: gig.description,
            status: gig.status || 'pending',
            category: gig.category,
            budget: gig.commission?.baseAmount && gig.commission.baseAmount !== '0' ? `$${gig.commission.baseAmount}` : null,
            companyId: gig.companyId,
            companyName: gig.companyName || gig.company?.name || company?.name || 'Company',
            createdAt: gig.createdAt,
            updatedAt: gig.updatedAt,
            submittedBy: gig.submittedBy || gig.companyName || gig.company?.name || company?.name || 'Company',
            issues: gig.issues || []
          };
          console.log('🔄 Transformed gig:', transformed);
          return transformed;
        });
        
        console.log('✅ Setting gigs state with', transformedGigs.length, 'gigs');
        setGigs(transformedGigs);
      } else {
        console.warn('⚠️ No data property in API response');
        setGigs([]);
      }
    } catch (err) {
      console.error('❌ Error fetching gigs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch gigs');
    } finally {
      console.log('🏁 fetchGigs completed, setting loading to false');
      setIsLoading(false);
    }
  };

  const toggleGig = (id: string) => {
    console.log('🔄 Toggling gig expansion:', id, 'Current expanded:', expandedGig);
    setExpandedGig(expandedGig === id ? null : id);
  };

  const toggleSelectGig = (id: string) => {
    console.log('🔄 Toggling gig selection:', id, 'Currently selected:', selectedGigs);
    if (selectedGigs.includes(id)) {
      setSelectedGigs(selectedGigs.filter(gigId => gigId !== id));
    } else {
      setSelectedGigs([...selectedGigs, id]);
    }
  };

  const selectAllGigs = () => {
    console.log('🔄 Selecting all gigs. Current selected:', selectedGigs.length, 'Total filtered:', filteredGigs.length);
    if (selectedGigs.length === filteredGigs.length) {
      setSelectedGigs([]);
    } else {
      setSelectedGigs(filteredGigs.map(gig => gig._id));
    }
  };

  const filteredGigs = gigs.filter(gig => {
    if (filter === 'all') return true;
    
    // Mapping des statuts pour la compatibilité
    const statusMapping: { [key: string]: string[] } = {
      'pending': ['pending', 'to_activate', 'draft', 'submitted'],
      'approved': ['approved', 'active', 'published'],
      'rejected': ['rejected', 'declined', 'cancelled']
    };
    
    const validStatuses = statusMapping[filter] || [filter];
    const isMatch = validStatuses.includes(gig.status);
    
    console.log(`🔍 Filtering gig ${gig._id} (${gig.title}): status="${gig.status}", filter="${filter}", validStatuses=${JSON.stringify(validStatuses)}, isMatch=${isMatch}`);
    
    return isMatch;
  });
  
  console.log('🔍 Filtered gigs:', { 
    filter, 
    totalGigs: gigs.length, 
    filteredCount: filteredGigs.length,
    gigs: filteredGigs.map(g => ({ id: g._id, title: g.title, status: g.status }))
  });

  const formatDate = (dateString: string) => {
    console.log('📅 Formatting date:', dateString);
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    let result;
    if (diffInHours < 1) result = 'Just now';
    else if (diffInHours < 24) result = `${diffInHours} hours ago`;
    else {
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays === 1) result = '1 day ago';
      else result = `${diffInDays} days ago`;
    }
    
    console.log('📅 Formatted result:', result);
    return result;
  };

  if (isLoading) {
    console.log('⏳ Rendering loading state');
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Approval & Publishing</h1>
        </div>
        <div className="rounded-lg bg-white shadow p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading gigs...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    console.log('❌ Rendering error state:', error);
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Approval & Publishing</h1>
        </div>
        <div className="rounded-lg bg-white shadow p-8">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto" />
            <p className="mt-2 text-red-600">{error}</p>
            <button 
              onClick={fetchGigs}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  console.log('🎨 Rendering main component with', gigs.length, 'gigs');
  
  return (
    <div className="space-y-6">
      {/* Back to Onboarding Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              console.log('⬅️ Back to onboarding clicked');
              // Navigation logic would go here
              window.history.back();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Onboarding
          </button>
          <div className="h-6 w-px bg-gray-300"></div>
          <h1 className="text-2xl font-bold text-gray-900">Approval & Publishing</h1>
        </div>
        <div className="flex space-x-2">
          <button 
            className={`rounded-lg px-4 py-2 ${selectedGigs.length > 0 ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
            disabled={selectedGigs.length === 0}
            onClick={() => console.log('🟢 Approve Selected clicked, selected gigs:', selectedGigs)}
          >
            Approve Selected
          </button>
          <button 
            className={`rounded-lg px-4 py-2 ${selectedGigs.length > 0 ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
            disabled={selectedGigs.length === 0}
            onClick={() => console.log('🔴 Reject Selected clicked, selected gigs:', selectedGigs)}
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
          onClick={() => {
            console.log('🔍 Filter changed to: all');
            setFilter('all');
          }}
        >
          All
        </button>
        <button
          className={`flex-1 rounded-md py-2 text-sm font-medium ${
            filter === 'pending' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'
          }`}
          onClick={() => {
            console.log('🔍 Filter changed to: pending');
            setFilter('pending');
          }}
        >
          Pending
        </button>
        <button
          className={`flex-1 rounded-md py-2 text-sm font-medium ${
            filter === 'approved' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'
          }`}
          onClick={() => {
            console.log('🔍 Filter changed to: approved');
            setFilter('approved');
          }}
        >
          Approved
        </button>
        <button
          className={`flex-1 rounded-md py-2 text-sm font-medium ${
            filter === 'rejected' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'
          }`}
          onClick={() => {
            console.log('🔍 Filter changed to: rejected');
            setFilter('rejected');
          }}
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
              <div key={gig._id} className="hover:bg-gray-50">
                <div className="flex items-center p-4">
                  <div className="mr-3">
                    <button onClick={() => toggleSelectGig(gig._id)}>
                      {selectedGigs.includes(gig._id) ? (
                        <CheckSquare className="h-5 w-5 text-indigo-600" />
                      ) : (
                        <Square className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                  <div 
                    className="flex flex-1 cursor-pointer items-center justify-between"
                    onClick={() => toggleGig(gig._id)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 flex-shrink-0 rounded-full bg-indigo-100 flex items-center justify-center">
                        <Briefcase className="h-6 w-6 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="text-base font-medium text-gray-900">{gig.title}</h3>
                        <p className="text-sm text-gray-500">
                          {gig.category || 'No category'}
                          {gig.budget && ` • ${gig.budget}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      {(gig.status === 'pending' || gig.status === 'to_activate' || gig.status === 'draft' || gig.status === 'submitted') && (
                        <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                          <Clock className="mr-1 h-3 w-3" />
                          {gig.status === 'to_activate' ? 'To Activate' : gig.status === 'draft' ? 'Draft' : gig.status === 'submitted' ? 'Submitted' : 'Pending'}
                        </span>
                      )}
                      {(gig.status === 'approved' || gig.status === 'active' || gig.status === 'published') && (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          {gig.status === 'active' ? 'Active' : gig.status === 'published' ? 'Published' : 'Approved'}
                        </span>
                      )}
                      {(gig.status === 'rejected' || gig.status === 'declined' || gig.status === 'cancelled') && (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                          <XCircle className="mr-1 h-3 w-3" />
                          {gig.status === 'declined' ? 'Declined' : gig.status === 'cancelled' ? 'Cancelled' : 'Rejected'}
                        </span>
                      )}
                      {expandedGig === gig._id ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>
                
                {expandedGig === gig._id && (
                  <div className="border-t border-gray-100 bg-gray-50 p-4">
                    <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div>
                        <p className="text-xs font-medium text-gray-500">Company</p>
                        <p className="text-sm font-medium text-gray-900">{company?.name || gig.submittedBy || 'Company'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500">Created</p>
                        <p className="text-sm font-medium text-gray-900">{formatDate(gig.createdAt)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500">Status</p>
                        <p className="text-sm font-medium text-gray-900 capitalize">{gig.status}</p>
                      </div>
                    </div>
                    
                    {gig.description && (
                      <div className="mb-4">
                        <p className="text-xs font-medium text-gray-500">Description</p>
                        <p className="text-sm text-gray-900 mt-1">{gig.description}</p>
                      </div>
                    )}
                    
                    {gig.issues && gig.issues.length > 0 && (
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
                      
                      {(gig.status === 'pending' || gig.status === 'to_activate' || gig.status === 'draft' || gig.status === 'submitted') && (
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