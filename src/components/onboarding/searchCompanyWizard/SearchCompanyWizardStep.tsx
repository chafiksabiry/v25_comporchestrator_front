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

interface Props {
  onBack?: () => void;
  companyId?: string | null;
}

export default function SearchCompanyWizardStep({ onBack, companyId }: Props) {
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
          Loading company profile...
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
      setError(e?.message || "Failed to search companies");
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
      setError(e?.message || "Failed to generate profile");
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
      />
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold text-harx-600">Company Profile Search</h1>
        <p className="text-sm text-gray-500">Search a company and generate profile data for step 1.</p>
      </div>

      <div className="rounded-2xl border border-harx-100 bg-white p-5">
        <div className="relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Enter company name..."
            className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-12 outline-none focus:border-harx-400"
          />
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-harx-500 disabled:opacity-40"
          >
            <Search size={18} />
          </button>
        </div>

        {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div className="mt-5 space-y-3">
          {loading ? (
            <div className="py-6 text-sm text-gray-500">Loading...</div>
          ) : (
            results.map((result, idx) => (
              <div key={`${result.link}-${idx}`} className="rounded-xl border border-gray-100 p-4">
                <div className="flex items-start gap-3">
                  <CompanyLogo result={result} />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{result.title}</h3>
                    <p className="mt-1 text-sm text-gray-600">{result.snippet}</p>
                    <button
                      onClick={() => handleGenerate(result)}
                      className="mt-3 rounded-lg bg-gradient-harx px-4 py-2 text-xs font-bold text-white"
                    >
                      Generate Profile
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
