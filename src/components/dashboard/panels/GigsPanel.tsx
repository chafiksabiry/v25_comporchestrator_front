import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import '../styles/modal.css';
import {
  Briefcase,
  Calendar,
  DollarSign,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Filter,
  Search,
  Plus,
  MapPin,
  Building2,
  Tags,
} from "lucide-react";
import Cookies from 'js-cookie';
import axios from 'axios';
import countries from 'i18n-iso-countries';
import { GigsTableSkeleton, PanelHeaderSkeleton } from "../components/common/Skeleton";

interface Gig {
  _id: string;
  title: string;
  description: string;
  category: string;
  userId: string;
  companyId: string;
  destination_zone: string;
  seniority: {
    level: string;
    yearsExperience: string;
  };
  schedule: {
    days: string[];
    hours: string;
    timeZones: string[];
    flexibility: string[];
  };
  commission: {
    minimumVolume: {
      amount: string;
      period: string;
      unit: string;
    };
    transactionCommission: {
      type: string;
      amount: string;
    };
    base: string;
    baseAmount: string;
    bonus: string;
    bonusAmount: string;
    currency: string;
  };
  skills: {
    professional: string[];
    languages: string[];
    technical: string[];
    soft: string[];
  };
  duration?: {
    startDate: string;
    endDate: string;
  };
  createdAt: string;
  updatedAt: string;
}


