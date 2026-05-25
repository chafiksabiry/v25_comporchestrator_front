import axios from "axios";
import Cookies from "js-cookie";
import { discardDraftCompany } from "./companyApi";

const API_URL = import.meta.env.VITE_COMPANY_API_URL;

export interface CompanyProfile {
  userId: string;
  name: string;
  logo?: string;
  industry?: string;
  founded?: string;
  headquarters?: string;
  overview: string;
  mission?: string;
  culture: {
    values: string[];
    benefits: string[];
    workEnvironment: string;
  };
  opportunities: {
    roles: string[];
    growthPotential: string;
    training: string;
  };
  technology: {
    stack: string[];
    innovation: string;
  };
  contact: {
    coordinates: any;
    email?: string;
    phone?: string;
    address?: string;
    website?: string;
  };
  socialMedia: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
  };
}

export async function generateCompanyProfile(
  companyInfo: string,
  logoUrl?: string
): Promise<CompanyProfile> {
  const userId = Cookies.get("userId");
  if (!userId) {
    throw new Error("User ID not found in cookies");
  }

  const response = await axios.post(`${API_URL}/openai/generate-profile`, {
    companyInfo,
    userId,
    logoUrl,
    persist: false,
  });

  if (!response.data?.success) {
    throw new Error(response.data?.message || "Failed to generate company profile");
  }

  const raw = response.data.data as CompanyProfile & Record<string, unknown>;
  const draftId =
    typeof raw._id === "string"
      ? raw._id
      : raw._id && typeof raw._id === "object" && "$oid" in raw._id
        ? String((raw._id as { $oid: string }).$oid)
        : undefined;

  if (draftId) {
    try {
      await discardDraftCompany(draftId);
    } catch {
      console.warn("Could not discard draft company created during profile generation");
    }
  }

  const { _id, createdAt, updatedAt, __v, subscription, ...profile } = raw;
  return profile as CompanyProfile;
}

export async function generateCompanyProfileFromUrl(
  url: string,
  logoUrl?: string
): Promise<CompanyProfile> {
  const userId = Cookies.get("userId");
  if (!userId) {
    throw new Error("User ID not found in cookies");
  }

  const response = await axios.post(`${API_URL}/openai/generate-from-url`, {
    url,
    userId,
    logoUrl,
  });

  if (!response.data?.success) {
    throw new Error(response.data?.message || "Failed to scrape & generate profile");
  }

  const raw = response.data.data as CompanyProfile & Record<string, unknown>;
  const draftId =
    typeof raw._id === "string"
      ? raw._id
      : raw._id && typeof raw._id === "object" && "$oid" in raw._id
        ? String((raw._id as { $oid: string }).$oid)
        : undefined;

  if (draftId) {
    try {
      await discardDraftCompany(draftId);
    } catch {
      console.warn("Could not discard draft company created during profile generation");
    }
  }

  const { _id, createdAt, updatedAt, __v, subscription, ...profile } = raw;
  return profile as CompanyProfile;
}

export type CompanyProfileData = CompanyProfile;
