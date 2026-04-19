import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  DollarSign,
  Users,
  Tags,
  Building2,
  Globe,
  Phone,
  ArrowRightLeft,
  Star,
  Target
} from 'lucide-react';
import { Skeleton } from '../components/common/Skeleton';

interface GigDetails {
  _id: string;
  title: string;
  description: string;
  category: string;
  destination_zone: {
    name: {
      common: string;
    };
    cca2: string;
  };
  seniority: {
    level: string;
    yearsExperience: string;
  };
  skills: {
    professional: Array<{
      skill: {
        name: string;
        description: string;
        category: string;
      };
      level: number;
    }>;
    technical: Array<{
      skill: {
        name: string;
        description: string;
        category: string;
      };
      level: number;
    }>;
    soft: Array<{
      skill: {
        name: string;
        description: string;
        category: string;
      };
      level: number;
    }>;
    languages: Array<{
      language: {
        name: string;
        nativeName: string;
      };
      proficiency: string;
    }>;
  };
  availability: {
    schedule: Array<{
      day: string;
      hours: {
        start: string;
        end: string;
      };
    }>;
    time_zone: {
      zoneName: string;
      countryName: string;
    };
    flexibility: string[];
  };
  commission: {
    commission_per_call?: number;
    transactionCommission?: number;
    bonusAmount?: string;
    currency?: {
      symbol: string;
      code: string;
      name: string;
    };
    minimumVolume?: {
      amount: string;
      period: string;
      unit: string;
    };
    additionalDetails?: string;
  };
  industries: Array<{
    name: string;
    description: string;
  }>;
  activities: Array<{
    name: string;
    description: string;
    category: string;
  }>;
  status: string;
  createdAt: string;
  updatedAt: string;
}

