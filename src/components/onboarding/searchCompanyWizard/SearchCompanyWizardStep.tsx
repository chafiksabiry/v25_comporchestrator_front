import React, { useState } from "react";
import { useEffect } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { Search, Globe, Link as LinkIcon, PenLine } from "lucide-react";
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
  const [urlInput, setUrlInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [urlLoading, setUrlLoading] = useState(false);
  const [results, setResults] = useState<GoogleSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<CompanyProfileData | null>(null);
  const [manualMode, setManualMode] = useState(false);
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

  const handleGenerateFromUrl = async () => {
    const raw = urlInput.trim();
    if (!raw) return;
    setUrlLoading(true);
    setError(null);
    try {
      const generated = await generateCompanyProfileFromUrl(raw);
      setProfile(generated);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || t('searchCompanyWizard.errors.generateFailed'));
    } finally {
      setUrlLoading(false);
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
        <div className="mb-8 text-center lg:text-left">
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
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder={t('searchCompanyWizard.placeholder')}
                className="w-full rounded-2xl border-2 border-slate-200 px-6 py-4 pr-14 text-lg outline-none focus:border-harx-500 focus:ring-4 focus:ring-harx-500/10 transition-all bg-white text-slate-900 placeholder-slate-400"
              />
              <button
                onClick={handleSearch}
                disabled={loading || !query.trim()}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-3 bg-gradient-harx text-white disabled:opacity-40 hover:opacity-90 active:scale-95 transition-all"
              >
                <Search size={22} />
              </button>
            </div>

            <div className="my-6 flex items-center gap-4">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                {t('searchCompanyWizard.orScrapeUrl', 'Or scrape from URL')}
              </span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            <div className="relative group">
              <LinkIcon
                size={20}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-harx-500 transition-colors"
              />
              <input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerateFromUrl()}
                placeholder={t('searchCompanyWizard.urlPlaceholder', 'https://company.com — paste a website URL')}
                className="w-full rounded-2xl border-2 border-slate-200 pl-12 pr-40 py-4 text-base outline-none focus:border-harx-500 focus:ring-4 focus:ring-harx-500/10 transition-all bg-white text-slate-900 placeholder-slate-400"
              />
              <button
                onClick={handleGenerateFromUrl}
                disabled={urlLoading || !urlInput.trim()}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl px-4 py-2.5 bg-gradient-harx text-white text-sm font-bold disabled:opacity-40 hover:opacity-90 active:scale-95 transition-all flex items-center gap-2"
              >
                {urlLoading ? (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Globe size={16} />
                )}
                {t('searchCompanyWizard.scrapeBtn', 'Scrape & Generate')}
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500 pl-1">
              {t(
                'searchCompanyWizard.urlHint',
                'Use this when search results are incomplete or the company has no clear CEO/contact info.'
              )}
            </p>

            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-4">
              <div className="w-10 h-10 rounded-xl bg-harx-50 flex items-center justify-center text-harx-600 flex-shrink-0">
                <PenLine size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900">
                  {t('searchCompanyWizard.manual.noWebsite', "No website? Create the company manually.")}
                </p>
                <p className="text-xs text-slate-500">
                  {t('searchCompanyWizard.manual.noWebsiteHint', "Fill the form yourself — no search or scraping required.")}
                </p>
              </div>
              <button
                onClick={() => setManualMode(true)}
                className="rounded-xl border-2 border-harx-200 px-4 py-2 text-xs font-bold text-harx-700 hover:bg-harx-50 active:scale-95 transition-all"
              >
                {t('searchCompanyWizard.manual.openBtn', 'Create manually')}
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
