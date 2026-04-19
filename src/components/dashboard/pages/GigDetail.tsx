import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Calendar,
  Clock,
  DollarSign,
  Users,
  MapPin,
  Building2,
  Tags,
  ArrowLeft,
  Save,
  X
} from "lucide-react";
import Swal from 'sweetalert2';

interface Gig {
  _id: string;
  companyId: string;
  companyName: string;
  title: string;
  description: string;
  industry: string;
  requiredSkills: string[];
  preferredLanguages: string[];
  requiredExperience: number;
  expectedConversionRate: number;
  compensation: {
    base: number;
    commission: number;
  };
  duration: {
    startDate: string;
    endDate: string;
  };
  timezone: string;
  targetRegion: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

function GigDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const action = searchParams.get('action');
  const [gig, setGig] = useState<Gig | null>(null);
  const [isEditing, setIsEditing] = useState(action === 'edit');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGig = async () => {
      try {
        if (!id) {
          throw new Error('No gig ID provided');
        }

        setLoading(true);
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL_GIGS}/gigs/${id}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch gig');
        }

        const { data } = await response.json();
        if (!data) {
          throw new Error('Gig not found');
        }
        setGig(data);
      } catch (error) {
        console.error('Error fetching gig:', error);
        Swal.fire({
          title: 'Error!',
          text: error instanceof Error ? error.message : 'Failed to load gig details. Please try again later.',
          icon: 'error',
          confirmButtonText: 'OK'
        }).then(() => {
          navigate(-1);
        });
      } finally {
        setLoading(false);
      }
    };

    fetchGig();
  }, [id, navigate]);

  const handleSave = async () => {
    try {
      if (!gig) return;

      // Validate required fields
      if (!gig.title || !gig.description) {
        Swal.fire({
          title: 'Validation Error',
          text: 'Title and description are required fields',
          icon: 'error',
          confirmButtonText: 'OK',
          showClass: {
            popup: '',
            backdrop: ''
          },
          hideClass: {
            popup: '',
            backdrop: ''
          },
          allowOutsideClick: false,
          allowEscapeKey: false,
          allowEnterKey: false,
          stopKeydownPropagation: false
        });
        return;
      }

      // Prepare the data for the API
      const gigData = {
        title: gig.title,
        description: gig.description,
        industry: gig.industry,
        requiredSkills: gig.requiredSkills,
        preferredLanguages: gig.preferredLanguages,
        requiredExperience: gig.requiredExperience,
        expectedConversionRate: gig.expectedConversionRate,
        compensation: {
          base: gig.compensation.base,
          commission: gig.compensation.commission
        },
        duration: {
          startDate: gig.duration.startDate,
          endDate: gig.duration.endDate
        },
        timezone: gig.timezone,
        targetRegion: gig.targetRegion,
        status: gig.status
      };

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL_GIGS}/gigs/${gig._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(gigData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        throw new Error(errorData.message || `Failed to update gig (Status: ${response.status})`);
      }

      const { data } = await response.json();
      setGig(data);
      setIsEditing(false);

      // Show success message and navigate back
      await Swal.fire({
        title: 'Success!',
        text: 'Gig updated successfully',
        icon: 'success',
        confirmButtonText: 'OK',
        showClass: {
          popup: '',
          backdrop: ''
        },
        hideClass: {
          popup: '',
          backdrop: ''
        },
        allowOutsideClick: false,
        allowEscapeKey: false,
        allowEnterKey: false,
        stopKeydownPropagation: false
      });

      // Navigate back to the gigs list
      navigate('/gigs');
    } catch (error) {
      console.error('Error saving gig:', error);
      Swal.fire({
        title: 'Error!',
        text: error instanceof Error ? error.message : 'Failed to update gig. Please check the console for more details.',
        icon: 'error',
        confirmButtonText: 'OK',
        showClass: {
          popup: '',
          backdrop: ''
        },
        hideClass: {
          popup: '',
          backdrop: ''
        },
        allowOutsideClick: false,
        allowEscapeKey: false,
        allowEnterKey: false,
        stopKeydownPropagation: false
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  if (!gig) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Gig Not Found</h2>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-rose-500 hover:text-rose-500 transition-colors duration-200"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </button>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-gradient-to-r from-rose-500 to-purple-600 text-white rounded-lg hover:from-rose-600 hover:to-purple-700 transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
            >
              <Save className="w-4 h-4" />
              Edit
            </button>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-xl p-8 backdrop-blur-lg bg-opacity-90">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <Briefcase className="w-6 h-6 text-rose-500" />
                <h2 className="text-3xl font-bold bg-gradient-to-r from-rose-500 to-purple-600 bg-clip-text text-transparent">
                  {isEditing ? (
                    <input
                      type="text"
                      value={gig.title}
                      onChange={(e) => setGig({ ...gig, title: e.target.value })}
                      className="w-full p-2 border-2 border-rose-200 rounded-lg focus:ring-2 focus:ring-rose-400 focus:border-rose-400 transition-all duration-200"
                    />
                  ) : (
                    gig.title
                  )}
                </h2>
              </div>
              
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-rose-400" />
                  <div className="flex-1">
                    <label className="text-sm text-rose-500 block mb-1">Company</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={gig.companyName}
                        onChange={(e) => setGig({ ...gig, companyName: e.target.value })}
                        className="w-full p-2 border-2 border-rose-200 rounded-lg focus:ring-2 focus:ring-rose-400 focus:border-rose-400 transition-all duration-200"
                      />
                    ) : (
                      <p className="font-medium text-rose-500">{gig.companyName}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Tags className="w-5 h-5 text-rose-400 mt-1" />
                  <div className="flex-1">
                    <label className="text-sm text-rose-500 block mb-1">Description</label>
                    {isEditing ? (
                      <textarea
                        value={gig.description}
                        onChange={(e) => setGig({ ...gig, description: e.target.value })}
                        className="w-full p-2 border-2 border-rose-200 rounded-lg focus:ring-2 focus:ring-rose-400 focus:border-rose-400 transition-all duration-200 min-h-[120px]"
                        rows={4}
                      />
                    ) : (
                      <p className="text-rose-500 leading-relaxed">{gig.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-rose-400" />
                  <div className="flex-1">
                    <label className="text-sm text-rose-500 block mb-1">Industry</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={gig.industry}
                        onChange={(e) => setGig({ ...gig, industry: e.target.value })}
                        className="w-full p-2 border-2 border-rose-200 rounded-lg focus:ring-2 focus:ring-rose-400 focus:border-rose-400 transition-all duration-200"
                      />
                    ) : (
                      <p className="font-medium text-rose-500">{gig.industry}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-rose-400" />
                  <div className="flex-1">
                    <label className="text-sm text-rose-500 block mb-1">Base Salary</label>
                    {isEditing ? (
                      <input
                        type="number"
                        value={gig.compensation.base}
                        onChange={(e) => setGig({
                          ...gig,
                          compensation: { ...gig.compensation, base: Number(e.target.value) }
                        })}
                        className="w-full p-2 border-2 border-rose-200 rounded-lg focus:ring-2 focus:ring-rose-400 focus:border-rose-400 transition-all duration-200"
                      />
                    ) : (
                      <p className="font-medium text-rose-500">${gig.compensation.base.toLocaleString()}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-rose-400" />
                  <div className="flex-1">
                    <label className="text-sm text-rose-500 block mb-1">Commission</label>
                    {isEditing ? (
                      <input
                        type="number"
                        value={gig.compensation.commission}
                        onChange={(e) => setGig({
                          ...gig,
                          compensation: { ...gig.compensation, commission: Number(e.target.value) }
                        })}
                        className="w-full p-2 border-2 border-rose-200 rounded-lg focus:ring-2 focus:ring-rose-400 focus:border-rose-400 transition-all duration-200"
                      />
                    ) : (
                      <p className="font-medium text-rose-500">{gig.compensation.commission * 100}%</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-rose-400" />
                <div className="flex-1">
                  <label className="text-sm text-rose-500 block mb-1">Duration</label>
                  {isEditing ? (
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="date"
                        value={gig.duration.startDate.split('T')[0]}
                        onChange={(e) => setGig({
                          ...gig,
                          duration: { ...gig.duration, startDate: e.target.value }
                        })}
                        className="w-full p-2 border-2 border-rose-200 rounded-lg focus:ring-2 focus:ring-rose-400 focus:border-rose-400 transition-all duration-200"
                      />
                      <input
                        type="date"
                        value={gig.duration.endDate.split('T')[0]}
                        onChange={(e) => setGig({
                          ...gig,
                          duration: { ...gig.duration, endDate: e.target.value }
                        })}
                        className="w-full p-2 border-2 border-rose-200 rounded-lg focus:ring-2 focus:ring-rose-400 focus:border-rose-400 transition-all duration-200"
                      />
                    </div>
                  ) : (
                    <p className="font-medium text-rose-500">
                      {new Date(gig.duration.startDate).toLocaleDateString()} - {new Date(gig.duration.endDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Tags className="w-5 h-5 text-rose-400 mt-1" />
                <div className="flex-1">
                  <label className="text-sm text-rose-500 block mb-1">Required Skills</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={gig.requiredSkills.join(', ')}
                      onChange={(e) => setGig({
                        ...gig,
                        requiredSkills: e.target.value.split(',').map(s => s.trim())
                      })}
                      className="w-full p-2 border-2 border-rose-200 rounded-lg focus:ring-2 focus:ring-rose-400 focus:border-rose-400 transition-all duration-200"
                      placeholder="Enter skills separated by commas"
                    />
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {gig.requiredSkills.map((skill) => (
                        <span key={skill} className="px-3 py-1 bg-gradient-to-r from-rose-100 to-purple-100 text-rose-600 rounded-full text-sm font-medium">
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-rose-400 mt-1" />
                <div className="flex-1">
                  <label className="text-sm text-rose-500 block mb-1">Preferred Languages</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={gig.preferredLanguages.join(', ')}
                      onChange={(e) => setGig({
                        ...gig,
                        preferredLanguages: e.target.value.split(',').map(l => l.trim())
                      })}
                      className="w-full p-2 border-2 border-rose-200 rounded-lg focus:ring-2 focus:ring-rose-400 focus:border-rose-400 transition-all duration-200"
                      placeholder="Enter languages separated by commas"
                    />
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {gig.preferredLanguages.map((language) => (
                        <span key={language} className="px-3 py-1 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 rounded-full text-sm font-medium">
                          {language}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {isEditing && (
            <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-rose-100">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-600 rounded-lg hover:from-gray-200 hover:to-gray-300 transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-gradient-to-r from-rose-500 to-purple-600 text-white rounded-lg hover:from-rose-600 hover:to-purple-700 transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GigDetail; 
