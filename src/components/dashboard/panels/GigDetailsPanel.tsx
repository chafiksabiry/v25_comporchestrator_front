import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Skeleton } from '../components/common/Skeleton';
import { GigReview } from '../../gigsaicreation/components/GigReview';

function GigDetailsPanel() {
  const { gigId } = useParams<{ gigId: string }>();
  const navigate = useNavigate();
  const [gig, setGig] = useState<any>(null);
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
        console.log('Gig details raw response:', data);

        if (data.message === "Gig retrieved successfully" && data.data) {
          const rawGig = data.data;

          // Map populated API data back into the flat GigData structure expected by GigReview
          const mappedGig = {
            ...rawGig,
            destination_zone: rawGig.destination_zone?._id || rawGig.destination_zone?.cca2 || rawGig.destination_zone,
            commission: {
              ...rawGig.commission,
              currency: rawGig.commission?.currency?._id || rawGig.commission?.currency
            },
            skills: {
              ...rawGig.skills,
              professional: rawGig.skills?.professional?.map((s: any) => ({
                skill: s.skill?._id || s.skill,
                level: s.level || 50
              })) || [],
              technical: rawGig.skills?.technical?.map((s: any) => ({
                skill: s.skill?._id || s.skill,
                level: s.level || 50
              })) || [],
              soft: rawGig.skills?.soft?.map((s: any) => ({
                skill: s.skill?._id || s.skill,
                level: s.level || 50
              })) || [],
              languages: rawGig.skills?.languages?.map((l: any) => ({
                language: l.language?._id || l.language,
                proficiency: l.proficiency || 'Intermediate',
                iso639_1: l.language?.iso639_1 || 'en'
              })) || []
            },
            industries: rawGig.industries?.map((i: any) => i._id || i) || [],
            activities: rawGig.activities?.map((a: any) => a._id || a) || [],
            schedule: {
               ...rawGig.schedule,
               schedules: rawGig.availability?.schedule?.map((s: any) => ({
                  day: s.day,
                  hours: s.hours
               })) || []
            }
          };

          setGig(mappedGig);
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
            <span className="text-red-500 font-bold text-2xl">!</span>
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
    <div className="w-full h-full">
      <GigReview 
        data={gig as any}
        isReadOnly={true}
        onBack={handleBack}
        onEdit={() => {}}
        onSubmit={async () => {}}
        isSubmitting={false}
      />
    </div>
  );
}

export default GigDetailsPanel;
