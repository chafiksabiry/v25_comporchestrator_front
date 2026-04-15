import axios from "axios";
import Cookies from "js-cookie";

const API_URL = import.meta.env.VITE_COMPANY_API_URL;

export interface CompanyProfileData {
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
): Promise<CompanyProfileData> {
  const userId = Cookies.get("userId");
  if (!userId) {
    throw new Error("User ID not found in cookies");
  }

  const response = await axios.post(`${API_URL}/openai/generate-profile`, {
    companyInfo,
    userId,
    logoUrl,
  });

  if (!response.data?.success) {
    throw new Error(response.data?.message || "Failed to generate company profile");
  }

  return response.data.data as CompanyProfileData;
}