function GigDetailsPanel() {
  const { gigId } = useParams<{ gigId: string }>();
  const navigate = useNavigate();
  const [gig, setGig] = useState<GigDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGigDetails = async () => {
      if (!gigId) {
        setError('No gig ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(`${import.meta.env.VITE_GIGS_API}/gigs/${gigId}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch gig details: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Gig details:', data);

        if (data.message === "Gig retrieved successfully" && data.data) {
          setGig(data.data);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (error) {
        console.error('Error fetching gig details:', error);
        setError('Failed to load gig details');
      } finally {
        setLoading(false);
      }
    };

    fetchGigDetails();
  }, [gigId]);

  const handleBack = () => {
    navigate('/gigs');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header skeleton */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4 h-16">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-3 w-20 opacity-60" />
              </div>
            </div>
          </div>
        </div>

        {/* Content skeleton */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Info */}
              <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6 opacity-70" />
                <Skeleton className="h-4 w-4/5 opacity-60" />
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-6 w-28 rounded-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              </div>
              {/* Commission cards */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <Skeleton className="h-5 w-32 mb-6" />
                <div className="grid grid-cols-2 gap-4">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="rounded-xl border p-4 space-y-3">
                      <Skeleton className="h-9 w-9 rounded-lg" />
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-7 w-16" />
                    </div>
                  ))}
                </div>
              </div>
              {/* Skills */}
              <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
                <Skeleton className="h-5 w-36" />
                <div className="flex flex-wrap gap-2">
                  {[80, 100, 70, 90, 60].map(w => <Skeleton key={w} className={`h-6 w-${w/4} rounded-full`} />)}
                </div>
                <div className="flex flex-wrap gap-2">
                  {[70, 90, 60].map(w => <Skeleton key={w} className={`h-6 w-${w/4} rounded-full`} />)}
                </div>
              </div>
            </div>
            {/* Sidebar skeleton */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
                <Skeleton className="h-5 w-24" />
                <div className="flex flex-wrap gap-1">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-6 w-16 rounded" />)}
                </div>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-28" />
              </div>
              <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !gig) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error || 'Gig not found'}</p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors"
          >
            Back to Gigs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{gig.title}</h1>
                <p className="text-sm text-gray-500">Gig Details</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${gig.status === 'active' ? 'bg-green-100 text-green-800' :
                gig.status === 'to_activate' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                {gig.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-600 leading-relaxed">{gig.description}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Category</h3>
                    <span className="inline-block px-3 py-1 bg-rose-100 text-rose-500 rounded-full text-sm">
                      {gig.category}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Location</h3>
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="w-4 h-4" />
                      {gig.destination_zone?.name?.common || 'Not specified'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Commission */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-rose-500" />
                Commission
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Per Call Compensation */}
                <div className="flex flex-col p-4 rounded-xl bg-green-50/50 border border-green-100 h-full">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-green-100 rounded-lg text-green-600 flex-shrink-0">
                      <Phone className="w-4 h-4" />
                    </div>
                    <span className="text-sm text-gray-600 font-semibold leading-tight">Per call compensation</span>
                  </div>
                  <div className="mt-auto flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-gray-900">{gig.commission?.commission_per_call || 0}</span>
                    <span className="text-sm font-medium text-gray-500">{gig.commission?.currency?.symbol || '€'}</span>
                  </div>
                </div>

                {/* Transaction Commission */}
                <div className="flex flex-col p-4 rounded-xl bg-purple-50/50 border border-purple-100 h-full">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-purple-100 rounded-lg text-purple-600 flex-shrink-0">
                      <ArrowRightLeft className="w-4 h-4" />
                    </div>
                    <span className="text-sm text-gray-600 font-semibold leading-tight">Transaction Commission</span>
                  </div>
                  <div className="mt-auto flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-gray-900">{gig.commission?.transactionCommission || 0}</span>
                    <span className="text-sm font-medium text-gray-500">{gig.commission?.currency?.symbol || '€'}</span>
                  </div>
                </div>

                {/* Bonus & Incentives */}
                <div className="flex flex-col p-4 rounded-xl bg-amber-50/50 border border-amber-100 h-full">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-amber-100 rounded-lg text-amber-600 flex-shrink-0">
                      <Star className="w-4 h-4" />
                    </div>
                    <span className="text-sm text-gray-600 font-semibold leading-tight">Bonus & Incentives</span>
                  </div>
                  <div className="mt-auto flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-gray-900">{gig.commission?.bonusAmount || 0}</span>
                    <span className="text-sm font-medium text-gray-500">{gig.commission?.currency?.symbol || '€'}</span>
                  </div>
                </div>

                {/* Minimum Volume Requirements For Bonus */}
                <div className="flex flex-col p-4 rounded-xl bg-orange-50/50 border border-orange-100 h-full">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-orange-100 rounded-lg text-orange-600 flex-shrink-0">
                      <Target className="w-4 h-4" />
                    </div>
                    <span className="text-sm text-gray-600 font-semibold leading-tight">Minimum Volume Requirements For Bonus</span>
                  </div>
                  <div className="mt-auto flex items-center gap-2 justify-between">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-gray-900">{gig.commission?.minimumVolume?.amount || 0}</span>
                    </div>
                    <span className="px-2 py-1 bg-white text-gray-500 text-[10px] font-bold rounded shadow-sm border border-orange-100 uppercase tracking-wider">
                      {gig.commission?.minimumVolume?.period || 'Monthly'}
                    </span>
                  </div>
                </div>
              </div>

              {gig.commission?.additionalDetails && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2 uppercase tracking-wider">Additional Details</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{gig.commission.additionalDetails}</p>
                </div>
              )}
            </div>

            {/* Skills */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Tags className="w-5 h-5" />
                Skills & Requirements
              </h2>
              <div className="space-y-6">
                {/* Professional Skills */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Professional Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {gig.skills?.professional?.map((skill, index) => (
                      <span key={index} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                        {skill.skill?.name || 'Unknown skill'}
                      </span>
                    )) || <span className="text-gray-500">No professional skills specified</span>}
                  </div>
                </div>

                {/* Technical Skills */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Technical Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {gig.skills?.technical?.map((skill, index) => (
                      <span key={index} className="px-3 py-1 bg-rose-100 text-rose-600 rounded-full text-sm">
                        {skill.skill?.name || 'Unknown skill'}
                      </span>
                    )) || <span className="text-gray-500">No technical skills specified</span>}
                  </div>
                </div>

                {/* Soft Skills */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Soft Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {gig.skills?.soft?.map((skill, index) => (
                      <span key={index} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                        {skill.skill?.name || 'Unknown skill'}
                      </span>
                    )) || <span className="text-gray-500">No soft skills specified</span>}
                  </div>
                </div>

                {/* Languages */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Languages</h3>
                  <div className="flex flex-wrap gap-2">
                    {gig.skills?.languages?.map((lang, index) => (
                      <span key={index} className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
                        {lang.language?.name || 'Unknown language'} ({lang.proficiency || 'N/A'})
                      </span>
                    )) || <span className="text-gray-500">No languages specified</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Industries & Activities */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Industries & Activities
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Industries</h3>
                  <div className="flex flex-wrap gap-2">
                    {gig.industries?.map((industry, index) => (
                      <span key={index} className="px-3 py-1 bg-rose-100 text-rose-600 rounded-full text-sm">
                        {industry.name || 'Unknown industry'}
                      </span>
                    )) || <span className="text-gray-500">No industries specified</span>}
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Activities</h3>
                  <div className="flex flex-wrap gap-2">
                    {gig.activities?.map((activity, index) => (
                      <span key={index} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                        {activity.name || 'Unknown activity'}
                      </span>
                    )) || <span className="text-gray-500">No activities specified</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">

            {/* Schedule */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Schedule
              </h2>
              <div className="space-y-3">
                <div>
                  <h3 className="font-medium text-gray-900">Working Days</h3>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {gig.availability?.schedule?.map((schedule, index) => (
                      <span key={index} className="px-2 py-1 bg-rose-100 text-rose-600 rounded text-xs">
                        {schedule.day}
                      </span>
                    )) || <span className="text-gray-500 text-sm">No schedule specified</span>}
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Hours</h3>
                  <p className="text-gray-600 text-sm">
                    {gig.availability?.schedule?.[0]?.hours ?
                      `${gig.availability.schedule[0].hours.start} - ${gig.availability.schedule[0].hours.end}` :
                      'Hours not specified'
                    }
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Time Zone</h3>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Globe className="w-4 h-4" />
                    <span className="text-sm">{gig.availability?.time_zone?.zoneName || 'Not specified'}</span>
                  </div>
                </div>
                {gig.availability?.flexibility && gig.availability.flexibility.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-900">Flexibility</h3>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {gig.availability.flexibility.map((flex, index) => (
                        <span key={index} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                          {flex}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Seniority */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Seniority
              </h2>
              <div className="space-y-3">
                <div>
                  <h3 className="font-medium text-gray-900">Level</h3>
                  <span className="inline-block px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                    {gig.seniority?.level || 'Not specified'}
                  </span>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Experience</h3>
                  <p className="text-gray-600">
                    {gig.seniority?.yearsExperience || '0'} years
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default GigDetailsPanel;
