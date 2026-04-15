import React, { useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { ArrowLeft, CheckCircle2, Save } from "lucide-react";
import type { CompanyProfileData } from "./api/openai";
import { saveCompanyData } from "./api/companyApi";

interface Props {
  profile: CompanyProfileData;
  onBack: () => void;
  onDone?: () => void;
}

export default function SearchWizardCompanyProfile({ profile, onBack, onDone }: Props) {
  const [data, setData] = useState<CompanyProfileData>(profile);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setField = (path: string, value: string) => {
    setData((prev) => {
      const cloned = structuredClone(prev) as any;
      const parts = path.split(".");
      let current = cloned;
      for (let i = 0; i < parts.length - 1; i++) current = current[parts[i]];
      current[parts[parts.length - 1]] = value;
      return cloned;
    });
  };

  const markStepCompleted = async (companyId: string) => {
    const apiUrl =
      import.meta.env.VITE_COMPANY_API_URL ||
      "https://v25searchcompanywizardbackend-production.up.railway.app/api";
    await axios.put(`${apiUrl}/onboarding/companies/${companyId}/onboarding/phases/1/steps/1`, {
      status: "completed",
    });
  };

  const handlePublish = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await saveCompanyData(data);
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

      onDone?.();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Failed to publish company");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <h2 className="text-xl font-bold text-harx-600">Create Company Profile</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-harx-100 bg-white p-5 md:grid-cols-2">
        <input className="rounded-lg border p-3" value={data.name || ""} onChange={(e) => setField("name", e.target.value)} placeholder="Company Name" />
        <input className="rounded-lg border p-3" value={data.industry || ""} onChange={(e) => setField("industry", e.target.value)} placeholder="Industry" />
        <input className="rounded-lg border p-3" value={data.founded || ""} onChange={(e) => setField("founded", e.target.value)} placeholder="Founded" />
        <input className="rounded-lg border p-3" value={data.headquarters || ""} onChange={(e) => setField("headquarters", e.target.value)} placeholder="Headquarters" />
        <input className="rounded-lg border p-3 md:col-span-2" value={data.contact?.website || ""} onChange={(e) => setField("contact.website", e.target.value)} placeholder="Website" />
        <input className="rounded-lg border p-3" value={data.contact?.email || ""} onChange={(e) => setField("contact.email", e.target.value)} placeholder="Email" />
        <input className="rounded-lg border p-3" value={data.contact?.phone || ""} onChange={(e) => setField("contact.phone", e.target.value)} placeholder="Phone" />
        <textarea className="rounded-lg border p-3 md:col-span-2 min-h-28" value={data.overview || ""} onChange={(e) => setField("overview", e.target.value)} placeholder="Overview" />
        <textarea className="rounded-lg border p-3 md:col-span-2 min-h-24" value={data.mission || ""} onChange={(e) => setField("mission", e.target.value)} placeholder="Mission" />
      </div>

      {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="mt-5 flex justify-end">
        <button
          onClick={handlePublish}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-harx px-5 py-3 text-sm font-bold text-white disabled:opacity-70"
        >
          {saving ? <Save size={16} /> : <CheckCircle2 size={16} />}
          {saving ? "Publishing..." : "Publish Company"}
        </button>
      </div>
    </div>
  );
}
