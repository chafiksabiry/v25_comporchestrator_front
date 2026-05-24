import React, { useRef, useState, useEffect } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import {
  Building2,
  Calendar,
  Link as LinkIcon,
  Loader2,
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
import { saveCompanyData } from "./api/companyApi";
import { uploadImage } from "./api/uploads";
import { redirectToCompanyOnboarding } from "./navigation";
import { LucideProps } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Props {
  profile: CompanyProfileType;
  onClose: () => void;
  /** When set (embedded in Company Onboarding), called instead of a full-page redirect */
  onPublished?: (companyId: string) => void;
}

const userId = Cookies.get("userId");

export function CompanyProfile({ profile: initialProfile, onClose, onPublished }: Props) {
  const { t } = useTranslation();
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
  const [logoTab, setLogoTab] = useState<"upload" | "url">("upload");
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [logoUrlDraft, setLogoUrlDraft] = useState(profile.logo || "");
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const applyLogo = (url: string) => {
    setLogoUrl(url);
    setProfile((prev) => ({ ...prev, logo: url }));
  };

  const handleLogoFile = async (file: File) => {
    setLogoError(null);
    if (!file.type.startsWith("image/")) {
      setLogoError(t("searchCompanyWizard.manual.logo.invalidType", "Please choose an image file."));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setLogoError(t("searchCompanyWizard.manual.logo.tooBig", "Image must be smaller than 5 MB."));
      return;
    }
    setLogoUploading(true);
    try {
      const { url } = await uploadImage(file);
      if (!url) throw new Error("No URL returned");
      applyLogo(url);
      setLogoUrlDraft(url);
      setEditingField(null);
    } catch (err: any) {
      setLogoError(
        err?.response?.data?.message ||
          err?.message ||
          t("searchCompanyWizard.manual.logo.uploadFailed", "Logo upload failed")
      );
    } finally {
      setLogoUploading(false);
    }
  };

  const handleLogoFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleLogoFile(file);
    if (logoFileInputRef.current) logoFileInputRef.current.value = "";
  };

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

  const markStepCompleted = async (companyId: string) => {
    const apiUrl =
      import.meta.env.VITE_COMPANY_API_URL ||
      "https://v25searchcompanywizardbackend-production.up.railway.app/api";
    await axios.put(`${apiUrl}/onboarding/companies/${companyId}/onboarding/phases/1/steps/1`, {
      status: "completed",
    });
  };

  const handlePublish = async () => {
    setPublishing(true);
    setPublishError(null);
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
      delete payload._id;

      const response = await saveCompanyData(payload);
      const newCompanyId = response?.data?._id;
      if (!newCompanyId) {
        throw new Error("Company ID missing from API response");
      }

      Cookies.set("companyId", newCompanyId, { expires: 30 });

      try {
        await markStepCompleted(newCompanyId);
      } catch (err) {
        console.error("Failed to mark onboarding step 1:", err);
      }

      window.dispatchEvent(
        new CustomEvent("stepCompleted", {
          detail: { stepId: 1, phaseId: 1, status: "completed", completedSteps: [1] },
        })
      );

      if (onPublished) {
        onPublished(newCompanyId);
      } else {
        redirectToCompanyOnboarding();
      }
    } catch (error: any) {
      setPublishError(error.response?.data?.message || t('searchCompanyWizard.errors.publishFailed'));
    } finally {
      setPublishing(false);
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
      <div className="w-80 flex-shrink-0 bg-gradient-to-b from-gray-50 to-white border-r border-gray-200 overflow-y-auto">
        <div className="p-6 space-y-8">
          {(
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Mail className="text-harx-600" size={20} />
                {t('searchCompanyWizard.profile.contactInfo')}
              </h3>

              <div className="space-y-3">
                {([
                  { value: profile.contact?.email, field: "contact.email", icon: Mail, label: t('searchCompanyWizard.profile.addEmail', 'Add email'), type: "email" },
                  { value: profile.contact?.phone, field: "contact.phone", icon: Phone, label: t('searchCompanyWizard.profile.addPhone', 'Add phone'), type: "tel" },
                  { value: profile.contact?.website, field: "contact.website", icon: Globe, label: t('searchCompanyWizard.profile.addWebsite', 'Add website'), type: "url" },
                  { value: profile.contact?.address, field: "contact.address", icon: MapPin, label: t('searchCompanyWizard.profile.addAddress', 'Add address'), type: "text" },
                ] as const).map(({ value, field, icon: Icon, label, type }) => {
                  if (value || editingField === field) {
                    return (
                      <EditableField
                        key={field}
                        value={(value as string) || ""}
                        field={field}
                        icon={Icon}
                        type={type}
                        className={field === "contact.address"
                          ? "flex items-start gap-3 text-gray-600 text-sm"
                          : "flex items-center gap-3 text-gray-600 hover:text-blue-600 transition-colors text-sm"}
                      />
                    );
                  }
                  return (
                    <button
                      key={field}
                      type="button"
                      onClick={() => {
                        if (!editMode) setEditMode(true);
                        setEditingField(field);
                        setTempValue("");
                      }}
                      className="group w-full flex items-center gap-3 text-left px-3 py-2 rounded-lg border border-dashed border-slate-300 text-slate-400 hover:border-harx-400 hover:text-harx-600 hover:bg-harx-50/40 transition-all text-sm"
                    >
                      <Icon size={16} className="flex-shrink-0" />
                      <span className="flex-1 truncate">{label}</span>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 group-hover:text-harx-500">+</span>
                    </button>
                  );
                })}
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
                            {t('searchCompanyWizard.profile.getDirections')}
                          </a>
                        )}
                      </>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
                        <span>{t('searchCompanyWizard.profile.mapNotAvailable')}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {(
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Globe className="text-harx-600" size={20} />
                {t('searchCompanyWizard.profile.digitalPresence')}
              </h3>
              <div className="flex flex-wrap gap-3">
                {([
                  { key: "linkedin", value: profile.socialMedia?.linkedin, icon: Linkedin, label: "LinkedIn" },
                  { key: "twitter", value: profile.socialMedia?.twitter, icon: Twitter, label: "Twitter / X" },
                  { key: "facebook", value: profile.socialMedia?.facebook, icon: Facebook, label: "Facebook" },
                  { key: "instagram", value: profile.socialMedia?.instagram, icon: Instagram, label: "Instagram" },
                ] as const).map(({ key, value, icon: Icon, label }) =>
                  value ? (
                    <a
                      key={key}
                      href={value}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={label}
                      className="w-10 h-10 flex items-center justify-center rounded-lg bg-white border border-gray-200 hover:border-blue-400 hover:text-blue-600 transition-all duration-300 text-gray-600"
                    >
                      <Icon size={20} />
                    </a>
                  ) : (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        if (!editMode) setEditMode(true);
                        setEditingField(`socialMedia.${key}`);
                        setTempValue("");
                      }}
                      title={t('searchCompanyWizard.profile.addSocial', 'Add {{network}} link', { network: label })}
                      className="relative w-10 h-10 flex items-center justify-center rounded-lg bg-white border border-dashed border-slate-300 text-slate-400 hover:border-harx-400 hover:text-harx-600 hover:bg-harx-50/40 transition-all"
                    >
                      <Icon size={18} />
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-harx-500 text-white text-[9px] font-black flex items-center justify-center shadow">+</span>
                    </button>
                  )
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
                        <span className="text-xs">{t('searchCompanyWizard.profile.editLogo')}</span>
                      </div>
                    </div>
                  )}
                </div>
                {editMode && editingField === "logo" && (
                  <div className="absolute top-full left-0 mt-3 w-[340px] z-30 rounded-2xl border border-slate-200 bg-white shadow-2xl ring-1 ring-black/5 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-harx-50 to-harx-alt-50">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-harx-500 to-harx-alt-500 text-white shadow-sm">
                          <Upload size={14} />
                        </div>
                        <h4 className="text-sm font-black text-slate-900">
                          {t("searchCompanyWizard.profile.editLogo", "Edit logo")}
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingField(null);
                          setLogoError(null);
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-white hover:text-slate-700 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    <div className="px-4 pt-3">
                      <div className="inline-flex rounded-xl bg-slate-100 p-1 w-full">
                        <button
                          type="button"
                          onClick={() => {
                            setLogoTab("upload");
                            setLogoError(null);
                          }}
                          className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-black uppercase tracking-wider transition-all ${
                            logoTab === "upload"
                              ? "bg-white text-harx-600 shadow-sm"
                              : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          <Upload size={12} />
                          {t("searchCompanyWizard.profile.uploadTab", "Upload")}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setLogoTab("url");
                            setLogoError(null);
                          }}
                          className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-black uppercase tracking-wider transition-all ${
                            logoTab === "url"
                              ? "bg-white text-harx-600 shadow-sm"
                              : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          <LinkIcon size={12} />
                          {t("searchCompanyWizard.profile.urlTab", "URL")}
                        </button>
                      </div>
                    </div>

                    <input
                      ref={logoFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoFileInput}
                      className="hidden"
                    />

                    {logoTab === "upload" ? (
                      <div className="p-4 space-y-3">
                        <button
                          type="button"
                          onClick={() => !logoUploading && logoFileInputRef.current?.click()}
                          disabled={logoUploading}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const file = e.dataTransfer.files?.[0];
                            if (file) void handleLogoFile(file);
                          }}
                          className="group w-full rounded-xl border-2 border-dashed border-slate-300 hover:border-harx-400 bg-slate-50 hover:bg-harx-50/40 px-4 py-5 flex flex-col items-center gap-2 transition-all disabled:opacity-60"
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 text-harx-600 shadow-sm group-hover:scale-105 transition-transform">
                            {logoUploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                          </div>
                          <p className="text-xs font-bold text-slate-700">
                            {logoUploading
                              ? t("searchCompanyWizard.manual.logo.uploading", "Uploading…")
                              : t("searchCompanyWizard.manual.logo.dropOrClick", "Drop your logo here or click to upload")}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {t("searchCompanyWizard.manual.logo.hint", "PNG, JPG, SVG · max 5 MB")}
                          </p>
                        </button>
                        {logoUrl && (
                          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2">
                            <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center overflow-hidden">
                              <img src={logoUrl} alt="" className="w-full h-full object-contain" />
                            </div>
                            <p className="flex-1 text-[11px] font-bold text-emerald-700">
                              {t("searchCompanyWizard.manual.logo.uploaded", "Logo uploaded")}
                            </p>
                            <button
                              type="button"
                              onClick={() => applyLogo("")}
                              className="text-[10px] font-bold text-slate-500 hover:text-red-600 transition-colors"
                            >
                              {t("searchCompanyWizard.manual.logo.remove", "Remove")}
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 space-y-3">
                        <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500">
                          {t("searchCompanyWizard.profile.logoUrl", "Logo URL")}
                        </label>
                        <div className="relative">
                          <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="url"
                            value={logoUrlDraft}
                            onChange={(e) => setLogoUrlDraft(e.target.value)}
                            placeholder={t("searchCompanyWizard.profile.enterLogoUrl", "https://...")}
                            className="w-full pl-9 pr-3 py-2.5 text-sm border-2 border-slate-200 rounded-xl outline-none focus:border-harx-500 focus:ring-4 focus:ring-harx-500/10 bg-white text-slate-900 placeholder-slate-400 transition-all"
                          />
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setLogoUrlDraft(logoUrl);
                              setEditingField(null);
                            }}
                            className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-800"
                          >
                            {t("searchCompanyWizard.profile.cancel", "Cancel")}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              applyLogo(logoUrlDraft.trim());
                              setEditingField(null);
                            }}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-black uppercase tracking-wider rounded-xl bg-gradient-to-r from-harx-500 to-harx-alt-500 text-white shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all"
                          >
                            <Check size={12} />
                            {t("searchCompanyWizard.profile.save", "Save")}
                          </button>
                        </div>
                      </div>
                    )}

                    {logoError && (
                      <div className="mx-4 mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-medium text-red-700">
                        <XCircle size={12} className="mt-0.5 flex-shrink-0" />
                        <span>{logoError}</span>
                      </div>
                    )}
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
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('searchCompanyWizard.profile.companyOverview')}</h2>
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
                        <h3 className="text-xl font-bold text-harx-700 mb-3">{t('searchCompanyWizard.profile.ourMission')}</h3>
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
                disabled={publishing}
                className="px-8 py-4 bg-gradient-harx text-white rounded-2xl hover:shadow-2xl hover:shadow-harx-500/30 transition-all duration-300 flex items-center gap-3 group text-lg font-bold w-full sm:w-auto justify-center transform hover:-translate-y-1 disabled:opacity-70 disabled:hover:translate-y-0"
              >
                <Check size={24} className="text-white" />
                <span>{publishing ? t('searchCompanyWizard.profile.publishing') : t('searchCompanyWizard.profile.publishBtn')}</span>
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
            <h2 className="text-xl font-bold text-gray-900 mt-4">{t('searchCompanyWizard.profile.errorTitle')}</h2>
            <p className="text-gray-600 mt-2">{publishError}</p>
            <button onClick={handleCloseError} className="mt-4 px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
              {t('searchCompanyWizard.profile.close')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
