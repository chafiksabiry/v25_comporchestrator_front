import React, { useState, useEffect, useRef, createContext, useContext } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";
import ReactCrop, { centerCrop, makeAspectCrop, type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { uploadImage } from "./searchCompanyWizard/api/uploads";

import {
  Building2,
  MapPin,
  Globe,
  Phone,
  Mail,
  Pencil,
  Lock,
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
  Link2,
  X,
  Calendar,
  Factory,
  Linkedin,
  Twitter,
  Facebook,
  Instagram,
  ArrowRight,
} from "lucide-react";

import Cookies from 'js-cookie';
import { localizeText, uiLocale } from "../../utils/i18nText";
import { OnboardingBackButton } from "./searchCompanyWizard/OnboardingBackButton";

// Error Boundary Component
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <h2 className="text-lg font-bold mb-2">Something went wrong</h2>
          <p className="mb-4">We encountered an error while displaying this component.</p>
          <pre className="text-xs bg-red-100 p-2 rounded overflow-auto max-h-40">
            {this.state.error?.toString()}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}


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

interface CompanyContextType {
  company: Record<string, any>;
  editingField: string | null;
  editMode: boolean;
  tempValues: Record<string, any>;
  setEditingField: (field: string | null) => void;
  setTempValues: any;
  handleApplyChanges: (field: string) => void;
}

const CompanyContext = createContext<CompanyContextType | null>(null);

const getNestedValue = (obj: Record<string, any>, path: string) => {
  return path.split(".").reduce((acc, key) => acc && acc[key], obj);
};

function applyFieldValue(
  company: Record<string, any>,
  field: string,
  value: unknown,
  lang: string
) {
  const next = JSON.parse(JSON.stringify(company || {}));
  if (field.includes(".")) {
    const parts = field.split(".");
    let current = next;
    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i];
      if (!current[key] || typeof current[key] !== "object") current[key] = {};
      current = current[key];
    }
    current[parts[parts.length - 1]] = value;
  } else {
    next[field] = value;
    if (field === "overview" || field === "mission" || field === "industry" || field === "companyIntro") {
      const i18nKey = `${field}_i18n`;
      next[i18nKey] = {
        en: "",
        fr: "",
        ...(next[i18nKey] || {}),
        [lang]: String(value ?? ""),
      };
    }
  }
  return next;
}

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
  const { tempValues } = useContext(CompanyContext)!;
  const isHeroField = className.includes("text-white") || className.includes("text-5xl");
  const isLongTextField = field.includes("overview") || field.includes("mission") || field.includes("address");
  const shown = String(tempValues[field] ?? value ?? "");

  return (
    <div className={`relative group ${className}`}>
      {Icon && <Icon size={18} className="flex-shrink-0" />}
      <span className={`${isHeroField ? "" : "text-gray-800"} ${isLongTextField ? "whitespace-pre-line" : ""}`}>
        {shown || "—"}
      </span>
    </div>
  );
};

