import React, { useState, useEffect } from "react";
import Cookies from "js-cookie";
import {
  Building2,
  Calendar,
  MapPin,
  Target,
  X,
  XCircle,
  Globe,
  Mail,
  Phone,
  Linkedin,
  Twitter,
  Facebook,
  Instagram,
  Factory,
  Edit2,
  Check,
  ArrowRight,
  ArrowLeft,
  Upload,
} from "lucide-react";
import type { CompanyProfile as CompanyProfileType } from "./api/openai";
import { saveCompanyData } from "./api/companyApi";
import { LucideProps } from "lucide-react";

interface Props {
  profile: CompanyProfileType;
  onClose: () => void;
}

const userId = Cookies.get("userId");

export function CompanyProfile({ profile: initialProfile, onClose }: Props) {
  const defaultProfile = {
    userId: userId || "",
    name: initialProfile.name || "",
    logo: initialProfile.logo || "",
    industry: initialProfile.industry || "",
    founded: initialProfile.founded || "",
    headquarters: initialProfile.headquarters || "",
    overview: initialProfile.overview || "",
    mission: initialProfile.mission || "",
    culture: {
      values: initialProfile.culture?.values || [],
      benefits: initialProfile.culture?.benefits || [],
      workEnvironment: initialProfile.culture?.workEnvironment || "",
    },
    opportunities: {
      roles: initialProfile.opportunities?.roles || [],
      growthPotential: initialProfile.opportunities?.growthPotential || "",
      training: initialProfile.opportunities?.training || "",
    },
    technology: {
      stack: initialProfile.technology?.stack || [],
      innovation: initialProfile.technology?.innovation || "",
    },
    contact: {
      email: initialProfile.contact?.email || "",
      phone: initialProfile.contact?.phone || "",
      address: initialProfile.contact?.address || "",
      website: initialProfile.contact?.website || "",
      coordinates: initialProfile.contact?.coordinates,
    },
    socialMedia: {
      linkedin: initialProfile.socialMedia?.linkedin || "",
      twitter: initialProfile.socialMedia?.twitter || "",
      facebook: initialProfile.socialMedia?.facebook || "",
      instagram: initialProfile.socialMedia?.instagram || "",
    },
  };

  const [profile, setProfile] = useState(defaultProfile);
  const [editMode, setEditMode] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState("");
  const [logoUrl, setLogoUrl] = useState(profile.logo || "");
  const [publishError, setPublishError] = useState<string | null>(null);

  const hasContactInfo =
    profile.contact?.email ||
    profile.contact?.phone ||
    profile.contact?.address ||
    profile.contact?.website;

  const hasSocialMedia =
    profile.socialMedia?.linkedin ||
    profile.socialMedia?.twitter ||
    profile.socialMedia?.facebook ||
    profile.socialMedia?.instagram;

  const hasLocation =
    profile.contact?.coordinates?.lat && profile.contact?.coordinates?.lng;

  const getGoogleMapsUrl = () => {
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
    if (!apiKey) return null;

    if (profile.contact?.address) {
      const address = encodeURIComponent(profile.contact.address);
      return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${address}&zoom=15`;
    }

    if (hasLocation && profile.contact?.coordinates) {
      const { lat, lng } = profile.contact.coordinates;
      return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${lat},${lng}&zoom=15`;
    }

    return null;
  };

  useEffect(() => {
    if (!logoUrl && profile.contact.website) {
      try {
        const domain = new URL(profile.contact.website).hostname;
        setLogoUrl(`https://www.google.com/s2/favicons?domain=${domain}&sz=64`);
      } catch {
        // Invalid URL
      }
    }
  }, [profile.contact.website, logoUrl]);

  const handlePublish = async () => {
    try {
      const cleanData = (obj: any): any => {
        if (Array.isArray(obj)) return obj.length > 0 ? obj : undefined;
        if (obj && typeof obj === "object") {
          const result: any = {};
          let hasValues = false;
          Object.entries(obj).forEach(([k, v]) => {
            const cleaned = cleanData(v);
            if (cleaned !== undefined) {
              result[k] = cleaned;
              hasValues = true;
            }
          });
          return hasValues ? result : undefined;
        }
        return obj === "" || obj === null ? undefined : obj;
      };

      const payload = cleanData(profile) || {};
      if (profile.userId) payload.userId = profile.userId;

      const response = await saveCompanyData(payload);
      if (response && response.data && response.data._id) {
        Cookies.set("companyId", response.data._id, { expires: 30 });
      }
      window.location.href = "/app11";
    } catch (error: any) {
      setPublishError(error.response?.data?.message || "Failed to publish company. Please try again.");
    }
  };

  const handleCloseError = () => {
    setPublishError(null);
  };

  const getGoogleMapsDirectionsUrl = () => {
    if (profile.contact?.address) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        profile.contact.address
      )}`;
    }

    if (hasLocation && profile.contact?.coordinates) {
      const { lat, lng } = profile.contact.coordinates;
      return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    }

    return null;
  };

  const handleEdit = (field: string, value: string) => {
    setEditingField(field);
    setTempValue(value);
  };

  const handleSave = (field: string) => {
    const updateProfile = (path: string[], value: any) => {
      const newProfile = { ...profile };
      let current = newProfile as any;
      for (let i = 0; i < path.length - 1; i++) {
        if (!current[path[i]]) current[path[i]] = {};
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      return newProfile;
    };

    const fieldPath = field.split(".");
    setProfile(updateProfile(fieldPath, tempValue));
    setEditingField(null);
  };

  const handleDelete = (path: string) => {
    const parts = path.split(".");
    const newProfile = { ...profile } as any;

    const lastPart = parts[parts.length - 1];
    const index = parseInt(lastPart, 10);

    if (!isNaN(index)) {
      const arrayKey = parts[parts.length - 2];
      const parent = parts.length > 2 ? parts.slice(0, -2).reduce((acc, p) => acc[p], newProfile) : newProfile;
      parent[arrayKey] = parent[arrayKey].filter((_: any, i: number) => i !== index);
    }

    setProfile(newProfile);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setLogoUrl(url);
    setProfile({ ...profile, logo: url });
  };

  const EditableField = ({
    value,
    field,
    icon: Icon,
    type = "text",
    className = "",
  }: {
    value: string;
    field: string;
    icon?: React.ComponentType<LucideProps>;
    type?: string;
    className?: string;
  }) => (
    <div className={`group relative ${className}`}>
      {editingField === field ? (
        <div className="flex items-center gap-2">
          <input
            type={type}
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            className="flex-1 px-3 py-1 border border-harx-200 rounded-md bg-white text-gray-900 focus:ring-2 focus:ring-harx-500 outline-none transition-all"
            style={{ color: "#111827", backgroundColor: "white" }}
            onKeyDown={(e) => e.key === "Enter" && handleSave(field)}
            autoFocus
            onBlur={() => handleSave(field)}
          />
          <button onClick={() => handleSave(field)} className="p-1 text-green-600 hover:text-green-700">
            <Check size={16} />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {Icon && <Icon size={18} className="text-gray-600" />}
          <span className="flex-1">{value}</span>
          {editMode && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
              <button
                onClick={() => handleEdit(field, value)}
                className="p-1 text-gray-400 hover:text-harx-600 transition-colors"
              >
                <Edit2 size={14} />
              </button>
              {(field.includes("culture.values") ||
                field.includes("culture.benefits") ||
                field.includes("opportunities.roles") ||
                field.includes("technology.stack")) && (
                <button onClick={() => handleDelete(field)} className="p-1 text-gray-400 hover:text-red-500">
                  <X size={14} />
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full h-full bg-white rounded-3xl shadow-2xl border border-harx-100 overflow-hidden flex relative min-h-[800px] animate-fade-in">
      <button
        onClick={onClose}
        className="absolute left-6 top-6 z-20 inline-flex items-center gap-2 rounded-xl border border-harx-100 bg-white/95 px-3 py-2 text-xs font-black uppercase tracking-wider text-harx-600 shadow-sm transition-all hover:bg-white hover:border-harx-200"
      >
        <ArrowLeft size={14} />
        Back to onboarding
      </button>

      <div className="w-80 flex-shrink-0 bg-gradient-to-b from-gray-50 to-white border-r border-gray-200 overflow-y-auto">
        <div className="p-6 space-y-8">
          {hasContactInfo && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Mail className="text-harx-600" size={20} />
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

              {(profile.contact?.address || hasLocation) && (
                <div className="mt-4">
                  <div className="relative w-full h-[160px] rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                    {getGoogleMapsUrl() ? (
                      <>
                        <iframe
                          src={getGoogleMapsUrl() || undefined}
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
                            href={getGoogleMapsDirectionsUrl() || undefined}
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

          {hasSocialMedia && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Globe className="text-harx-600" size={20} />
                Digital Presence
              </h3>
              <div className="flex gap-3">
                {profile.socialMedia?.linkedin && (
                  <a href={profile.socialMedia.linkedin} target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center rounded-lg bg-white border border-gray-200 hover:border-blue-400 hover:text-blue-600 transition-all duration-300 text-gray-600"><Linkedin size={20} /></a>
                )}
                {profile.socialMedia?.twitter && (
                  <a href={profile.socialMedia.twitter} target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center rounded-lg bg-white border border-gray-200 hover:border-blue-400 hover:text-blue-600 transition-all duration-300 text-gray-600"><Twitter size={20} /></a>
                )}
                {profile.socialMedia?.facebook && (
                  <a href={profile.socialMedia.facebook} target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center rounded-lg bg-white border border-gray-200 hover:border-blue-400 hover:text-blue-600 transition-all duration-300 text-gray-600"><Facebook size={20} /></a>
                )}
                {profile.socialMedia?.instagram && (
                  <a href={profile.socialMedia.instagram} target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center rounded-lg bg-white border border-gray-200 hover:border-blue-400 hover:text-blue-600 transition-all duration-300 text-gray-600"><Instagram size={20} /></a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="relative h-80">
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80')" }}>
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-harx-900/90 to-gray-900" />
            <div className="absolute inset-0 opacity-20" style={{ background: "linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.3) 25%, transparent 30%)", animation: "shine 8s infinite linear" }} />
            <div className="absolute inset-0 opacity-10" style={{ background: "linear-gradient(90deg, transparent 45%, rgba(255,255,255,0.4) 50%, transparent 55%)", animation: "shine 6s infinite linear" }} />
            <style>{`@keyframes shine {0% { transform: translateX(-200%);}100% { transform: translateX(200%);}}`}</style>
          </div>

          <div className="relative h-full flex flex-col justify-end p-12 space-y-6">
            <div className="flex items-center gap-6">
              <div className="relative group">
                <div className={`w-24 h-24 bg-white rounded-2xl shadow-xl flex items-center justify-center p-4 overflow-hidden ${editMode ? "cursor-pointer" : ""}`}>
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={profile.name}
                      className="w-full h-full object-contain"
                      onError={() => {
                        if (profile.contact.website && !logoUrl.includes("clearbit")) {
                          try {
                            const domain = new URL(profile.contact.website).hostname;
                            setLogoUrl(`https://logo.clearbit.com/${domain}`);
                          } catch {
                            setLogoUrl("");
                          }
                        } else {
                          setLogoUrl("");
                        }
                      }}
                    />
                  ) : (
                    <Globe className="w-full h-full text-harx-600" />
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
                      <label className="text-sm text-gray-600 block">Logo URL</label>
                      <input
                        type="text"
                        value={logoUrl}
                        onChange={handleLogoChange}
                        placeholder="Enter logo URL..."
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                      />
                      <div className="flex justify-end gap-2 mt-2">
                        <button onClick={() => setEditingField(null)} className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
                        <button onClick={() => setEditingField(null)} className="px-3 py-1 text-sm bg-harx-600 text-white rounded-md hover:bg-harx-700 transition-colors">Save</button>
                      </div>
                    </div>
                  </div>
                )}
                {editMode && (
                  <button onClick={() => setEditingField(editingField === "logo" ? null : "logo")} className="absolute -right-2 -top-2 w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center text-gray-600 hover:text-harx-600 transition-colors">
                    <Edit2 size={12} />
                  </button>
                )}
              </div>

              <div>
                <EditableField value={profile.name} field="name" className="text-5xl font-bold text-white mb-2 tracking-tight" />
                <div className="flex flex-wrap gap-6 text-white/90">
                  {profile.industry && (
                    <EditableField value={profile.industry} field="industry" icon={Factory} className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full backdrop-blur-md border border-white/10" />
                  )}
                  {profile.founded && (
                    <EditableField value={profile.founded} field="founded" icon={Calendar} className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm" />
                  )}
                  {profile.headquarters && (
                    <EditableField value={profile.headquarters} field="headquarters" icon={MapPin} className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-12 space-y-16">
            <section className="relative">
              <div className="absolute -left-6 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-blue-500 rounded-full" />
              <div className="space-y-8">
                <div className="flex items-start gap-6">
                  <div className="w-12 h-12 rounded-2xl bg-harx-50 flex items-center justify-center flex-shrink-0 border border-harx-100">
                    <Building2 className="text-harx-600" size={24} />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Company Overview</h2>
                    <EditableField value={profile.overview} field="overview" className="text-gray-700 leading-relaxed text-lg" />
                  </div>
                </div>

                {profile.mission && (
                  <div className="ml-18 p-8 bg-gradient-to-br from-indigo-50 via-blue-50 to-white rounded-2xl border border-indigo-100/50 shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-harx flex items-center justify-center shadow-lg shadow-harx-500/20">
                        <Target className="text-white" size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-harx-700 mb-3">Our Mission</h3>
                        <EditableField value={profile.mission} field="mission" className="text-gray-700" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <div className="pt-8 flex justify-center border-t border-gray-100">
              <button
                onClick={handlePublish}
                className="px-8 py-4 bg-gradient-harx text-white rounded-2xl hover:shadow-2xl hover:shadow-harx-500/30 transition-all duration-300 flex items-center gap-3 group text-lg font-bold w-full sm:w-auto justify-center transform hover:-translate-y-1"
              >
                <Check size={24} className="text-white" />
                <span>Publish Company</span>
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute right-6 top-6 flex items-center gap-3 z-10">
        <button
          onClick={() => setEditMode(!editMode)}
          className={`p-2 rounded-full transition-all duration-300 ${editMode ? "bg-green-500 text-white hover:bg-green-600" : "bg-white text-gray-600 hover:bg-gray-100"}`}
        >
          <Edit2 size={20} />
        </button>
        <button onClick={onClose} className="p-2 rounded-full bg-white text-gray-600 hover:bg-gray-100 transition-all duration-300">
          <X size={20} />
        </button>
      </div>

      {publishError && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg text-center max-w-sm">
            <XCircle className="text-red-500 mx-auto" size={40} />
            <h2 className="text-xl font-bold text-gray-900 mt-4">Error</h2>
            <p className="text-gray-600 mt-2">{publishError}</p>
            <button onClick={handleCloseError} className="mt-4 px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
