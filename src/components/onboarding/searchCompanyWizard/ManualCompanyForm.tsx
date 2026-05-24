import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  Globe,
  HelpCircle,
  Image as ImageIcon,
  Linkedin,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Target,
  Trash2,
  Twitter,
  Upload,
  XCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { saveCompanyData } from "./api/companyApi";
import { redirectToCompanyOnboarding } from "./navigation";
import ManualCompanyGuideModal from "./ManualCompanyGuideModal";

const MANUAL_GUIDE_STORAGE_KEY = "manualCompanyGuideSeen";

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined;

interface Props {
  onClose: () => void;
  onPublished?: (companyId: string) => void;
}

interface ManualFormState {
  name: string;
  industry: string;
  founded: string;
  headquarters: string;
  overview: string;
  mission: string;
  logo: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  linkedin: string;
  twitter: string;
}

const initialState: ManualFormState = {
  name: "",
  industry: "",
  founded: "",
  headquarters: "",
  overview: "",
  mission: "",
  logo: "",
  email: "",
  phone: "",
  address: "",
  website: "",
  linkedin: "",
  twitter: "",
};

export function ManualCompanyForm({ onClose, onPublished }: Props) {
  const { t } = useTranslation();
  const [form, setForm] = useState<ManualFormState>(initialState);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(MANUAL_GUIDE_STORAGE_KEY);
      if (seen !== "true") setShowGuide(true);
    } catch {
      setShowGuide(true);
    }
  }, []);

  const handleCloseGuide = () => {
    try {
      localStorage.setItem(MANUAL_GUIDE_STORAGE_KEY, "true");
    } catch {
      /* ignore storage errors */
    }
    setShowGuide(false);
  };

  const cloudinaryConfigured = Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET);

  const update = (key: keyof ManualFormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
    };

  const uploadLogoToCloudinary = async (file: File) => {
    if (!cloudinaryConfigured) {
      setLogoError(
        t(
          "searchCompanyWizard.manual.logo.notConfigured",
          "Cloudinary is not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET."
        )
      );
      return;
    }
    if (!file.type.startsWith("image/")) {
      setLogoError(t("searchCompanyWizard.manual.logo.invalidType", "Please choose an image file."));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setLogoError(t("searchCompanyWizard.manual.logo.tooBig", "Image must be smaller than 5 MB."));
      return;
    }

    setLogoUploading(true);
    setLogoError(null);
    try {
      const data = new FormData();
      data.append("file", file);
      data.append("upload_preset", CLOUDINARY_UPLOAD_PRESET!);
      data.append("folder", "harx/companies/logos");

      const res = await axios.post(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        data,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      const url: string | undefined = res?.data?.secure_url || res?.data?.url;
      if (!url) throw new Error("No URL returned by Cloudinary");
      setForm((prev) => ({ ...prev, logo: url }));
    } catch (err: any) {
      const message =
        err?.response?.data?.error?.message ||
        err?.message ||
        t("searchCompanyWizard.manual.logo.uploadFailed", "Logo upload failed");
      setLogoError(message);
    } finally {
      setLogoUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadLogoToCloudinary(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadLogoToCloudinary(file);
  };

  const removeLogo = () => {
    setForm((prev) => ({ ...prev, logo: "" }));
    setLogoError(null);
  };

  const markStepCompleted = async (companyId: string) => {
    const apiUrl =
      import.meta.env.VITE_COMPANY_API_URL ||
      "https://v25searchcompanywizardbackend-production.up.railway.app/api";
    await axios.put(
      `${apiUrl}/onboarding/companies/${companyId}/onboarding/phases/1/steps/1`,
      { status: "completed" }
    );
  };

  const validate = (): string | null => {
    if (!form.name.trim()) return t("searchCompanyWizard.manual.errors.nameRequired", "Company name is required");
    if (!form.overview.trim()) return t("searchCompanyWizard.manual.errors.overviewRequired", "Overview is required");
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setPublishing(true);
    setError(null);

    try {
      const userId = Cookies.get("userId") || localStorage.getItem("userId");
      if (!userId) {
        throw new Error("User ID not found. Please sign in again.");
      }

      const payload: Record<string, any> = {
        userId,
        name: form.name.trim(),
        overview: form.overview.trim(),
      };
      if (form.industry.trim()) payload.industry = form.industry.trim();
      if (form.founded.trim()) payload.founded = form.founded.trim();
      if (form.headquarters.trim()) payload.headquarters = form.headquarters.trim();
      if (form.mission.trim()) payload.mission = form.mission.trim();
      if (form.logo.trim()) payload.logo = form.logo.trim();

      const contact: Record<string, string> = {};
      if (form.email.trim()) contact.email = form.email.trim();
      if (form.phone.trim()) contact.phone = form.phone.trim();
      if (form.address.trim()) contact.address = form.address.trim();
      if (form.website.trim()) contact.website = form.website.trim();
      if (Object.keys(contact).length > 0) payload.contact = contact;

      const socialMedia: Record<string, string> = {};
      if (form.linkedin.trim()) socialMedia.linkedin = form.linkedin.trim();
      if (form.twitter.trim()) socialMedia.twitter = form.twitter.trim();
      if (Object.keys(socialMedia).length > 0) payload.socialMedia = socialMedia;

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
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          t("searchCompanyWizard.errors.publishFailed")
      );
    } finally {
      setPublishing(false);
    }
  };

  const inputBase =
    "w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-sm outline-none focus:border-harx-500 focus:ring-4 focus:ring-harx-500/10 transition-all bg-white text-slate-900 placeholder-slate-400";

  const fieldWithIcon = (Icon: React.ComponentType<any>, child: React.ReactNode) => (
    <div className="relative">
      <Icon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      {child}
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl p-6 animate-fade-in">
      <ManualCompanyGuideModal isOpen={showGuide} onClose={handleCloseGuide} />
      <div className="relative rounded-3xl border border-slate-200 bg-white shadow-xl overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-harx-50 to-harx-alt-50">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-xl border border-harx-100 bg-white/90 px-3 py-2 text-xs font-black uppercase tracking-wider text-harx-600 shadow-sm hover:bg-white"
          >
            <ArrowLeft size={14} />
            {t("searchCompanyWizard.profile.backBtn")}
          </button>
          <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-harx-700 to-harx-alt-700">
            {t("searchCompanyWizard.manual.title", "Create Company Manually")}
          </h2>
          <button
            type="button"
            onClick={() => setShowGuide(true)}
            title={t("searchCompanyWizard.manual.guide.openBtn", "View guide")}
            className="group inline-flex items-center gap-1.5 rounded-xl border border-harx-100 bg-white/90 px-3 py-2 text-xs font-black uppercase tracking-wider text-harx-600 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-white"
          >
            <HelpCircle size={14} className="transition-transform group-hover:rotate-12" />
            <span className="hidden sm:inline">
              {t("searchCompanyWizard.manual.guide.openBtn", "Guide")}
            </span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          <section className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">
              {t("searchCompanyWizard.manual.basics", "Basic Information")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  {t("searchCompanyWizard.manual.fields.name", "Company name")} *
                </label>
                {fieldWithIcon(
                  Building2,
                  <input
                    type="text"
                    value={form.name}
                    onChange={update("name")}
                    placeholder="Acme Corp"
                    className={`${inputBase} pl-10`}
                    required
                  />
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  {t("searchCompanyWizard.manual.fields.industry", "Industry")}
                </label>
                <input
                  type="text"
                  value={form.industry}
                  onChange={update("industry")}
                  placeholder="SaaS / Telecom / Retail..."
                  className={inputBase}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  {t("searchCompanyWizard.manual.fields.founded", "Founded year")}
                </label>
                {fieldWithIcon(
                  Calendar,
                  <input
                    type="text"
                    value={form.founded}
                    onChange={update("founded")}
                    placeholder="2018"
                    className={`${inputBase} pl-10`}
                  />
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  {t("searchCompanyWizard.manual.fields.headquarters", "Headquarters")}
                </label>
                {fieldWithIcon(
                  MapPin,
                  <input
                    type="text"
                    value={form.headquarters}
                    onChange={update("headquarters")}
                    placeholder="Paris, France"
                    className={`${inputBase} pl-10`}
                  />
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  {t("searchCompanyWizard.manual.fields.logo", "Logo")}
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {form.logo ? (
                  <div className="flex items-center gap-4 rounded-2xl border-2 border-slate-200 bg-white p-4">
                    <div className="w-20 h-20 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                      <img src={form.logo} alt="Company logo" className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-700 truncate" title={form.logo}>
                        {form.logo}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={logoUploading}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-harx-200 bg-harx-50 px-3 py-1.5 text-[11px] font-bold text-harx-700 hover:bg-harx-100 active:scale-95 transition-all disabled:opacity-60"
                        >
                          <Upload size={12} />
                          {t("searchCompanyWizard.manual.logo.replace", "Replace")}
                        </button>
                        <button
                          type="button"
                          onClick={removeLogo}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-bold text-red-700 hover:bg-red-100 active:scale-95 transition-all"
                        >
                          <Trash2 size={12} />
                          {t("searchCompanyWizard.manual.logo.remove", "Remove")}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => !logoUploading && fileInputRef.current?.click()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        fileInputRef.current?.click();
                      }
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (!isDragging) setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={`group flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center cursor-pointer transition-all
                      ${isDragging
                        ? "border-harx-500 bg-harx-50/60"
                        : "border-slate-300 bg-white hover:border-harx-400 hover:bg-harx-50/30"}
                      ${logoUploading ? "opacity-70 cursor-wait" : ""}`}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-harx-100 to-harx-alt-100 flex items-center justify-center text-harx-600 group-hover:scale-110 transition-transform">
                      {logoUploading ? (
                        <Loader2 size={22} className="animate-spin" />
                      ) : (
                        <Upload size={22} />
                      )}
                    </div>
                    <p className="text-sm font-bold text-slate-800">
                      {logoUploading
                        ? t("searchCompanyWizard.manual.logo.uploading", "Uploading…")
                        : t("searchCompanyWizard.manual.logo.dropOrClick", "Drop your logo here or click to upload")}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {t("searchCompanyWizard.manual.logo.hint", "PNG, JPG, SVG · max 5 MB")}
                    </p>
                  </div>
                )}

                {!cloudinaryConfigured && (
                  <div className="mt-2">
                    {fieldWithIcon(
                      ImageIcon,
                      <input
                        type="url"
                        value={form.logo}
                        onChange={update("logo")}
                        placeholder="https://..."
                        className={`${inputBase} pl-10`}
                      />
                    )}
                  </div>
                )}

                {logoError && (
                  <p className="mt-2 text-xs text-red-600 flex items-center gap-1.5">
                    <XCircle size={12} /> {logoError}
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">
              {t("searchCompanyWizard.manual.about", "About")}
            </h3>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                {t("searchCompanyWizard.manual.fields.overview", "Overview")} *
              </label>
              <textarea
                rows={4}
                value={form.overview}
                onChange={update("overview")}
                placeholder={t(
                  "searchCompanyWizard.manual.placeholders.overview",
                  "Describe the company, what it does, and its market…"
                )}
                className={`${inputBase} resize-y`}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                {t("searchCompanyWizard.manual.fields.mission", "Mission")}
              </label>
              {fieldWithIcon(
                Target,
                <input
                  type="text"
                  value={form.mission}
                  onChange={update("mission")}
                  placeholder={t(
                    "searchCompanyWizard.manual.placeholders.mission",
                    "Our mission is to…"
                  )}
                  className={`${inputBase} pl-10`}
                />
              )}
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">
              {t("searchCompanyWizard.manual.contact", "Contact")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  {t("searchCompanyWizard.manual.fields.email", "Email")}
                </label>
                {fieldWithIcon(
                  Mail,
                  <input
                    type="email"
                    value={form.email}
                    onChange={update("email")}
                    placeholder="contact@company.com"
                    className={`${inputBase} pl-10`}
                  />
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  {t("searchCompanyWizard.manual.fields.phone", "Phone")}
                </label>
                {fieldWithIcon(
                  Phone,
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={update("phone")}
                    placeholder="+33 1 23 45 67 89"
                    className={`${inputBase} pl-10`}
                  />
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  {t("searchCompanyWizard.manual.fields.address", "Address")}
                </label>
                {fieldWithIcon(
                  MapPin,
                  <input
                    type="text"
                    value={form.address}
                    onChange={update("address")}
                    placeholder="10 rue de la Paix, 75002 Paris, France"
                    className={`${inputBase} pl-10`}
                  />
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  {t("searchCompanyWizard.manual.fields.website", "Website")}
                </label>
                {fieldWithIcon(
                  Globe,
                  <input
                    type="url"
                    value={form.website}
                    onChange={update("website")}
                    placeholder="https://company.com"
                    className={`${inputBase} pl-10`}
                  />
                )}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">
              {t("searchCompanyWizard.manual.social", "Social Media")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">LinkedIn</label>
                {fieldWithIcon(
                  Linkedin,
                  <input
                    type="url"
                    value={form.linkedin}
                    onChange={update("linkedin")}
                    placeholder="https://linkedin.com/company/..."
                    className={`${inputBase} pl-10`}
                  />
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Twitter / X</label>
                {fieldWithIcon(
                  Twitter,
                  <input
                    type="url"
                    value={form.twitter}
                    onChange={update("twitter")}
                    placeholder="https://twitter.com/..."
                    className={`${inputBase} pl-10`}
                  />
                )}
              </div>
            </div>
          </section>

          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <XCircle size={18} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border-2 border-slate-200 bg-white py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all"
            >
              {t("searchCompanyWizard.profile.cancel")}
            </button>
            <button
              type="submit"
              disabled={publishing}
              className="flex-1 rounded-xl bg-gradient-harx py-3 text-sm font-bold text-white hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {publishing ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  {t("searchCompanyWizard.profile.publishing")}
                </>
              ) : (
                <>
                  <Check size={16} />
                  {t("searchCompanyWizard.manual.submit", "Create Company")}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ManualCompanyForm;