function CompanyProfile({
  companyId: propCompanyId,
  onBack,
}: {
  companyId?: string | null;
  onBack?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const lang = uiLocale(i18n.language);
  const [company, setCompany] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValues, setTempValues] = useState<Record<string, any>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [logoLink, setLogoLink] = useState("");
  const [logoShowLink, setLogoShowLink] = useState(false);
  const [logoImgSrc, setLogoImgSrc] = useState("");
  const [logoCrop, setLogoCrop] = useState<Crop>();
  const [logoCompletedCrop, setLogoCompletedCrop] = useState<PixelCrop>();
  const [logoCropOpen, setLogoCropOpen] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoPreviewOpen, setLogoPreviewOpen] = useState(false);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const logoImgRef = useRef<HTMLImageElement>(null);
  const [showUniquenessPanel, setShowUniquenessPanel] = useState(false);
  const [isStepCompleted, setIsStepCompleted] = useState(false);

  // Language switch → drop in-progress edits so EN/FR text from *_i18n is shown.
  useEffect(() => {
    setTempValues({});
    setEditingField(null);
  }, [lang]);

  const cookieCompanyId = Cookies.get('companyId');
  const companyId = propCompanyId || cookieCompanyId;
  

  // Define API URL with fallback
  const API_BASE_URL = import.meta.env.VITE_COMPANY_API_URL || 'https://v25searchcompanywizardbackend-production.up.railway.app/api';

  // Vérifier l'état de l'étape au chargement
  useEffect(() => {
    if (companyId) {
      
      checkStepStatus();
    }
  }, [companyId]);

  // Vérifier l'état de l'étape quand les données de l'entreprise sont chargées
  useEffect(() => {
    if (company && Object.keys(company).length > 0 && companyId) {
      
      // Attendre un peu que les données soient bien chargées
      setTimeout(() => {
        checkStepStatus();
      }, 500);
    }
  }, [company, companyId]);

  // Vérifier si l'étape peut être marquée comme complétée
  useEffect(() => {
    if (company && !isStepCompleted && hasBasicInfo()) {
      
      // Si l'entreprise a les informations de base, on peut marquer l'étape comme complétée
      checkStepStatus();
    }
  }, [company, isStepCompleted]);

  const hasBasicInfo = () => {
    const hasInfo = company.name && company.industry && company.contact?.email;
    
    return hasInfo;
  };

  const checkStepStatus = async () => {
    try {
      if (!companyId) {
        
        return;
      }

      

      // Vérifier l'état de l'étape 1 via l'API d'onboarding principale
      const response = await axios.get(
        `${API_BASE_URL}/onboarding/companies/${companyId}/onboarding`
      );

      

      if (response.data && (response.data as any).completedSteps && Array.isArray((response.data as any).completedSteps)) {
        if ((response.data as any).completedSteps.includes(1)) {
          
          setIsStepCompleted(true);
          return;
        } else {
          
        }
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
          console.error('❌ Error parsing stored progress:', e);
        }
      } else {
        
      }

      // Si l'étape n'est pas marquée comme complétée mais que les informations de base sont présentes,
      // marquer automatiquement l'étape comme complétée localement
      if (hasBasicInfo()) {
        

        // Marquer l'étape comme complétée localement
        setIsStepCompleted(true);

        // Mettre à jour le localStorage avec l'étape 1 marquée comme complétée
        const currentCompletedSteps = (response.data as any)?.completedSteps || [];
        const newCompletedSteps = currentCompletedSteps.includes(1) ? currentCompletedSteps : [...currentCompletedSteps, 1];

        const currentProgress = {
          currentPhase: 1,
          completedSteps: newCompletedSteps,
          lastUpdated: new Date().toISOString()
        };
        localStorage.setItem('companyOnboardingProgress', JSON.stringify(currentProgress));

        // Synchroniser avec les cookies
        Cookies.set('companyProfileStepCompleted', 'true', { expires: 7 });

        // Notifier le composant parent CompanyOnboarding via un événement personnalisé
        window.dispatchEvent(new CustomEvent('stepCompleted', {
          detail: {
            stepId: 1,
            phaseId: 1,
            status: 'completed',
            completedSteps: newCompletedSteps
          }
        }));

        

      } else {
        
      }

    } catch (error) {
      console.error('❌ Error checking step status:', error);
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

  const applyLogoUrl = async (url: string) => {
    const next = url.trim();
    if (!next) return;
    setLogoUrl(next);
    setCompany((prev) => ({ ...prev, logo: next }));
    setHasChanges(true);
    setLogoError(null);
    if (!companyId) return;
    const name = String(company.name || "").trim();
    const overview = String(company.overview || company.companyIntro || " ").trim() || " ";
    if (!name) {
      setEditingField(null);
      setLogoShowLink(false);
      return;
    }
    await axios.put(`${API_BASE_URL}/companies/${companyId}`, {
      name,
      overview,
      logo: next,
    });
    setEditingField(null);
    setLogoShowLink(false);
  };

  const openLogoPicker = () => {
    setLogoError(null);
    setLogoShowLink(false);
    setLogoLink(logoUrl || "");
    setEditingField("logo");
  };

  const onLogoImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = event.currentTarget;
    setLogoCrop(centerCrop(makeAspectCrop({ unit: "%", width: 90 }, 1, width, height), width, height));
  };

  const cropLogoToBlob = (image: HTMLImageElement, pixelCrop: PixelCrop) => {
    const canvas = document.createElement("canvas");
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = Math.max(1, Math.round(pixelCrop.width * scaleX));
    canvas.height = Math.max(1, Math.round(pixelCrop.height * scaleY));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.drawImage(
      image,
      pixelCrop.x * scaleX,
      pixelCrop.y * scaleY,
      pixelCrop.width * scaleX,
      pixelCrop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("empty"));
          return;
        }
        resolve(blob);
      }, "image/jpeg", 0.95);
    });
  };

  const handleLogoFile = (file: File) => {
    setLogoError(null);
    if (!file.type.startsWith("image/")) {
      setLogoError(t("searchCompanyWizard.manual.logo.invalidType", "Choisis une image."));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setLogoError(t("searchCompanyWizard.manual.logo.tooBig", "L'image doit faire moins de 5 Mo."));
      return;
    }
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setLogoImgSrc(reader.result?.toString() || "");
      setEditingField(null);
      setLogoCropOpen(true);
    });
    reader.readAsDataURL(file);
    if (logoFileRef.current) logoFileRef.current.value = "";
  };

  const handleLogoCropSave = async () => {
    if (!logoImgRef.current || !logoCompletedCrop) return;
    setLogoUploading(true);
    setLogoError(null);
    try {
      const blob = await cropLogoToBlob(logoImgRef.current, logoCompletedCrop);
      const file = new File([blob], "logo.jpg", { type: "image/jpeg" });
      const { url } = await uploadImage(file);
      if (!url) throw new Error("No URL returned");
      await applyLogoUrl(url);
      setLogoCropOpen(false);
      setLogoImgSrc("");
    } catch (err: any) {
      setLogoError(
        err?.response?.data?.message ||
          err?.message ||
          t("searchCompanyWizard.manual.logo.uploadFailed", "L'envoi du logo a échoué.")
      );
    } finally {
      setLogoUploading(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogoLink(e.target.value);
  };

  const getDomainFromWebsite = (website?: string): string | null => {
    if (!website) return null;
    try {
      return new URL(website).hostname;
    } catch {
      return null;
    }
  };



  // Original functions from the existing component
  const fetchCompanyDetails = async () => {
    try {
      if (!companyId) return;
      setLoading(true);
      const response = await axios.get<CompanyResponse>(
        `${API_BASE_URL}/companies/${companyId}/details`
      );
      const rawData = response.data.data as any;
      const normalizedCompany = {
        ...rawData,
        founded:
          rawData?.founded ??
          rawData?.foundedYear ??
          rawData?.yearFounded ??
          rawData?.establishedYear ??
          rawData?.year ??
          "",
      };
      setCompany(normalizedCompany);
      if (normalizedCompany.logo) {
        setLogoUrl(normalizedCompany.logo);
      } else if (normalizedCompany.logoUrl) {
        setLogoUrl(normalizedCompany.logoUrl);
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
    setCompany((prev) => applyFieldValue(prev, field, tempValues[field], lang));
    setEditingField(null);
    setTempValues({});
    setHasChanges(true);
  };


  const handleSaveAll = async (source?: Record<string, any>) => {
    const current = source || company;
    setSaving(true);
    try {
      
      
      
      

      const cleanData = (obj: any): any => {
        if (Array.isArray(obj)) {
          const arr = obj
            .map((item) => cleanData(item))
            .filter((item) => item !== undefined && item !== null && item !== "");
          return arr.length > 0 ? arr : undefined;
        }
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

      // Plain fields follow active UI language; *_i18n keeps both sides.
      const plainIndustry =
        localizeText(current.industry_i18n, lang) || current.industry;
      const plainOverview =
        localizeText(current.overview_i18n, lang) ||
        localizeText(current.companyIntro_i18n, lang) ||
        current.overview;
      const plainMission =
        localizeText(current.mission_i18n, lang) || current.mission;

      const rawPayload = {
        userId: current.userId,
        name: current.name,
        logo: current.logo || logoUrl,
        industry: plainIndustry,
        industry_i18n: current.industry_i18n,
        founded: current.founded,
        headquarters: current.headquarters,
        overview: plainOverview,
        overview_i18n: current.overview_i18n,
        mission: plainMission,
        mission_i18n: current.mission_i18n,
        companyIntro: current.companyIntro,
        companyIntro_i18n: current.companyIntro_i18n,
        culture: current.culture,
        opportunities: current.opportunities,
        technology: current.technology,
        contact: current.contact,
        socialMedia: current.socialMedia,
      };
      const payload = cleanData(rawPayload) || {};

      // Sauvegarder les informations de l'entreprise
      await axios.put(
        `${API_BASE_URL}/companies/${companyId}`,
        payload
      );

      

      // Marquer l'étape 1 comme complétée dans l'onboarding si les informations de base sont présentes
      if (!isStepCompleted && hasBasicInfo()) {
        
        try {
          

          // Récupérer l'état actuel de l'onboarding
          const onboardingResponse = await axios.get(
            `${API_BASE_URL}/onboarding/companies/${companyId}/onboarding`
          );

          const currentCompletedSteps = (onboardingResponse.data as any)?.completedSteps || [];
          const newCompletedSteps = currentCompletedSteps.includes(1) ? currentCompletedSteps : [...currentCompletedSteps, 1];

          // Mettre à jour l'onboarding avec l'étape 1 marquée comme complétée
          const updateResponse = await axios.put(
            `${API_BASE_URL}/onboarding/companies/${companyId}/onboarding`,
            {
              completedSteps: newCompletedSteps,
              currentPhase: 1
            }
          );

          

          // Mettre à jour l'état local
          setIsStepCompleted(true);

          // Mettre à jour le localStorage
          const currentProgress = {
            currentPhase: 1,
            completedSteps: newCompletedSteps,
            lastUpdated: new Date().toISOString()
          };
          localStorage.setItem('companyOnboardingProgress', JSON.stringify(currentProgress));

          // Synchroniser avec les cookies
          Cookies.set('companyProfileStepCompleted', 'true', { expires: 7 });

          

        } catch (onboardingError) {
          console.error('❌ Error updating onboarding progress:', onboardingError);
        }
      } else {
      }

      setHasChanges(false);
      setSaveSuccess(true);

      // Afficher un popup SweetAlert2 pour indiquer le succès
      Swal.fire({
        title: t("searchCompanyWizard.profile.savedTitle", "Enregistré"),
        text: t("searchCompanyWizard.profile.savedText", "Le profil de l'entreprise a été mis à jour."),
        icon: "success",
        confirmButtonText: t("searchCompanyWizard.profile.close", "Ok"),
      });

      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Erreur lors de la sauvegarde :", err);
      const errorMessage =
        (err as any)?.response?.data?.message ||
        (err as any)?.response?.data?.error ||
        t("searchCompanyWizard.profile.saveError", "Le profil n'a pas pu être enregistré.");
      Swal.fire({
        title: t("searchCompanyWizard.profile.errorTitle", "Erreur"),
        text: errorMessage,
        icon: "error",
        confirmButtonText: t("searchCompanyWizard.profile.close", "Ok"),
      });
    } finally {
      setSaving(false);
    }
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
    if (companyId) {
      fetchCompanyDetails();
    }
  }, [companyId]);

  if (loading) {
      return (
        <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl p-12 border border-harx-100">
            <div className="animate-pulse space-y-8">
              <div className="h-24 bg-harx-50 rounded-2xl w-full"></div>
              <div className="flex gap-8">
                <div className="h-32 w-32 bg-harx-50 rounded-2xl flex-shrink-0"></div>
                <div className="space-y-4 flex-1 py-2">
                  <div className="h-10 bg-harx-50 rounded-lg w-3/4"></div>
                  <div className="h-6 bg-harx-50 rounded-lg w-1/2"></div>
                </div>
              </div>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-harx-50 rounded-2xl border border-harx-50"></div>
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
    founded:
      company.founded ||
      company.foundedYear ||
      company.yearFounded ||
      company.establishedYear ||
      company.year ||
      '',
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

  const localizedIndustry =
    localizeText(company.industry_i18n, lang) || profile.industry || '';
  const localizedOverview =
    localizeText(company.overview_i18n, lang) ||
    localizeText(company.companyIntro_i18n, lang) ||
    profile.overview ||
    '';
  const localizedMission =
    localizeText(company.mission_i18n, lang) || profile.mission || '';

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

  const startEditing = () => {
    setTempValues({
      name: profile.name || "",
      industry: localizedIndustry,
      founded: profile.founded || "",
      headquarters: profile.headquarters || "",
      overview: localizedOverview,
      mission: localizedMission,
      "contact.email": profile.contact?.email || "",
      "contact.phone": profile.contact?.phone || "",
      "contact.website": profile.contact?.website || "",
      "contact.address": profile.contact?.address || "",
    });
    setEditingField(null);
    setEditMode(true);
  };

  const finishEditing = async () => {
    const merged = Object.entries(tempValues).reduce(
      (acc, [field, value]) => applyFieldValue(acc, field, value, lang),
      company
    );
    if (logoUrl) merged.logo = logoUrl;
    setCompany(merged);
    setTempValues({});
    setEditingField(null);
    setEditMode(false);
    setHasChanges(false);
    await handleSaveAll(merged);
  };

  const contextValue: CompanyContextType = {
    company,
    editingField,
    editMode,
    tempValues,
    setEditingField,
    setTempValues,
    handleApplyChanges
  };

  return (
    <CompanyContext.Provider value={contextValue}>
      <ErrorBoundary>
        <div className="min-h-screen bg-gray-50">
          {onBack ? (
            <div className="px-4 pt-4 sm:px-6">
              <OnboardingBackButton variant="cta" onClick={onBack} />
            </div>
          ) : null}
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
                <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-harx-900 to-harx-700/80" />

                <style>
                  {`
                  @keyframes shine {
                    0% { transform: translateX(-200%); }
                    100% { transform: translateX(200%); }
                  }
                `}
                </style>
              </div>

              <div className="absolute top-4 right-4 z-20">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    if (editMode) void finishEditing();
                    else startEditing();
                  }}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-70 ${
                    editMode
                      ? "bg-white text-emerald-700 ring-1 ring-emerald-300 hover:bg-white"
                      : "bg-white text-harx-700 ring-1 ring-harx-300 hover:bg-white"
                  }`}
                >
                  {editMode ? (
                    <>
                      <Lock size={14} />
                      {saving
                        ? t("searchCompanyWizard.profile.saving", "Enregistrement…")
                        : t("searchCompanyWizard.profile.doneEditing", "Terminé")}
                    </>
                  ) : (
                    <>
                      <Pencil size={14} />
                      {t("searchCompanyWizard.profile.editProfile", "Modifier")}
                    </>
                  )}
                </button>
              </div>

              <div className="relative h-full flex flex-col justify-end p-12 space-y-6">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        if (logoUrl) setLogoPreviewOpen(true);
                      }}
                      className={`w-24 h-24 bg-white rounded-2xl shadow-xl flex items-center justify-center p-4 overflow-hidden ${logoUrl ? "cursor-zoom-in" : "cursor-default"}`}
                    >
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt={profile.name}
                          className="w-full h-full object-contain"
                          onError={() => {
                            const domain = getDomainFromWebsite(profile.contact?.website);
                            if (domain) {
                              if (!logoUrl.includes("google.com/s2/favicons")) {
                                setLogoUrl(`https://www.google.com/s2/favicons?domain=${domain}&sz=64`);
                                return;
                              }
                              if (!logoUrl.includes("logo.clearbit.com")) {
                                setLogoUrl(`https://logo.clearbit.com/${domain}`);
                                return;
                              }
                            }
                            setLogoUrl("");
                          }}
                        />
                      ) : (
                        <Globe className="w-full h-full text-harx-500" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openLogoPicker();
                      }}
                      className="absolute -right-2 -top-2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-harx-500 hover:text-harx-600 transition-all hover:scale-110"
                      aria-label={t("searchCompanyWizard.profile.editLogo", "Modifier le logo")}
                    >
                      <Edit2 size={12} />
                    </button>
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <EditableField
                        value={profile.name}
                        field="name"
                        className="text-5xl font-bold text-white tracking-tight"
                      />
                    </div>
                    <div className="flex flex-wrap gap-6 text-white/90">
                      {(localizedIndustry || editMode) ? (
                        <EditableField
                          key={`industry-${lang}`}
                          value={localizedIndustry}
                          field="industry"
                          icon={Factory}
                          className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm"
                        />
                      ) : null}
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
            </div>
          </div>

          {editMode && (
            <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-6 sm:px-10">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                    {t("searchCompanyWizard.manual.fields.name", "Nom")}
                  </span>
                  <input
                    type="text"
                    value={String(tempValues.name ?? profile.name ?? "")}
                    onChange={(e) => setTempValues((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-harx-500 focus:ring-4 focus:ring-harx-500/10"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                    {t("searchCompanyWizard.manual.fields.industry", "Secteur")}
                  </span>
                  <input
                    type="text"
                    value={String(tempValues.industry ?? localizedIndustry ?? "")}
                    onChange={(e) => setTempValues((prev) => ({ ...prev, industry: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-harx-500 focus:ring-4 focus:ring-harx-500/10"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                    {t("searchCompanyWizard.manual.fields.email", "E-mail")}
                  </span>
                  <input
                    type="email"
                    value={String(tempValues["contact.email"] ?? profile.contact?.email ?? "")}
                    onChange={(e) => setTempValues((prev) => ({ ...prev, "contact.email": e.target.value }))}
                    placeholder={t("searchCompanyWizard.profile.placeholderEmail", "nom@entreprise.com")}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-harx-500 focus:ring-4 focus:ring-harx-500/10"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                    {t("searchCompanyWizard.manual.fields.phone", "Téléphone")}
                  </span>
                  <input
                    type="tel"
                    value={String(tempValues["contact.phone"] ?? profile.contact?.phone ?? "")}
                    onChange={(e) => setTempValues((prev) => ({ ...prev, "contact.phone": e.target.value }))}
                    placeholder={t("searchCompanyWizard.profile.placeholderPhone", "+33 1 23 45 67 89")}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-harx-500 focus:ring-4 focus:ring-harx-500/10"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                    {t("searchCompanyWizard.manual.fields.website", "Site web")}
                  </span>
                  <input
                    type="url"
                    value={String(tempValues["contact.website"] ?? profile.contact?.website ?? "")}
                    onChange={(e) => setTempValues((prev) => ({ ...prev, "contact.website": e.target.value }))}
                    placeholder={t("searchCompanyWizard.profile.placeholderWebsite", "https://exemple.com")}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-harx-500 focus:ring-4 focus:ring-harx-500/10"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                    {t("searchCompanyWizard.manual.fields.address", "Adresse")}
                  </span>
                  <input
                    type="text"
                    value={String(tempValues["contact.address"] ?? profile.contact?.address ?? "")}
                    onChange={(e) => setTempValues((prev) => ({ ...prev, "contact.address": e.target.value }))}
                    placeholder={t("searchCompanyWizard.profile.placeholderAddress", "Rue, ville, pays")}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-harx-500 focus:ring-4 focus:ring-harx-500/10"
                  />
                </label>
                <label className="block space-y-1.5 md:col-span-2">
                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                    {t("searchCompanyWizard.manual.fields.overview", "Aperçu de l'entreprise")}
                  </span>
                  <textarea
                    rows={4}
                    value={String(tempValues.overview ?? localizedOverview ?? "")}
                    onChange={(e) => setTempValues((prev) => ({ ...prev, overview: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm leading-relaxed text-slate-900 outline-none focus:border-harx-500 focus:ring-4 focus:ring-harx-500/10"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="flex">
            {/* Sidebar - Contact & Digital Presence */}
            <div className="w-80 flex-shrink-0 bg-gradient-to-b from-gray-50 to-white border-r border-gray-200">
              <div className="p-6 space-y-8">
                {/* Contact Information */}
                {(hasContactInfo || editMode) && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <Mail className="text-blue-600" size={20} />
                      {t('searchCompanyWizard.profile.contactInfo')}
                    </h3>
                    <div className="space-y-3">
                      {(profile.contact?.email || editMode) && (
                        <EditableField
                          value={profile.contact.email}
                          field="contact.email"
                          icon={Mail}
                          className="flex items-center gap-3 text-gray-600 hover:text-blue-600 transition-colors text-sm"
                        />
                      )}
                      {(profile.contact?.phone || editMode) && (
                        <EditableField
                          value={profile.contact.phone}
                          field="contact.phone"
                          icon={Phone}
                          className="flex items-center gap-3 text-gray-600 hover:text-blue-600 transition-colors text-sm"
                        />
                      )}
                      {(profile.contact?.website || editMode) && (
                        <EditableField
                          value={profile.contact.website}
                          field="contact.website"
                          icon={Globe}
                          className="flex items-center gap-3 text-gray-600 hover:text-blue-600 transition-colors text-sm"
                        />
                      )}
                      {(profile.contact?.address || editMode) && (
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

                {/* Digital Presence */}
                {hasSocialMedia && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <Globe className="text-blue-600" size={20} />
                      {t('searchCompanyWizard.profile.digitalPresence')}
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
                      <div className="min-w-0 flex-1">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">
                          {t('searchCompanyWizard.profile.companyOverview')}
                        </h2>
                        <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                          {String(tempValues.overview ?? localizedOverview ?? "") || "—"}
                        </p>
                      </div>
                    </div>

                    {(localizedMission || editMode) ? (
                      <div className="ml-18 p-8 bg-gradient-to-br from-indigo-50 via-blue-50 to-white rounded-2xl border border-indigo-100/50 shadow-sm">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 shrink-0 rounded-2xl bg-indigo-500 flex items-center justify-center">
                            <Target className="text-white" size={24} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-xl font-bold text-indigo-700 mb-3">
                              {t('searchCompanyWizard.profile.ourMission')}
                            </h3>
                            {editMode ? (
                              <textarea
                                value={String(tempValues.mission ?? localizedMission ?? "")}
                                onChange={(e) => setTempValues((prev) => ({ ...prev, mission: e.target.value }))}
                                rows={4}
                                className="w-full resize-y rounded-xl border border-indigo-100 bg-white px-4 py-3 text-sm leading-relaxed text-slate-800 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10"
                              />
                            ) : (
                              <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                                {localizedMission}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </section>
              </div>
            </div>
          </div>
          </div>
        </div>
        </div>
        {logoPreviewOpen && logoUrl && createPortal(
          <div
            className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-md"
            onClick={() => setLogoPreviewOpen(false)}
          >
            <div
              className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setLogoPreviewOpen(false)}
                className="absolute right-4 top-4 z-10 rounded-full bg-slate-900/10 p-2 text-slate-700 hover:bg-slate-900/20"
                aria-label={t("searchCompanyWizard.profile.close", "Fermer")}
              >
                <X size={18} />
              </button>
              <div className="flex min-h-[280px] items-center justify-center bg-slate-50 p-10">
                <img src={logoUrl} alt={profile.name} className="max-h-[70vh] w-full object-contain" />
              </div>
            </div>
          </div>,
          document.body
        )}
        {editingField === "logo" && createPortal(
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm"
            onClick={() => setEditingField(null)}
          >
            <div
              className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <h3 className="text-base font-black uppercase tracking-wide text-slate-900">
                  {t("searchCompanyWizard.profile.editLogo", "Modifier le logo")}
                </h3>
                <button type="button" onClick={() => setEditingField(null)} className="rounded-xl p-2 hover:bg-slate-50">
                  <X size={18} className="text-slate-400" />
                </button>
              </div>
              <div className="space-y-2 p-4">
                <button
                  type="button"
                  onClick={() => logoFileRef.current?.click()}
                  className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 px-4 py-3.5 text-left transition-all hover:border-harx-200 hover:bg-harx-50/40"
                >
                  <div className="rounded-xl bg-slate-100 p-2.5 text-slate-600">
                    <Upload size={18} />
                  </div>
                  <span className="text-sm font-bold text-slate-800">
                    {t("searchCompanyWizard.profile.chooseImage", "Choisir une image")}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setLogoShowLink((open) => !open)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 px-4 py-3.5 text-left transition-all hover:border-harx-200 hover:bg-harx-50/40"
                >
                  <div className="rounded-xl bg-harx-50 p-2.5 text-harx-600">
                    <Link2 size={18} />
                  </div>
                  <span className="text-sm font-bold text-slate-800">
                    {t("searchCompanyWizard.profile.useLink", "Utiliser un lien")}
                  </span>
                </button>
                {logoShowLink && (
                  <div className="space-y-3 rounded-2xl border border-slate-100 p-3">
                    <input
                      type="url"
                      value={logoLink}
                      onChange={handleLogoChange}
                      placeholder="https://"
                      className="w-full rounded-xl border-2 border-harx-100 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-harx-500"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingField(null)}
                        className="px-3 py-1.5 text-sm font-bold text-slate-500"
                      >
                        {t("searchCompanyWizard.profile.cancel", "Annuler")}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await applyLogoUrl(logoLink);
                          } catch (err: any) {
                            setLogoError(
                              err?.response?.data?.message ||
                                t("searchCompanyWizard.manual.logo.uploadFailed", "L'envoi du logo a échoué.")
                            );
                          }
                        }}
                        disabled={!logoLink.trim()}
                        className="rounded-xl bg-gradient-harx px-4 py-1.5 text-sm font-bold text-white disabled:opacity-50"
                      >
                        {t("searchCompanyWizard.profile.save", "Enregistrer")}
                      </button>
                    </div>
                  </div>
                )}
                {logoError && <p className="px-1 text-xs font-semibold text-rose-600">{logoError}</p>}
              </div>
            </div>
          </div>,
          document.body
        )}
        {logoCropOpen && logoImgSrc && createPortal(
          <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-md">
            <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <h3 className="text-xl font-black text-slate-900">
                  {t("searchCompanyWizard.profile.cropLogo", "Rogner le logo")}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setLogoCropOpen(false);
                    setLogoImgSrc("");
                  }}
                  className="rounded-xl p-2 hover:bg-slate-50"
                >
                  <X size={18} className="text-slate-400" />
                </button>
              </div>
              <div className="flex flex-1 items-center justify-center overflow-auto bg-slate-50/50 p-6">
                <ReactCrop
                  crop={logoCrop}
                  onChange={(next) => setLogoCrop(next)}
                  onComplete={(next) => setLogoCompletedCrop(next)}
                  aspect={1}
                >
                  <img
                    ref={logoImgRef}
                    src={logoImgSrc}
                    alt=""
                    onLoad={onLogoImageLoad}
                    className="max-h-[50vh] max-w-full object-contain"
                  />
                </ReactCrop>
              </div>
              {logoError && <p className="px-6 pb-2 text-xs font-semibold text-rose-600">{logoError}</p>}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4">
                <button
                  type="button"
                  onClick={() => {
                    setLogoCropOpen(false);
                    setLogoImgSrc("");
                  }}
                  className="rounded-xl border border-slate-200 px-6 py-2.5 text-sm font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50"
                >
                  {t("searchCompanyWizard.profile.cancel", "Annuler")}
                </button>
                <button
                  type="button"
                  disabled={logoUploading || !logoCompletedCrop}
                  onClick={() => void handleLogoCropSave()}
                  className="rounded-xl bg-gradient-harx px-8 py-2.5 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-harx-500/20 disabled:opacity-60"
                >
                  {logoUploading
                    ? t("searchCompanyWizard.profile.saving", "Enregistrement…")
                    : t("searchCompanyWizard.profile.save", "Enregistrer")}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
        <input
          ref={logoFileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handleLogoFile(file);
          }}
        />
      </ErrorBoundary>
    </CompanyContext.Provider>
  );
}

export default CompanyProfile;
