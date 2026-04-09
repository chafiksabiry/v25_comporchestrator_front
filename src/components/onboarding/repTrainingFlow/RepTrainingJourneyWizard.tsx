import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, RefreshCw, Save, Upload, ArrowLeft, Sparkles } from 'lucide-react';
import { getGigsByCompanyId } from '../../../api/matching';
import SlideDeckViewer from './SlideDeckViewer';
import {
  analyzeDocument,
  generateCurriculum,
  generatePresentation,
  generateTrainingFromGig,
  normalizePresentationFromApi
} from './trainingGenerationApi';
import { saveTrainingJourney } from './saveTrainingJourney';
import { fetchCompanyProfile, getCompanyIdFromCookies } from './companyProfile';

type Step = 'setup' | 'upload' | 'preview';

interface RepTrainingJourneyWizardProps {
  companyId: string | null;
  legacyCompanyId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function RepTrainingJourneyWizard({
  companyId,
  legacyCompanyId,
  onClose,
  onSaved
}: RepTrainingJourneyWizardProps) {
  const effectiveCompanyId = legacyCompanyId || companyId || getCompanyIdFromCookies() || '';

  const [step, setStep] = useState<Step>('setup');
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('General');
  const [gigs, setGigs] = useState<any[]>([]);
  const [gigId, setGigId] = useState<string>('');
  const [trainingTitle, setTrainingTitle] = useState('');

  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<Record<string, unknown> | null>(null);
  const [curriculum, setCurriculum] = useState<Record<string, unknown> | null>(null);
  const [presentation, setPresentation] = useState<Record<string, unknown> | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadGigs = useCallback(async () => {
    if (!companyId) return;
    try {
      const list = await getGigsByCompanyId(companyId);
      setGigs(Array.isArray(list) ? list : []);
    } catch {
      setGigs([]);
    }
  }, [companyId]);

  useEffect(() => {
    if (!effectiveCompanyId) return;
    (async () => {
      const profile = await fetchCompanyProfile(effectiveCompanyId);
      if (profile?.name) setCompanyName(profile.name);
      if (profile?.industry) setIndustry(String(profile.industry));
    })();
  }, [effectiveCompanyId]);

  useEffect(() => {
    loadGigs();
  }, [loadGigs]);

  const meta = { companyId: effectiveCompanyId, gigId: gigId || undefined };

  const runGenerateFromFile = async () => {
    if (!file) {
      setError('Choose a document first.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const a = await analyzeDocument(file, meta);
      setAnalysis(a);
      const uploadContext = [
        {
          fileName: file.name,
          fileType: file.type || 'document',
          keyTopics: (a.keyTopics as string[]) || [],
          learningObjectives: (a.learningObjectives as string[]) || []
        }
      ];
      let cur = await generateCurriculum(a, industry, gigId || undefined, uploadContext);
      setCurriculum(cur);

      let pres =
        normalizePresentationFromApi((cur as any).data?.presentation) || (cur as any).data?.presentation || null;
      if (!pres?.slides?.length) {
        pres = normalizePresentationFromApi(await generatePresentation(cur)) || pres;
      }
      setPresentation(pres);
      setStep('preview');
    } catch (e: any) {
      setError(e?.message || 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  const runGenerateFromGig = async () => {
    if (!gigId) {
      setError('Select a gig.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const cur = await generateTrainingFromGig(gigId);
      setCurriculum(cur);
      let pres =
        normalizePresentationFromApi((cur as any).data?.presentation) || (cur as any).data?.presentation || null;
      if (!pres?.slides?.length) {
        pres = normalizePresentationFromApi(await generatePresentation(cur)) || pres;
      }
      setPresentation(pres);
      setStep('preview');
    } catch (e: any) {
      setError(e?.message || 'Gig generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateSlides = async () => {
    if (!curriculum) return;
    setLoading(true);
    setError(null);
    try {
      const pres = normalizePresentationFromApi(await generatePresentation(curriculum));
      setPresentation(pres);
    } catch (e: any) {
      setError(e?.message || 'Regenerate failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!curriculum || !presentation) return;
    setLoading(true);
    setError(null);
    try {
      const title =
        trainingTitle.trim() ||
        (curriculum.title as string) ||
        (presentation.title as string) ||
        'Generated training';
      const modules = ((curriculum.modules as any[]) || []).map((m: any, idx: number) => ({
        title: m.title || `Module ${idx + 1}`,
        description: m.description || '',
        duration: m.duration || 30,
        difficulty: m.difficulty || 'beginner',
        learningObjectives: m.learningObjectives || [],
        sections: m.sections || [],
        quizzes: m.quizzes || []
      }));

      await saveTrainingJourney({
        journey: {
          title,
          name: title,
          description: (curriculum.description as string) || '',
          industry,
          status: 'active',
          company: companyName || 'Company'
        },
        modules,
        companyId: effectiveCompanyId,
        gigId: gigId || undefined,
        presentationData: presentation
      });
      onSaved();
    } catch (e: any) {
      setError(e?.message || 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  if (!effectiveCompanyId) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8">
        <p className="text-gray-600">Company context missing. Open onboarding from a logged-in company session.</p>
        <button type="button" onClick={onClose} className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold">
          Close
        </button>
      </div>
    );
  }

  if (step === 'setup') {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">New training</h1>
          <button type="button" onClick={onClose} className="text-sm font-semibold text-rose-600 hover:underline">
            Cancel
          </button>
        </div>
        <p className="text-sm text-gray-600">
          Same AI pipeline as before (analyze → curriculum → slides), without loading the full Training app.
        </p>
        <label className="block text-sm font-medium text-gray-700">Company</label>
        <input readOnly className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm" value={companyName} />
        <label className="block text-sm font-medium text-gray-700">Gig (optional for document-only path)</label>
        <select
          className="w-full rounded-xl border border-purple-100 px-3 py-2 text-sm"
          value={gigId}
          onChange={(e) => {
            setGigId(e.target.value);
            const g = gigs.find((x) => String(x._id || x.id) === e.target.value);
            if (g?.title && !trainingTitle) setTrainingTitle(g.title);
          }}
        >
          <option value="">— None (upload a document) —</option>
          {gigs.map((g) => (
            <option key={g._id || g.id} value={g._id || g.id}>
              {g.title}
            </option>
          ))}
        </select>
        <label className="block text-sm font-medium text-gray-700">Training title (optional)</label>
        <input
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
          value={trainingTitle}
          onChange={(e) => setTrainingTitle(e.target.value)}
          placeholder="Defaults to gig title or generated title"
        />
        <button
          type="button"
          onClick={() => setStep('upload')}
          className="rounded-xl bg-gradient-to-r from-rose-500 via-fuchsia-500 to-purple-600 py-3 text-sm font-bold text-white shadow-md"
        >
          Continue
        </button>
      </div>
    );
  }

  if (step === 'upload') {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-6 p-6">
        <button
          type="button"
          onClick={() => setStep('setup')}
          className="flex items-center gap-1 text-sm font-semibold text-fuchsia-700"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <h2 className="text-lg font-bold text-gray-900">Generate content</h2>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="rounded-2xl border-2 border-dashed border-fuchsia-200 bg-fuchsia-50/30 p-6 text-center">
          <Upload className="mx-auto mb-2 h-10 w-10 text-fuchsia-500" />
          <input
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            className="mx-auto block text-sm"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <p className="mt-2 text-xs text-gray-500">PDF, Word, or text</p>
        </div>
        <button
          type="button"
          disabled={loading || !file}
          onClick={runGenerateFromFile}
          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-purple-600 py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Generate from document
        </button>
        {gigId && (
          <>
            <p className="text-center text-xs text-gray-400">or</p>
            <button
              type="button"
              disabled={loading}
              onClick={runGenerateFromGig}
              className="rounded-xl border-2 border-fuchsia-200 py-3 text-sm font-bold text-fuchsia-800 hover:bg-fuchsia-50 disabled:opacity-50"
            >
              {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : 'Generate from gig knowledge base'}
            </button>
          </>
        )}
      </div>
    );
  }

  /* preview */
  const modules = (curriculum?.modules as any[]) || [];

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-gradient-to-b from-slate-50 to-white">
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 lg:grid-cols-[minmax(260px,300px)_minmax(0,1fr)] lg:gap-4 lg:p-4">
        <aside className="flex max-h-[40vh] flex-col overflow-y-auto rounded-2xl border border-rose-100/80 bg-white p-4 shadow-sm lg:max-h-none">
          <p className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-600">Modules</p>
          <h2 className="mt-1 text-base font-bold text-gray-900">
            {trainingTitle.trim() || (curriculum?.title as string) || 'Training'}
          </h2>
          <ol className="mt-3 max-h-48 flex-1 space-y-1 overflow-y-auto border-t border-gray-100 pt-3 lg:max-h-none">
            {modules.length === 0 ? (
              <li className="text-xs text-gray-500">No modules in response</li>
            ) : (
              modules.map((m: any, idx: number) => (
                <li key={idx} className="flex gap-2 text-sm text-gray-800">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-fuchsia-100 text-xs font-bold text-fuchsia-900">
                    {idx + 1}
                  </span>
                  <span className="min-w-0 flex-1 font-medium">{m.title}</span>
                </li>
              ))
            )}
          </ol>
          <div className="mt-4 flex flex-col gap-2 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={loading || !presentation}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 via-fuchsia-500 to-purple-600 px-3 py-2.5 text-xs font-bold text-white shadow-md disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save training
            </button>
            <button
              type="button"
              onClick={handleRegenerateSlides}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              Regenerate slides
            </button>
            <button type="button" onClick={() => setStep('upload')} className="text-center text-xs font-semibold text-gray-500 hover:text-gray-800">
              Back to upload
            </button>
            <button type="button" onClick={onClose} className="text-center text-xs font-semibold text-gray-500 hover:text-gray-800">
              Cancel
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </aside>
        <section className="min-h-[280px] overflow-hidden rounded-2xl border border-rose-100/80 bg-white shadow-sm lg:min-h-0">
          {presentation && (
            <SlideDeckViewer
              presentation={presentation as { slides?: any[]; title?: string }}
              title={(trainingTitle.trim() || (curriculum?.title as string)) as string}
            />
          )}
        </section>
      </div>
    </div>
  );
}
