import React, { useState, useEffect } from "react";
import axios from "axios";
import Swal from "sweetalert2";

import {
  Building2,
  MapPin,
  Globe,
  Phone,
  Mail,
  CheckCircle2,
  Pencil,
  X,
  Save,
  AlertCircle,
  Target,
  Heart,
  Coffee,
  Trophy,
  Award,
  Users,
  Rocket,
  Briefcase,
  GraduationCap,
  Code,
  Edit2,
  Upload,
  Calendar,
  Factory,
  Linkedin,
  Twitter,
  Facebook,
  Instagram,
  ArrowRight,
} from "lucide-react";
import Cookies from 'js-cookie';

interface CompanyResponse {
  success: boolean;
  message: string;
  data: {
    _id: string;
    name: string;
    industry: string;
    headquarters: string;
    contact: {
      email: string;
      phone: string;
      address: string;
      website: string;
    };
    logoUrl?: string;
    logo?: string;
  };
}

function CompanyProfile() {
  const [company, setCompany] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValues, setTempValues] = useState<Record<string, any>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [showUniquenessPanel, setShowUniquenessPanel] = useState(false);
  const [isStepCompleted, setIsStepCompleted] = useState(false);

  const companyId = Cookies.get('companyId');
  console.log('Stored companyId from cookie:', companyId);

  // Vérifier l'état de l'étape au chargement
  useEffect(() => {
    if (companyId) {
      checkStepStatus();
    }
  }, [companyId]);

  // Vérifier si l'étape peut être marquée comme complétée
  useEffect(() => {
    if (company && !isStepCompleted && hasBasicInfo()) {
      // Si l'entreprise a les informations de base, on peut marquer l'étape comme complétée
      checkStepStatus();
    }
  }, [company, isStepCompleted]);

  const hasBasicInfo = () => {
    return company.name && company.industry && company.contact?.email;
  };

  const checkStepStatus = async () => {
    try {
      if (!companyId) return;
      
      // Vérifier l'état de l'étape 1 (Company Profile) dans la phase 1
      const response = await axios.get(
        `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding/phases/1/steps/1`
      );
      
      if (response.data && response.data.status === 'completed') {
        setIsStepCompleted(true);
        return;
      }
      
      // Vérifier aussi le localStorage pour la cohérence
      const storedProgress = localStorage.getItem('companyOnboardingProgress');
      if (storedProgress) {
        try {
          const progress = JSON.parse(storedProgress);
          if (progress.completedSteps && Array.isArray(progress.completedSteps) && progress.completedSteps.includes(1)) {
            setIsStepCompleted(true);
            return;
          }
        } catch (e) {
          console.error('Error parsing stored progress:', e);
        }
      }
      
      // Si l'étape n'est pas marquée comme complétée mais que les informations de base sont présentes,
      // marquer automatiquement l'étape comme complétée
      if (hasBasicInfo()) {
        try {
          const onboardingResponse = await axios.put(
            `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding/phases/1/steps/1`,
            { status: 'completed' }
          );
          
          console.log('✅ Company Profile step 1 automatically marked as completed:', onboardingResponse.data);
          
          // Mettre à jour l'état local
          setIsStepCompleted(true);
          
          // Mettre à jour le localStorage
          const currentProgress = {
            currentPhase: 1,
            completedSteps: [1],
            lastUpdated: new Date().toISOString()
          };
          localStorage.setItem('companyOnboardingProgress', JSON.stringify(currentProgress));
          
          // Synchroniser avec les cookies
          Cookies.set('companyProfileStepCompleted', 'true', { expires: 7 });
          
        } catch (autoCompleteError) {
          console.error('Error auto-completing step:', autoCompleteError);
        }
      }
      
    } catch (error) {
      console.error('Error checking step status:', error);
    }
  };

  // Helper functions for the new UI
  const hasContactInfo = company.contact && (
    company.contact.email || 
    company.contact.phone || 
    company.contact.website || 
    company.contact.address
  );

  const hasSocialMedia = company.socialMedia && (
    company.socialMedia.linkedin || 
    company.socialMedia.twitter || 
    company.socialMedia.facebook || 
    company.socialMedia.instagram
  );

  const hasLocation = company.location && (
    company.location.lat && 
    company.location.lng
  );

  const getGoogleMapsUrl = () => {
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
    if (company.contact?.address) {
      const encodedAddress = encodeURIComponent(company.contact.address);
      return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodedAddress}`;
    }
    if (hasLocation) {
      return `https://www.google.com/maps/embed/v1/view?key=YOUR_API_KEY&center=${company.location.lat},${company.location.lng}&zoom=15`;
    }
    return null;
  };

  const getGoogleMapsDirectionsUrl = () => {
    if (company.contact?.address) {
      const encodedAddress = encodeURIComponent(company.contact.address);
      return `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
    }
    if (hasLocation) {
      return `https://www.google.com/maps/dir/?api=1&destination=${company.location.lat},${company.location.lng}`;
    }
    return null;
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogoUrl(e.target.value);
  };

  // EditableField component
  const EditableField = ({ 
    value, 
    field, 
    icon: Icon, 
    className = ""
  }: { 
    value: any; 
    field: string; 
    icon?: React.ElementType; 
    className?: string;
  }) => {
    const isEditing = editingField === field && editMode;
    
    const handleFieldEdit = () => {
      if (editMode) {
        setEditingField(field);
        setTempValues((prev) => ({
          ...prev,
          [field]: getNestedValue(company, field) || "",
        }));
      }
    };
    
    const handleFieldSave = () => {
      handleApplyChanges(field);
    };
    
    const handleFieldCancel = () => {
      setEditingField(null);
      setTempValues((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    };
    
    return (
      <div className={`relative ${className}`} onClick={handleFieldEdit}>
        {Icon && !isEditing && <Icon size={18} className="flex-shrink-0" />}
        
        {isEditing ? (
          <div className="mt-2 w-full">
            <input
              type="text"
              value={tempValues[field] || ""}
              onChange={(e) =>
                setTempValues((prev) => ({
                  ...prev,
                  [field]: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
            <div className="absolute right-0 top-full mt-2 flex gap-2">
              <button
                onClick={handleFieldSave}
                className="p-1.5 bg-green-500 text-white rounded-md hover:bg-green-600"
              >
                <CheckCircle2 size={14} />
              </button>
              <button
                onClick={handleFieldCancel}
                className="p-1.5 bg-red-500 text-white rounded-md hover:bg-red-600"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ) : (
          <>
            <span>{value || "Not set"}</span>
            {editMode && (
              <button
                className="absolute -right-3 -top-3 opacity-0 group-hover:opacity-100 p-1 bg-white rounded-full shadow-md text-gray-600 hover:text-indigo-600 transition-all"
                onClick={() => handleFieldEdit()}
              >
                <Pencil size={12} />
              </button>
            )}
          </>
        )}
      </div>
    );
  };

  // Original functions from the existing component
  const fetchCompanyDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get<CompanyResponse>(
        `${import.meta.env.VITE_COMPANY_API_URL}/companies/${companyId}/details`
      );
      setCompany(response.data.data);
      if ((response.data.data as any).logo) {
        setLogoUrl((response.data.data as any).logo);
      } else if (response.data.data.logoUrl) {
        setLogoUrl(response.data.data.logoUrl);
      }
    } catch (err) {
      setError("Erreur lors du chargement des détails de l'entreprise.");
    } finally {
      setLoading(false);
    }
  };


  const handleCancel = () => {
    setEditingField(null);
    setTempValues({});
  };

  const handleApplyChanges = (field: string) => {
    // Handle nested fields (like "contact.email")
    if (field.includes('.')) {
      const parts = field.split('.');
      setCompany((prev) => {
        const newCompany = { ...prev };
        let current = newCompany;
        
        // Navigate to the nested object
        for (let i = 0; i < parts.length - 1; i++) {
          if (!current[parts[i]]) {
            current[parts[i]] = {};
          }
          current = current[parts[i]];
        }
        
        // Set the value on the deepest level
        current[parts[parts.length - 1]] = tempValues[field];
        return newCompany;
      });
    } else {
      // Simple field, use original logic
    setCompany((prev) => ({
      ...prev,
      [field]: tempValues[field],
    }));
    }
    
    setEditingField(null);
    setTempValues({});
    setHasChanges(true);
  };

  const handleSaveAll = async () => {
    try {
      // Sauvegarder les informations de l'entreprise
      await axios.put(
        `${import.meta.env.VITE_COMPANY_API_URL}/companies/${companyId}`,
        company
      );
      
      // Marquer l'étape 1 comme complétée dans l'onboarding si les informations de base sont présentes
      if (!isStepCompleted && hasBasicInfo()) {
        try {
          const onboardingResponse = await axios.put(
            `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding/phases/1/steps/1`,
            { status: 'completed' }
          );
          
          console.log('✅ Company Profile step 1 marked as completed:', onboardingResponse.data);
          
          // Mettre à jour l'état local
          setIsStepCompleted(true);
          
          // Mettre à jour le localStorage
          const currentProgress = {
            currentPhase: 1,
            completedSteps: [1],
            lastUpdated: new Date().toISOString()
          };
          localStorage.setItem('companyOnboardingProgress', JSON.stringify(currentProgress));
          
          // Synchroniser avec les cookies
          Cookies.set('companyProfileStepCompleted', 'true', { expires: 7 });
          
        } catch (onboardingError) {
          console.error('Error updating onboarding progress:', onboardingError);
        }
      }
      
      setHasChanges(false);
      setSaveSuccess(true);

      // Afficher un popup SweetAlert2 pour indiquer le succès
      Swal.fire({
        title: "Success!",
        text: "Company profile updated successfully and step marked as completed!",
        icon: "success",
        confirmButtonText: "Ok",
      });

      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Erreur lors de la sauvegarde :", err);
      Swal.fire({
        title: "Error!",
        text: "There was an error updating the company profile.",
        icon: "error",
        confirmButtonText: "Try Again",
      });
    }
  };

  const getNestedValue = (obj: Record<string, any>, path: string) => {
    return path.split(".").reduce((acc, key) => acc && acc[key], obj);
  };

  const onClose = () => {
    // This function would be provided by a parent component
    // In standalone mode, we can just set some state or handle differently
    if (hasChanges) {
      Swal.fire({
        title: "Unsaved Changes",
        text: "You have unsaved changes. Do you want to save them before closing?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Save and Close",
        cancelButtonText: "Discard Changes",
      }).then((result) => {
        if (result.isConfirmed) {
          handleSaveAll();
        }
        // Additional close logic would go here
      });
    }
    // If no changes, we'd just close
  };

  useEffect(() => {
    fetchCompanyDetails();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full p-8">
      <div className="animate-pulse space-y-6">
            <div className="h-20 bg-gray-200 rounded-xl w-full"></div>
            <div className="flex gap-6">
              <div className="h-24 w-24 bg-gray-200 rounded-xl"></div>
              <div className="space-y-4 flex-1">
                <div className="h-10 bg-gray-200 rounded w-3/4"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-200 rounded-xl"></div>
          ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Create default values for new fields if they don't exist
  const profile = {
    ...company,
    name: company.name || 'Company Name',
    industry: company.industry || '',
    overview: company.overview || '',
    mission: company.mission || '',
    founded: company.founded || '',
    headquarters: company.headquarters || '',
    logoUrl: company.logo || company.logoUrl || '',
    contact: company.contact || {},
    socialMedia: company.socialMedia || {},
    culture: company.culture || {
      values: [],
      benefits: [],
      workEnvironment: "Our workplace promotes collaboration and innovation."
    },
    opportunities: company.opportunities || {
      roles: [],
      growthPotential: "We offer clear career paths and growth opportunities.",
      training: "We invest in continuous learning and professional development."
    },
    technology: company.technology || {
      stack: [],
      innovation: "We use cutting-edge technologies to solve complex problems."
    }
  };

  const fields = [
    {
      key: "name",
      label: "Company Name",
      icon: <Building2 className="w-5 h-5" />,
    },
    {
      key: "industry",
      label: "Industry",
      icon: <Building2 className="w-5 h-5" />,
    },
    {
      key: "overview",
      label: "Overview",
      icon: <Building2 className="w-5 h-5" />,
    },
    {
      key: "mission",
      label: "Mission",
      icon: <Building2 className="w-5 h-5" />,
    },
    {
      key: "contact.email",
      label: "Email",
      icon: <Mail className="w-5 h-5" />,
    },
    {
      key: "contact.phone",
      label: "Phone",
      icon: <Phone className="w-5 h-5" />,
    },
    {
      key: "contact.address",
      label: "Address",
      icon: <MapPin className="w-5 h-5" />,
    },
    {
      key: "contact.website",
      label: "Website",
      icon: <Globe className="w-5 h-5" />,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-xl">
          {/* Hero Section */}
          <div className="relative h-80">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage:
                  "url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80')",
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/90 via-indigo-800/85 to-blue-900/80" />

            

            

              <style>
                {`
                  @keyframes shine {
                    0% { transform: translateX(-200%); }
                    100% { transform: translateX(200%); }
                  }
                `}
              </style>
          </div>

            <div className="relative h-full flex flex-col justify-end p-12 space-y-6">
              <div className="flex items-center gap-6">
                <div className="relative group">
                  <div
                    className={`w-24 h-24 bg-white rounded-2xl shadow-xl flex items-center justify-center p-4 overflow-hidden ${
                      editMode ? "cursor-pointer" : ""
                    }`}
                  >
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt={profile.name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.src = "";
                          setLogoUrl("");
                        }}
                      />
                    ) : (
                      <Globe className="w-full h-full text-indigo-600" />
                    )}
                    {editMode && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="text-white text-center">
                          <Upload size={20} className="mx-auto mb-1" />
                          <span className="text-xs">Edit Logo</span>
                        </div>
          </div>
        )}
                </div>
                  {editMode && editingField === "logo" && (
                    <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg p-3 border border-gray-200">
                      <div className="space-y-2">
                        <label className="text-sm text-gray-600 block">
                          Logo URL
                        </label>
                        <input
                          type="text"
                          value={logoUrl}
                          onChange={handleLogoChange}
                          placeholder="Enter logo URL..."
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        />
                        <div className="flex justify-end gap-2 mt-2">
                          <button
                            onClick={() => setEditingField(null)}
                            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                          >
                            Cancel
                          </button>
                    <button
                            onClick={() => {
                              setCompany((prev) => ({
                                ...prev,
                                logo: logoUrl
                              }));
                              setEditingField(null);
                              setHasChanges(true);
                            }}
                            className="px-3 py-1 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                          >
                            Save
                    </button>
                        </div>
                      </div>
                    </div>
                  )}
                  {editMode && (
                    <button
                      onClick={() =>
                        setEditingField(editingField === "logo" ? null : "logo")
                      }
                      className="absolute -right-2 -top-2 w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center text-gray-600 hover:text-indigo-600 transition-colors"
                    >
                      <Edit2 size={12} />
                    </button>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <EditableField
                      value={profile.name}
                      field="name"
                      className="text-5xl font-bold text-white tracking-tight"
                    />
                    {isStepCompleted && (
                      <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 border border-green-300/30 rounded-lg">
                        <CheckCircle2 className="w-5 h-5 text-green-300" />
                        <span className="text-sm font-medium text-green-200">Step Completed</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-6 text-white/90">
                    {profile.industry && (
                      <EditableField
                        value={profile.industry}
                        field="industry"
                        icon={Factory}
                        className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm"
                      />
                    )}
                    {profile.founded && (
                      <EditableField
                        value={profile.founded}
                        field="founded"
                        icon={Calendar}
                        className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm"
                      />
                    )}
                    {profile.headquarters && (
                      <EditableField
                        value={profile.headquarters}
                        field="headquarters"
                        icon={MapPin}
                        className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* What Makes Your Company Unique Button */}
         
        </div>

        {/* Main Content */}
        <div className="flex">
          {/* Sidebar - Contact & Digital Presence */}
          <div className="w-80 flex-shrink-0 bg-gradient-to-b from-gray-50 to-white border-r border-gray-200">
            <div className="p-6 space-y-8">
              {/* Contact Information */}
              {hasContactInfo && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Mail className="text-blue-600" size={20} />
                    Contact Information
                  </h3>
                  <div className="space-y-3">
                    {profile.contact?.email && (
                      <EditableField
                        value={profile.contact.email}
                        field="contact.email"
                        icon={Mail}
                        className="flex items-center gap-3 text-gray-600 hover:text-blue-600 transition-colors text-sm"
                      />
                    )}
                    {profile.contact?.phone && (
                      <EditableField
                        value={profile.contact.phone}
                        field="contact.phone"
                        icon={Phone}
                        className="flex items-center gap-3 text-gray-600 hover:text-blue-600 transition-colors text-sm"
                      />
                    )}
                    {profile.contact?.website && (
                      <EditableField
                        value={profile.contact.website}
                        field="contact.website"
                        icon={Globe}
                        className="flex items-center gap-3 text-gray-600 hover:text-blue-600 transition-colors text-sm"
                      />
                    )}
                    {profile.contact?.address && (
                      <EditableField
                        value={profile.contact.address}
                        field="contact.address"
                        icon={MapPin}
                        className="flex items-start gap-3 text-gray-600 text-sm"
                      />
                    )}
            </div>

                  {/* Map Integration */}
                  {(profile.contact?.address || hasLocation) && (
                    <div className="mt-4">
                      <div className="relative w-full h-[160px] rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                        {getGoogleMapsUrl() ? (
                          <>
                            <iframe
                              src={getGoogleMapsUrl()!}
                              width="100%"
                              height="100%"
                              style={{ border: 0 }}
                              allowFullScreen
                              loading="lazy"
                              referrerPolicy="no-referrer-when-downgrade"
                              className="absolute inset-0"
                            />
                            {getGoogleMapsDirectionsUrl() && (
                              <a
                                href={getGoogleMapsDirectionsUrl()!}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute bottom-2 right-2 px-3 py-1.5 bg-white/90 hover:bg-white text-sm text-blue-600 rounded-lg shadow-lg backdrop-blur-sm flex items-center gap-1.5 transition-all hover:scale-105"
                              >
                                <MapPin size={14} />
                                Get Directions
                              </a>
                            )}
                          </>
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
                            <span>Map not available</span>
          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Digital Presence */}
              {hasSocialMedia && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Globe className="text-blue-600" size={20} />
                    Digital Presence
                  </h3>
                  <div className="flex gap-3">
                    {profile.socialMedia?.linkedin && (
                      <a
                        href={profile.socialMedia.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 flex items-center justify-center rounded-lg bg-white border border-gray-200 hover:border-blue-400 hover:text-blue-600 transition-all duration-300 text-gray-600"
                      >
                        <Linkedin size={20} />
                      </a>
                    )}
                    {profile.socialMedia?.twitter && (
                      <a
                        href={profile.socialMedia.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 flex items-center justify-center rounded-lg bg-white border border-gray-200 hover:border-blue-400 hover:text-blue-600 transition-all duration-300 text-gray-600"
                      >
                        <Twitter size={20} />
                      </a>
                    )}
                    {profile.socialMedia?.facebook && (
                      <a
                        href={profile.socialMedia.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 flex items-center justify-center rounded-lg bg-white border border-gray-200 hover:border-blue-400 hover:text-blue-600 transition-all duration-300 text-gray-600"
                      >
                        <Facebook size={20} />
                      </a>
                    )}
                    {profile.socialMedia?.instagram && (
                      <a
                        href={profile.socialMedia.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 flex items-center justify-center rounded-lg bg-white border border-gray-200 hover:border-blue-400 hover:text-blue-600 transition-all duration-300 text-gray-600"
                      >
                        <Instagram size={20} />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1">
            <div className="p-12 space-y-16">
              {/* Overview Section */}
              <section className="relative">
                <div className="absolute -left-6 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-blue-500 rounded-full" />
                <div className="space-y-8">
                  <div className="flex items-start gap-6">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <Building2 className="text-indigo-600" size={24} />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-gray-900 mb-4">
                        Company Overview
                      </h2>
                      <EditableField
                        value={profile.overview}
                        field="overview"
                        className="text-gray-700 leading-relaxed text-lg"
                      />
                    </div>
                  </div>

                  {profile.mission && (
                    <div className="ml-18 p-8 bg-gradient-to-br from-indigo-50 via-blue-50 to-white rounded-2xl border border-indigo-100/50 shadow-sm">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center">
                          <Target className="text-white" size={24} />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-indigo-700 mb-3">
                            Our Mission
                          </h3>
                          <EditableField
                            value={profile.mission}
                            field="mission"
                            className="text-gray-700"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Culture & Benefits Grid */}
              <div className="grid md:grid-cols-2 gap-10">
                {/* Culture Section */}
                <section className="space-y-8">
                  <div className="flex items-start gap-6">
                    <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center flex-shrink-0">
                      <Heart className="text-rose-600" size={24} />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-gray-900 mb-6">
                        Culture & Values
                      </h2>
                      <div className="space-y-4">
                        {profile.culture.values && profile.culture.values.map((value: string, index: number) => (
                          <EditableField
                            key={index}
                            value={value}
                            field={`culture.values.${index}`}
                            icon={Coffee}
                            className="p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:scale-[1.02] transition-all duration-300"
                          />
                        ))}
                        {editMode && profile.culture.values && profile.culture.values.length === 0 && (
                          <div className="p-4 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-center text-gray-500">
                            Add company values in edit mode
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                {/* Benefits Section */}
                <section className="space-y-8">
                  <div className="flex items-start gap-6">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <Trophy className="text-amber-600" size={24} />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-gray-900 mb-6">
                        Benefits & Perks
                      </h2>
                      <div className="space-y-4">
                        {profile.culture.benefits && profile.culture.benefits.map((benefit: string, index: number) => (
                          <EditableField
                            key={index}
                            value={benefit}
                            field={`culture.benefits.${index}`}
                            icon={Award}
                            className="p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:scale-[1.02] transition-all duration-300"
                          />
                        ))}
                        {editMode && profile.culture.benefits && profile.culture.benefits.length === 0 && (
                          <div className="p-4 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-center text-gray-500">
                            Add company benefits in edit mode
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              {/* Work Environment */}
              <section className="bg-gradient-to-br from-gray-50 via-white to-gray-50 rounded-2xl p-8 border border-gray-100/50 shadow-sm">
                <div className="flex items-start gap-6">
                  <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Users className="text-purple-600" size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">
                      Work Environment
                    </h3>
                    <EditableField
                      value={profile.culture.workEnvironment}
                      field="culture.workEnvironment"
                      className="text-gray-700 leading-relaxed"
                    />
                  </div>
                </div>
              </section>

              {/* Career Growth */}
              <section className="space-y-8">
                <div className="flex items-start gap-6">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Rocket className="text-blue-600" size={24} />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">
                      Career Growth & Opportunities
                    </h2>
                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <h3 className="text-xl font-semibold text-gray-800">
                          Available Roles
                        </h3>
                        {profile.opportunities.roles && profile.opportunities.roles.map((role: string, index: number) => (
                          <EditableField
                            key={index}
                            value={role}
                            field={`opportunities.roles.${index}`}
                            icon={Briefcase}
                            className="p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:scale-[1.02] transition-all duration-300"
                          />
                        ))}
                        {editMode && profile.opportunities.roles && profile.opportunities.roles.length === 0 && (
                          <div className="p-4 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-center text-gray-500">
                            Add available roles in edit mode
                          </div>
                        )}
                      </div>

                      <div className="space-y-6">
                        <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100/50">
                          <h3 className="text-xl font-semibold text-gray-800 mb-3">
                            Growth Potential
                          </h3>
                          <EditableField
                            value={profile.opportunities.growthPotential}
                            field="opportunities.growthPotential"
                            className="text-gray-700"
                          />
                        </div>
                        <div className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100/50">
                          <h3 className="text-xl font-semibold text-gray-800 mb-3 flex items-center gap-2">
                            <GraduationCap
                              size={20}
                              className="text-indigo-500"
                            />
                            Training & Development
                          </h3>
                          <EditableField
                            value={profile.opportunities.training}
                            field="opportunities.training"
                            className="text-gray-700"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Technology Stack */}
              <section className="space-y-8">
                <div className="flex items-start gap-6">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <Code className="text-emerald-600" size={24} />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">
                      Technology & Innovation
                    </h2>
                    <div className="grid md:grid-cols-2 gap-8">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-800 mb-4">
                          Tech Stack
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {profile.technology.stack && profile.technology.stack.map((tech: string, index: number) => (
                            <EditableField
                              key={index}
                              value={tech}
                              field={`technology.stack.${index}`}
                              className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100"
                            />
                          ))}
                          {editMode && profile.technology.stack && profile.technology.stack.length === 0 && (
                            <div className="p-4 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-center text-gray-500 w-full">
                              Add technologies in edit mode
                            </div>
                )}
              </div>
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-800 mb-4">
                          Innovation
                        </h3>
                        <EditableField
                          value={profile.technology.innovation}
                          field="technology.innovation"
                          className="text-gray-700"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
            </div>
          </div>
        </div>

              {/* Edit and Save buttons */}
      <div className="fixed right-6 top-6 flex items-center gap-3 z-10">
          {isStepCompleted && (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-700">Step Completed</span>
            </div>
          )}
          <button
            onClick={() => setEditMode(!editMode)}
            className={`p-2 rounded-full transition-all duration-300 ${
              editMode
                ? "bg-green-500 text-white hover:bg-green-600"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Edit2 size={20} />
          </button>
        </div>

        {/* Save Changes Button */}
        {editMode && hasChanges && (
        <div className="fixed bottom-6 right-6 z-10">
            <button
              onClick={handleSaveAll}
              className={`px-6 py-3 rounded-xl shadow-lg transition-all flex items-center gap-2 ${
                isStepCompleted
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              <Save size={18} />
              {isStepCompleted ? 'Update Profile' : 'Save & Complete Step'}
            </button>
          </div>
        )}

        {/* Success message */}
        {saveSuccess && (
        <div className="fixed bottom-6 left-6 z-10 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-600 shadow-lg">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>Company profile saved successfully</span>
        </div>
        )}
    </div>
  );
}

export default CompanyProfile;