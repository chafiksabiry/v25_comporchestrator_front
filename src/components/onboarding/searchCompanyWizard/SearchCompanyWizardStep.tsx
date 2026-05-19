import React, { useState } from "react";
import { useEffect } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { Search } from "lucide-react";
import { googleApi, type GoogleSearchResult } from "./api/google";
import { generateCompanyProfile, type CompanyProfileData } from "./api/openai";
import { CompanyLogo } from "./CompanyLogo";
import { CompanyProfile } from "./CompanyProfile";
import ExistingCompanyProfile from "../CompanyProfile";
import { useTranslation } from "react-i18next";

interface Props {
  onBack?: () => void;
  companyId?: string | null;
  /** Called after publish — returns to onboarding phase view (not search) */
  onStepComplete?: (companyId: string) => void;
}

export default function SearchCompanyWizardStep({ onBack, companyId, onStepComplete }: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GoogleSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<CompanyProfileData | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [existingCompanyId, setExistingCompanyId] = useState<string | null>(null);

  useEffect(() => {
    const checkExistingCompany = async () => {
      const fallbackCompanyId =
        companyId || Cookies.get("companyId") || localStorage.getItem("companyId");

      if (!fallbackCompanyId) {
        setExistingCompanyId(null);
        setCheckingExisting(false);
        return;
      }

      try {
        const apiBase =
          import.meta.env.VITE_COMPANY_API_URL ||
          "https://v25searchcompanywizardbackend-production.up.railway.app/api";
        await axios.get(`${apiBase}/companies/${fallbackCompanyId}/details`);
        setExistingCompanyId(fallbackCompanyId);
      } catch {
        setExistingCompanyId(null);
      } finally {
        setCheckingExisting(false);
      }
    };

    checkExistingCompany();
  }, [companyId]);

  if (checkingExisting) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <div className="rounded-2xl border border-harx-100 bg-white p-6 text-sm text-gray-500">
          {t('searchCompanyWizard.loadingProfile')}
        </div>
      </div>
    );
  }

  if (existingCompanyId) {
    return <ExistingCompanyProfile companyId={existingCompanyId} />;
  }

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const data = await googleApi.search(query.trim());
      setResults(data);
    } catch (e: any) {
      setError(e?.message || t('searchCompanyWizard.errors.searchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (result: GoogleSearchResult) => {
    setLoading(true);
    setError(null);
    try {
      let logoUrl = result.pagemap?.metatags?.[0]?.["og:image"];
      if (!logoUrl && result.link) {
        try {
          const domain = new URL(result.link).hostname;
          logoUrl = `https://logo.clearbit.com/${domain}`;
        } catch {
          // Ignore invalid URL
        }
      }

      const companyInfo = [
        `Company Name: ${result.title}`,
        `Website: ${result.link}`,
        `Description: ${result.snippet}`,
      ].join("\n");

      const generated = await generateCompanyProfile(companyInfo, logoUrl);
      if (!generated.logo && logoUrl) generated.logo = logoUrl;
      setProfile(generated);
    } catch (e: any) {
      setError(e?.message || t('searchCompanyWizard.errors.generateFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (profile) {
    return (
      <CompanyProfile
        profile={profile}
        onClose={() => {
          setProfile(null);
          onBack?.();
        }}
        onPublished={(newCompanyId) => {
          setProfile(null);
          if (onStepComplete) {
            onStepComplete(newCompanyId);
          } else {
            onBack?.();
          }
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-6 animate-fade-in relative overflow-hidden min-h-[600px] flex flex-col justify-center">
      {/* Background Animated Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[5%] left-[10%] w-[30%] h-[30%] bg-gradient-to-br from-harx-400/30 to-harx-alt-400/30 blur-[80px] rounded-full animate-float" />
        <div className="absolute bottom-[5%] right-[10%] w-[40%] h-[40%] bg-gradient-to-tl from-harx-alt-400/30 to-harx-400/30 blur-[100px] rounded-full animate-float" style={{ animationDelay: '3s' }} />
      </div>

      <div className="relative z-10">
        <div className="mb-8 text-center lg:text-left">
          <h1 className="text-4xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-harx-600 to-harx-alt-600">
            {t('searchCompanyWizard.title')}
          </h1>
          <p className="text-gray-500 text-lg">{t('searchCompanyWizard.subtitle')}</p>
        </div>

        <div className="rounded-3xl border border-white/60 bg-white/70 backdrop-blur-xl p-8 shadow-2xl relative overflow-hidden">
          {/* Decorative background blur inside card */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-harx-400/10 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-harx-alt-400/10 blur-3xl rounded-full pointer-events-none" />

          <div className="relative z-10">
          <div className="relative group">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder={t('searchCompanyWizard.placeholder')}
              className="w-full rounded-2xl border-2 border-gray-100 px-6 py-4 pr-14 text-lg outline-none focus:border-harx-400 focus:ring-4 focus:ring-harx-400/20 transition-all bg-gray-50/50 focus:bg-white"
            />
            <button
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-3 bg-gradient-harx text-white disabled:opacity-40 hover:scale-105 transition-transform shadow-lg shadow-harx-500/20"
            >
              <Search size={22} />
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2">
              <span className="w-2 h-2 bg-red-600 rounded-full flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="mt-8 space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {loading ? (
              <div className="py-10 text-center text-gray-500 flex flex-col items-center gap-3">
                <div className="animate-spin h-8 w-8 border-4 border-harx-500 border-t-transparent rounded-full" />
                <span>{t('searchCompanyWizard.loading')}</span>
              </div>
            ) : (
              results.map((result, idx) => (
                <div 
                  key={`${result.link}-${idx}`} 
                  className="rounded-2xl border border-gray-100 p-6 hover:shadow-lg transition-all duration-300 hover:border-harx-200 group bg-white"
                >
                  <div className="flex items-start gap-5">
                    <div className="transform group-hover:scale-105 transition-transform">
                      <CompanyLogo result={result} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-xl text-gray-900 group-hover:text-harx-600 transition-colors">
                        {result.title}
                      </h3>
                      <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                        {result.snippet}
                      </p>
                      <button
                        onClick={() => handleGenerate(result)}
                        className="mt-4 rounded-xl bg-gradient-harx px-6 py-2.5 text-xs font-bold text-white hover:shadow-lg hover:shadow-harx-500/20 transform hover:-translate-y-0.5 transition-all"
                      >
                        {t('searchCompanyWizard.generateBtn')}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
