import React, { useState } from "react";
import { useEffect } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { Search, Globe, PenLine, Sparkles } from "lucide-react";
import { googleApi, type GoogleSearchResult } from "./api/google";
import {
  generateCompanyProfile,
  generateCompanyProfileFromUrl,
  type CompanyProfileData,
} from "./api/openai";
import { CompanyLogo } from "./CompanyLogo";
import { CompanyProfile } from "./CompanyProfile";
import ManualCompanyForm from "./ManualCompanyForm";
import ExistingCompanyProfile from "../CompanyProfile";
import { useTranslation } from "react-i18next";
import { div } from "@tensorflow/tfjs";

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
  const [manualMode, setManualMode] = useState(false);

  const trimmedQuery = query.trim();
  const looksLikeUrl = /^(https?:\/\/|www\.)/i.test(trimmedQuery) ||
    /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/.*)?$/i.test(trimmedQuery);
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

  const runSearch = async () => {
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const data = await googleApi.search(trimmedQuery);
      setResults(data);
    } catch (e: any) {
      setError(e?.message || t('searchCompanyWizard.errors.searchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const runScrape = async () => {
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const generated = await generateCompanyProfileFromUrl(trimmedQuery);
      setProfile(generated);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || t('searchCompanyWizard.errors.generateFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!trimmedQuery) return;
    if (looksLikeUrl) {
      await runScrape();
    } else {
      await runSearch();
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

      if (result.link) {
        try {
          const generated = await generateCompanyProfileFromUrl(result.link, logoUrl);
          if (!generated.logo && logoUrl) generated.logo = logoUrl;
          setProfile(generated);
          return;
        } catch (scrapeErr) {
          console.warn('Scrape fallback to plain generate:', scrapeErr);
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

  if (manualMode) {
    return (
      <ManualCompanyForm
        onClose={() => setManualMode(false)}
        onPublished={(newCompanyId) => {
          setManualMode(false);
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
        <div className="absolute top-[5%] left-[10%] w-[30%] h-[30%] bg-gradient-to-br from-harx-200/40 to-harx-alt-200/40 blur-[80px] rounded-full animate-float" />
        <div className="absolute bottom-[5%] right-[10%] w-[40%] h-[40%] bg-gradient-to-tl from-harx-alt-200/40 to-harx-200/40 blur-[100px] rounded-full animate-float" style={{ animationDelay: '3s' }} />
      </div>

      <div className="relative z-10">
        <button
          onClick={() => setManualMode(true)}
          className="manual-cta-btn group absolute right-0 top-0 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-harx-500 to-harx-alt-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-harx-500/40 hover:shadow-xl hover:shadow-harx-500/60 hover:-translate-y-0.5 active:scale-95 transition-all duration-300"
          aria-label={t('searchCompanyWizard.manual.openBtn', 'Create manually')}
          title={t('searchCompanyWizard.manual.noWebsite', 'No website? Create the company manually.')}
        >
          <span className="manual-cta-glow absolute inset-0 rounded-full bg-gradient-to-r from-harx-400 to-harx-alt-400 opacity-70 blur-md -z-10" />
          <span className="manual-cta-ping absolute inset-0 rounded-full bg-harx-400/40 -z-10" />
          <PenLine size={16} className="transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
          <span className="hidden sm:inline">{t('searchCompanyWizard.manual.openBtn', 'Create manually')}</span>
          <Sparkles size={14} className="opacity-80 transition-transform duration-500 group-hover:translate-x-0.5 group-hover:scale-125" />
        </button>
        <style>{`
          @keyframes manualCtaPulse {
            0%, 100% { opacity: 0.55; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.04); }
          }
          @keyframes manualCtaPing {
            0% { opacity: 0.55; transform: scale(0.95); }
            100% { opacity: 0; transform: scale(1.45); }
          }
          .manual-cta-glow {
            animation: manualCtaPulse 2.6s ease-in-out infinite;
          }
          .manual-cta-ping {
            animation: manualCtaPing 2.6s ease-out infinite;
          }
          .manual-cta-btn:hover .manual-cta-glow {
            opacity: 1;
            animation-duration: 1.6s;
          }
        `}</style>

        <div className="mb-8 text-center lg:text-left pr-44">
          <h1 className="text-4xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-harx-700 to-harx-alt-700">
            {t('searchCompanyWizard.title')}
          </h1>
          <p className="text-slate-700 text-lg font-medium">{t('searchCompanyWizard.subtitle')}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 relative overflow-hidden">
          {/* Decorative background blur inside card */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-harx-100/40 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-harx-alt-100/40 blur-3xl rounded-full pointer-events-none" />

          <div className="relative z-10">
            <div className="relative group">
              {looksLikeUrl ? (
                <Globe
                  size={20}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-harx-500 transition-colors"
                />
              ) : (
                <Search
                  size={20}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-harx-500 transition-colors"
                />
              )}
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder={t('searchCompanyWizard.unifiedPlaceholder', 'Company name or website URL (e.g. Acme Corp or https://acme.com)')}
                className="w-full rounded-2xl border-2 border-slate-200 pl-12 pr-44 py-4 text-base outline-none focus:border-harx-500 focus:ring-4 focus:ring-harx-500/10 transition-all bg-white text-slate-900 placeholder-slate-400"
              />
              <button
                onClick={handleSubmit}
                disabled={loading || !trimmedQuery}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl px-4 py-2.5 bg-gradient-harx text-white text-sm font-bold disabled:opacity-40 hover:opacity-90 active:scale-95 transition-all flex items-center gap-2"
              >
                {loading ? (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                ) : looksLikeUrl ? (
                  <Sparkles size={16} />
                ) : (
                  <Search size={16} />
                )}
                {looksLikeUrl
                  ? t('searchCompanyWizard.scrapeBtn', 'Scrape & Generate')
                  : t('searchCompanyWizard.searchBtn', 'Search')}
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500 pl-1">
              {looksLikeUrl
                ? t('searchCompanyWizard.urlDetected', 'URL detected — we will scrape the page and generate the profile.')
                : t('searchCompanyWizard.unifiedHint', 'Type a company name to search, or paste a URL to scrape it directly.')}
            </p>

            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2">
                <span className="w-2 h-2 bg-red-600 rounded-full flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="mt-8 space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {loading ? (
                <div className="py-10 text-center text-slate-600 flex flex-col items-center gap-3">
                  <div className="animate-spin h-8 w-8 border-4 border-harx-500 border-t-transparent rounded-full" />
                  <span>{t('searchCompanyWizard.loading')}</span>
                </div>
              ) : (
                results.map((result, idx) => (
                  <div 
                    key={`${result.link}-${idx}`} 
                    className="rounded-2xl border border-slate-200 p-6 transition-all duration-300 hover:bg-harx-50/40 hover:border-harx-300 group bg-white"
                  >
                    <div className="flex items-start gap-5">
                      <div className="transform group-hover:scale-105 transition-transform">
                        <CompanyLogo result={result} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-xl text-slate-900 group-hover:text-harx-700 transition-colors">
                          {result.title}
                        </h3>
                        <p className="mt-2 text-sm text-slate-700 leading-relaxed">
                          {result.snippet}
                        </p>
                        <button
                          onClick={() => handleGenerate(result)}
                          className="mt-4 rounded-xl bg-gradient-harx px-6 py-2.5 text-xs font-bold text-white hover:opacity-90 active:scale-95 transition-all"
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