function GigsPanel() {
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState<string>("");
  const [selectedGig, setSelectedGig] = useState<Gig | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'edit' | 'show'>('show');

  const [gigs, setGigs] = useState<Gig[]>([]);
  const [data, setData] = useState<any[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [editedGig, setEditedGig] = useState<Gig | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-600";
      case "assigned":
        return "bg-rose-100 text-rose-500";
      case "completed":
        return "bg-gray-100 text-gray-600";
      case "cancelled":
        return "bg-red-100 text-red-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };


  const companyId = Cookies.get('userId');

  // const fetchCompanyDetails = async () => {
  //   try {
  //     const response = await axios.get(
  //       `${import.meta.env.VITE_BACKEND_URL_COMPANY}/companies/${companyId}`
  //     );
  //     setCompanyName(response.data.data.name);
  //   } catch (err) {
  //     console.error("Error loading company details:", err);
  //   }
  // };

  const fetchGigsByUserId = async () => {
    try {
      setLoading(true);
      const userId: string = Cookies.get('userId') || '680a27ffefa3d29d628d0016';
      const apiUrl = `${import.meta.env.VITE_API_URL_GIGS}/gigs/user/${userId}`;

      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();

      let gigsArray = null;
      if (Array.isArray(data)) {
        gigsArray = data;
      } else if (data.data && Array.isArray(data.data)) {
        gigsArray = data.data;
      } else if (data.gigs && Array.isArray(data.gigs)) {
        gigsArray = data.gigs;
      } else if (data.data) {
        gigsArray = [data.data];
      }

      if (gigsArray) {
        const realGigs = gigsArray.filter((gig: any) =>
          gig && typeof gig === 'object' && (gig._id || gig.id) && !String(gig._id || gig.id).startsWith('gig_mock')
        );
        setGigs(realGigs);
      } else {
        console.warn('⚠️ No valid gigs array found in response:', data);
        setGigs([]);
      }
    } catch (error) {
      console.error("❌ fetchGigsByUserId Error:", error);
      setGigs([]);
    } finally {
      setLoading(false);
    }
  };

  // useEffect(() => {
  //   fetchCompanyDetails();
  // }, [companyId]);

  useEffect(() => {
    fetchGigsByUserId();
  }, [companyId]);

  useEffect(() => {
    // Initialize the countries package with French language
    const frLocale = {
      locale: 'fr',
      countries: {
        "MA": "Maroc",
        "FR": "France",
        "US": "États-Unis",
        "GB": "Royaume-Uni",
        "DE": "Allemagne",
        "ES": "Espagne",
        "IT": "Italie",
        "BE": "Belgique",
        "CA": "Canada",
        "CH": "Suisse",
        "DZ": "Algérie",
        "TN": "Tunisie",
        "SN": "Sénégal",
        "CI": "Côte d'Ivoire",
        "CM": "Cameroun",
        "ML": "Mali",
        "BF": "Burkina Faso",
        "BJ": "Bénin",
        "TG": "Togo",
        "NE": "Niger",
        "CD": "République démocratique du Congo",
        "CG": "Congo",
        "GA": "Gabon",
        "GN": "Guinée",
        "MR": "Mauritanie",
        "MG": "Madagascar",
        "MU": "Maurice",
        "RE": "Réunion",
        "YT": "Mayotte",
        "NC": "Nouvelle-Calédonie",
        "PF": "Polynésie française",
        "GF": "Guyane française",
        "GP": "Guadeloupe",
        "MQ": "Martinique",
        "BL": "Saint-Barthélemy",
        "MF": "Saint-Martin",
        "PM": "Saint-Pierre-et-Miquelon",
        "WF": "Wallis-et-Futuna"
      }
    };

    countries.registerLocale(frLocale);
  }, []);

  const countryNames: { [key: string]: string } = {
    "MA": "Morocco",
    "FR": "France",
    "US": "United States",
    "GB": "United Kingdom",
    "DE": "Germany",
    "ES": "Spain",
    "IT": "Italy",
    "BE": "Belgium",
    "CA": "Canada",
    "CH": "Switzerland",
    "DZ": "Algeria",
    "TN": "Tunisia",
    "SN": "Senegal",
    "CI": "Ivory Coast",
    "CM": "Cameroon",
    "ML": "Mali",
    "BF": "Burkina Faso",
    "BJ": "Benin",
    "TG": "Togo",
    "NE": "Niger",
    "CD": "Democratic Republic of the Congo",
    "CG": "Congo",
    "GA": "Gabon",
    "GN": "Guinea",
    "MR": "Mauritania",
    "MG": "Madagascar",
    "MU": "Mauritius",
    "RE": "Réunion",
    "YT": "Mayotte",
    "NC": "New Caledonia",
    "PF": "French Polynesia",
    "GF": "French Guiana",
    "GP": "Guadeloupe",
    "MQ": "Martinique",
    "BL": "Saint Barthélemy",
    "MF": "Saint Martin",
    "PM": "Saint Pierre and Miquelon",
    "WF": "Wallis and Futuna"
  };

  const getCountryName = (destinationZone: any) => {
    if (typeof destinationZone === 'string') {
      return countryNames[destinationZone] || destinationZone;
    }
    if (destinationZone?.name?.common) {
      return destinationZone.name.common;
    }
    if (destinationZone?.cca2) {
      return countryNames[destinationZone.cca2] || destinationZone.cca2;
    }
    return 'Unknown location';
  };

  const handleEdit = (gig: Gig) => {
    // Rediriger directement vers le formulaire de création en mode édition
    window.location.href = `/app6?edit=true&gigId=${gig._id}&section=basic`;
  };

  const handleInputChange = (field: string, value: any) => {
    if (!editedGig) return;

    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      const parentObj = editedGig[parent as keyof Gig] as Record<string, any>;
      setEditedGig({
        ...editedGig,
        [parent]: {
          ...parentObj,
          [child]: value
        }
      });
    } else {
      setEditedGig({
        ...editedGig,
        [field]: value
      });
    }
  };

  const handleSaveChanges = async () => {
    if (!editedGig) return;

    try {
      console.log('Sending update request for gig:', editedGig);

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL_GIGS}/${editedGig._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(editedGig),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Server response:', {
          status: response.status,
          statusText: response.statusText,
          data: data
        });
        throw new Error(data.message || `Failed to update gig: ${response.status} ${response.statusText}`);
      }

      // Update the gigs list with the edited gig
      setGigs(gigs.map(gig =>
        gig._id === editedGig._id ? editedGig : gig
      ));

      // Show success message
      Swal.fire({
        title: 'Success!',
        text: 'Gig updated successfully',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });

      closeModal();
    } catch (error) {
      console.error('Error updating gig:', error);
      Swal.fire({
        title: 'Error!',
        text: error instanceof Error ? error.message : 'Failed to update gig',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    }
  };

  const handleDelete = async (gigId: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL_GIGS}/${gigId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete gig');
        }

        setGigs(gigs.filter(gig => gig._id !== gigId));

        Swal.fire(
          'Deleted!',
          'The gig has been deleted.',
          'success'
        );
      } catch (error) {
        console.error("Error deleting gig:", error);
        Swal.fire(
          'Error!',
          'Failed to delete the gig.',
          'error'
        );
      }
    }
  };

  const handleShow = (gig: Gig) => {
    // Navigate to the gig details page instead of opening a modal
    navigate(`/gigs/${gig._id}`);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedGig(null);
  };

  const filteredGigs = gigs.filter(gig => {
    if (activeFilter === "available") {
      if (!gig.duration?.endDate) return true;
      const endDate = new Date(gig.duration.endDate);
      const now = new Date();
      return endDate > now;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-100 rounded-lg">
              <Briefcase className="w-6 h-6 text-rose-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Gig Management</h2>
              {companyName && (
                <p className="text-sm text-gray-500">Company: {companyName}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => (window.location.href = "/app6")}
            className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Gig
          </button>
        </div>



        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search gigs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>
            <Filter className="w-5 h-5 text-gray-400" />
          </div>

          <div className="flex gap-2">
            {["all", "available"].map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-2 rounded-lg ${activeFilter === filter
                  ? "bg-rose-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-4">
            <PanelHeaderSkeleton />
            <GigsTableSkeleton rows={5} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b bg-gray-50">
                  <th className="pb-4 pt-4 px-4 font-semibold text-gray-700">Gig Details</th>
                  <th className="pb-4 pt-4 px-4 font-semibold text-gray-700">Category</th>
                  <th className="pb-4 pt-4 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredGigs && filteredGigs.length > 0 ? (
                  filteredGigs.map((gig, idx) => (
                    <tr key={gig._id} className={`transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-rose-50`}>
                      <td className="py-4 px-4 align-middle">
                        <div>
                          <div className="font-semibold text-gray-900 text-base mb-1">
                            {gig?.title || 'No title'}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <MapPin className="w-4 h-4 text-orange-400" />
                            {gig?.destination_zone ? getCountryName(gig.destination_zone) : 'No location specified'}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 align-middle">
                        <span className="inline-block px-3 py-1 rounded-full bg-rose-100 text-rose-600 text-xs font-medium shadow-sm">
                          {gig?.category || 'Not specified'}
                        </span>
                      </td>
                      {/* <td className="py-4 px-4 align-middle">
                        <div className="flex flex-wrap gap-1">
                          {gig?.skills?.professional?.length > 0 ? (
                            gig.skills.professional.map((skill: string) => (
                              <span key={skill} className="px-2 py-1 bg-gray-200 text-gray-700 rounded-full text-xs font-medium">
                                {skill}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-400">No skills specified</span>
                          )}
                        </div>
                      </td> */}
                      <td className="py-4 px-4 align-middle">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleShow(gig)}
                            className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition"
                            title="View Details"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleEdit(gig)}
                            className="p-2 text-rose-500 hover:bg-rose-100 rounded-lg transition"
                            title="Edit"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(gig._id)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition"
                            title="Delete"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-4 text-gray-500">
                      No gigs available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && selectedGig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 modal-fade-in">
          <div className="bg-white rounded-xl p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl transform transition-all duration-300 ease-in-out modal-slide-in">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-100 rounded-lg">
                  <Briefcase className="w-6 h-6 text-rose-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">
                  {modalMode === 'edit' ? 'Edit Gig' : 'Gig Details'}
                </h2>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500 hover:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-rose-400" />
                    Basic Information
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Title</label>
                      {modalMode === 'edit' ? (
                        <input
                          type="text"
                          value={editedGig?.title || ''}
                          onChange={(e) => handleInputChange('title', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-400 focus:border-rose-400"
                        />
                      ) : (
                        <p className="text-gray-800 font-medium">{selectedGig.title}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Category</label>
                      {modalMode === 'edit' ? (
                        <input
                          type="text"
                          value={editedGig?.category || ''}
                          onChange={(e) => handleInputChange('category', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-400 focus:border-rose-400"
                        />
                      ) : (
                        <span className="inline-block px-3 py-1 bg-rose-100 text-rose-600 rounded-full text-sm font-medium">
                          {selectedGig.category}
                        </span>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Location</label>
                      <div className="flex items-center gap-2 text-gray-800">
                        <MapPin className="w-4 h-4 text-rose-400" />
                        {getCountryName(selectedGig.destination_zone)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-500" />
                    Commission Details
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Base Rate</label>
                      {modalMode === 'edit' ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={editedGig?.commission.baseAmount || ''}
                            onChange={(e) => handleInputChange('commission.baseAmount', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-400 focus:border-rose-400"
                            placeholder="Amount"
                          />
                          <select
                            value={editedGig?.commission.base || ''}
                            onChange={(e) => handleInputChange('commission.base', e.target.value)}
                            className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-400 focus:border-rose-400"
                          >
                            <option value="hour">per hour</option>
                            <option value="day">per day</option>
                            <option value="week">per week</option>
                            <option value="month">per month</option>
                          </select>
                        </div>
                      ) : (
                        <p className="text-gray-800 font-medium">
                          {selectedGig.commission.currency?.symbol || selectedGig.commission.currency?.code || '€'} {selectedGig.commission.baseAmount}/{selectedGig.commission.base}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-rose-400" />
                  Schedule
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Working Days</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedGig.availability?.schedule?.map((schedule, index) => (
                        <span key={index} className="px-3 py-1 bg-rose-100 text-rose-600 rounded-full text-sm">
                          {schedule.day}
                        </span>
                      )) || <span className="text-gray-500">No schedule specified</span>}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Hours</label>
                    <p className="text-gray-800">
                      {selectedGig.availability?.schedule?.[0]?.hours ?
                        `${selectedGig.availability.schedule[0].hours.start} - ${selectedGig.availability.schedule[0].hours.end}` :
                        'Hours not specified'
                      }
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Time Zone</label>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 bg-rose-100 text-rose-600 rounded-full text-sm">
                        {selectedGig.availability?.time_zone?.zoneName || 'Not specified'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Tags className="w-5 h-5 text-purple-500" />
                  Skills & Requirements
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Professional Skills</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedGig.skills?.professional?.map((skill, index) => (
                        <span key={index} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                          {skill.skill?.name || skill.name || 'Unknown skill'}
                        </span>
                      )) || <span className="text-gray-500">No professional skills specified</span>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Technical Skills</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedGig.skills?.technical?.map((skill, index) => (
                        <span key={index} className="px-3 py-1 bg-rose-100 text-rose-600 rounded-full text-sm">
                          {skill.skill?.name || skill.name || 'Unknown skill'}
                        </span>
                      )) || <span className="text-gray-500">No technical skills specified</span>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Soft Skills</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedGig.skills?.soft?.map((skill, index) => (
                        <span key={index} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                          {skill.skill?.name || skill.name || 'Unknown skill'}
                        </span>
                      )) || <span className="text-gray-500">No soft skills specified</span>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Languages</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedGig.skills?.languages?.map((lang, index) => (
                        <span key={index} className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
                          {lang.language?.name || lang.languageName || 'Unknown language'} ({lang.proficiency || 'N/A'})
                        </span>
                      )) || <span className="text-gray-500">No languages specified</span>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5 text-orange-500" />
                  Seniority Level
                </h3>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                    {selectedGig.seniority?.level || 'Not specified'}
                  </span>
                  <span className="text-gray-600">
                    ({selectedGig.seniority?.yearsExperience || '0'} years experience)
                  </span>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-rose-400" />
                  Industries
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedGig.industries?.map((industry, index) => (
                    <span key={index} className="px-3 py-1 bg-rose-100 text-rose-600 rounded-full text-sm">
                      {industry.name || 'Unknown industry'}
                    </span>
                  )) || <span className="text-gray-500">No industries specified</span>}
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-green-500" />
                  Activities
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedGig.activities?.map((activity, index) => (
                    <span key={index} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                      {activity.name || 'Unknown activity'}
                    </span>
                  )) || <span className="text-gray-500">No activities specified</span>}
                </div>
              </div>

              {modalMode === 'edit' && (
                <div className="flex justify-end gap-4 mt-6 pt-4 border-t">
                  <button
                    onClick={closeModal}
                    className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveChanges}
                    className="px-6 py-2.5 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors duration-200 font-medium flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Save Changes
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GigsPanel;
