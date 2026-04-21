import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Loader2,
  RefreshCw,
  Save,
  Upload,
  ArrowLeft,
  Sparkles,
  FileText,
  CheckCircle,
  AlertCircle,
  X,
  Wand2,
  BarChart3,
  Clock
} from 'lucide-react';
import type { Gig } from '../../../types/matching';
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
import { METHODOLOGY_PILLARS, TRAINING_INDUSTRY_OPTIONS } from './methodologyShowcase';

type Step = 'setup' | 'upload' | 'preview';

function uid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function gigKey(g: Gig): string {
  return String(g._id ?? (g as Gig & { id?: string }).id ?? '');
}

function gigIndustryLabel(g: Gig): string {
  const row = g as unknown as Record<string, unknown>;
  if (typeof row.category === 'string' && row.category.trim()) return row.category.trim();
  if (typeof row.industry === 'string' && row.industry.trim()) return row.industry.trim();
  if (Array.isArray(g.industries) && g.industries.length && g.industries[0]) {
    return String(g.industries[0]).trim();
  }
  return 'General';
}

interface RepTrainingJourneyWizardProps {
  companyId: string | null;
  legacyCompanyId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

type DocRow = {
  id: string;
  file: File;
  name: string;
  size: number;
  status: 'queued' | 'analyzing' | 'done' | 'error';
  analysis: Record<string, unknown> | null;
  error?: string;
};

export default function RepTrainingJourneyWizard({
  companyId,
  legacyCompanyId,
  onClose,
  onSaved
}: RepTrainingJourneyWizardProps) {
  const effectiveCompanyId = legacyCompanyId || companyId || getCompanyIdFromCookies() || '';

  const [step, setStep] = useState<Step>('setup');
  const [industry, setIndustry] = useState('General');
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [gigId, setGigId] = useState<string>('');
  const [useKnowledgeBase, setUseKnowledgeBase] = useState(false);
  const [methodologyFocus, setMethodologyFocus] = useState<string[]>([]);

  const [documents, setDocuments] = useState<DocRow[]>([]);
  const [dragOver, setDragOver] = useState(false);

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
      if (profile?.industry) setIndustry(String(profile.industry));
    })();
  }, [effectiveCompanyId]);

  useEffect(() => {
    loadGigs();
  }, [loadGigs]);

  const industryOptions = useMemo(() => {
    const fromGigs = gigs.map(gigIndustryLabel).filter(Boolean);
    const merged = [...new Set([...TRAINING_INDUSTRY_OPTIONS, ...fromGigs, industry])].filter(Boolean);
    return merged.sort((a, b) => a.localeCompare(b));
  }, [gigs, industry]);

  const filteredGigs = useMemo(() => {
    const t = industry.trim().toLowerCase();
    if (!t || t === 'general') return gigs;
    return gigs.filter(
      (g) =>
        gigIndustryLabel(g).toLowerCase() === t ||
        (g.industries || []).some((i) => String(i).toLowerCase() === t)
    );
  }, [gigs, industry]);

  const selectedGig = useMemo(() => gigs.find((g) => gigKey(g) === gigId), [gigs, gigId]);

  const toggleMethodology = (id: string) => {
    setMethodologyFocus((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return [...prev.slice(1), id];
      return [...prev, id];
    });
  };

  const analyzeOneRow = useCallback(async (row: DocRow, currentGigId: string, currentCompanyId: string) => {
    setDocuments((prev) =>
      prev.map((d) => (d.id === row.id ? { ...d, status: 'analyzing', error: undefined } : d))
    );
    try {
      const a = await analyzeDocument(row.file, {
        companyId: currentCompanyId,
        gigId: currentGigId || undefined
      });
      setDocuments((prev) =>
        prev.map((d) => (d.id === row.id ? { ...d, status: 'done', analysis: a } : d))
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Analysis failed';
      setDocuments((prev) =>
        prev.map((d) => (d.id === row.id ? { ...d, status: 'error', error: msg } : d))
      );
    }
  }, []);

  const enqueueFiles = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      const rows: DocRow[] = files.map((file) => ({
        id: uid(),
        file,
        name: file.name,
        size: file.size,
        status: 'queued',
        analysis: null
      }));
      setDocuments((prev) => [...prev, ...rows]);
      for (const row of rows) {
        await analyzeOneRow(row, gigId, effectiveCompanyId);
      }
    },
    [analyzeOneRow, effectiveCompanyId, gigId]
  );

  const removeDocument = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const retryDocument = (row: DocRow) => {
    analyzeOneRow(row, gigId, effectiveCompanyId);
  };

  const buildMergedAnalysis = (rows: DocRow[]): Record<string, unknown> => {
    const done = rows.filter((r) => r.status === 'done' && r.analysis);
    if (done.length === 1) {
      return { ...done[0].analysis! };
    }
    return {
      multiDocument: true,
      documentCount: done.length,
      perDocument: done.map((r, i) => ({
        index: i + 1,
        fileName: r.name,
        keyTopics: r.analysis!.keyTopics,
        learningObjectives: r.analysis!.learningObjectives,
        prerequisites: r.analysis!.prerequisites,
        suggestedModules: r.analysis!.suggestedModules,
        summary: r.analysis!.summary || r.analysis!.description
      }))
    };
  };

  const runGenerateFromDocuments = async () => {
    const ready = documents.filter((d) => d.status === 'done' && d.analysis);
    if (!ready.length) {
      setError('Add at least one document and wait for analysis to finish.');
      return;
    }
    if (useKnowledgeBase && !gigId) {
      setError('Select a gig to include the knowledge base, or turn off the knowledge base option.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const merged = buildMergedAnalysis(documents);
      const uploadContext = ready.map((d) => ({
        fileName: d.name,
        fileType: d.file.type || 'document',
        keyTopics: (d.analysis!.keyTopics as string[]) || [],
        learningObjectives: (d.analysis!.learningObjectives as string[]) || []
      }));
      const cur = await generateCurriculum(merged, industry, gigId || undefined, uploadContext, {
        useKnowledgeBase,
        gigId: gigId || undefined
      });
      setCurriculum(cur);

      let pres =
        normalizePresentationFromApi((cur as any).data?.presentation) || (cur as any).data?.presentation || null;
      if (!pres?.slides?.length) {
        pres = normalizePresentationFromApi(await generatePresentation(cur)) || pres;
      }
      setPresentation(pres);
      setStep('preview');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Generation failed');
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
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Gig generation failed');
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
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Regenerate failed');
    } finally {
      setLoading(false);
    }
  };

  const displayTitle =
    (curriculum?.title as string) || (presentation?.title as string) || selectedGig?.title || 'Training';

  const handleSave = async () => {
    if (!curriculum || !presentation) return;
    setLoading(true);
    setError(null);
    try {
      const title =
        (curriculum.title as string) ||
        (presentation.title as string) ||
        selectedGig?.title ||
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

      const focusLabels = methodologyFocus
        .map((id) => METHODOLOGY_PILLARS.find((p) => p.id === id)?.title)
        .filter(Boolean);
      const descParts = [(curriculum.description as string) || ''];
      if (focusLabels.length) {
        descParts.push(`Methodology emphasis: ${focusLabels.join(', ')}.`);
      }
      const description = descParts.filter(Boolean).join('\n\n');

      await saveTrainingJourney({
        journey: {
          title,
          name: title,
          description,
          industry,
          status: 'active',
          company: 'Organization'
        },
        modules,
        companyId: effectiveCompanyId,
        gigId: gigId || undefined,
        presentationData: presentation
      });
      onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  const shellClass =
    'min-h-full w-full bg-gradient-to-br from-slate-100 via-sky-50/40 to-indigo-100/50 font-sans text-slate-900 antialiased';

  if (!effectiveCompanyId) {
    return (
      <div className={`${shellClass} flex flex-col items-center justify-center gap-4 p-8`}>
        <p className="max-w-md text-center text-slate-600">
          Company context missing. Open onboarding from a logged-in company session.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
        >
          Close
        </button>
      </div>
    );
  }

  if (step === 'setup') {
    return (
      <div className={shellClass}>
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">Training studio</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">New training</h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
                Configure industry and gig context, then upload materials. Each file is analyzed before generation.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 text-sm font-semibold text-rose-600 hover:text-rose-700"
            >
              Cancel
            </button>
          </div>

          <div className="space-y-10 rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-[0_8px_30px_rgb(15,23,42,0.06)] backdrop-blur-sm sm:p-8">
            <div>
              <label className="block text-sm font-semibold text-slate-800">Industry</label>
              <p className="mt-1 text-xs text-slate-500">Used to tailor the curriculum and to filter gigs below.</p>
              <select
                className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm outline-none ring-sky-500/30 focus:border-sky-400 focus:ring-2"
                value={industry}
                onChange={(e) => {
                  setIndustry(e.target.value);
                  setGigId('');
                }}
              >
                {industryOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <h2 className="text-center text-lg font-bold text-slate-900">Our 360° methodology includes</h2>
              <p className="mx-auto mt-2 max-w-2xl text-center text-xs text-slate-500 sm:text-sm">
                Optional: pick up to three pillars to emphasize in the saved program description.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {METHODOLOGY_PILLARS.map((p) => {
                  const Icon = p.icon;
                  const on = methodologyFocus.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleMethodology(p.id)}
                      className={`flex flex-col rounded-xl border p-4 text-left transition-all ${
                        on
                          ? 'border-sky-400 bg-sky-50/80 shadow-md ring-2 ring-sky-200'
                          : `border-slate-200/90 bg-white hover:border-slate-300 ${p.border}`
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${p.iconBg}`}>
                          <Icon className={`h-5 w-5 ${p.accent}`} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900">{p.title}</p>
                          <p className="mt-1 text-xs leading-relaxed text-slate-600">{p.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800">Select a gig</label>
              <select
                className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm outline-none ring-sky-500/30 focus:border-sky-400 focus:ring-2"
                value={gigId}
                onChange={(e) => setGigId(e.target.value)}
              >
                <option value="">— No gig (documents only) —</option>
                {filteredGigs.map((g) => (
                  <option key={gigKey(g)} value={gigKey(g)}>
                    {g.title}
                  </option>
                ))}
              </select>
              {filteredGigs.length === 0 && gigs.length > 0 && (
                <p className="mt-2 text-xs text-amber-700">No gigs match this industry. Try another industry.</p>
              )}
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                checked={useKnowledgeBase}
                onChange={(e) => setUseKnowledgeBase(e.target.checked)}
                disabled={!gigId}
              />
              <span>
                <span className="block text-sm font-semibold text-slate-900">Include gig knowledge base</span>
                <span className="mt-0.5 block text-xs text-slate-600">
                  When generating from your documents, merge indexed documents linked to this gig into the AI context.
                  Select a gig first.
                </span>
              </span>
            </label>

            <button
              type="button"
              onClick={() => setStep('upload')}
              className="w-full rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-sky-500/25 transition hover:from-sky-700 hover:to-indigo-700"
            >
              Continue to materials
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'upload') {
    const analyzed = documents.filter((d) => d.status === 'done').length;
    const anyAnalyzing = documents.some((d) => d.status === 'analyzing' || d.status === 'queued');
    const canGenerateDocs = documents.length > 0 && analyzed === documents.length && !anyAnalyzing;
    const progress = documents.length > 0 ? Math.round((analyzed / documents.length) * 100) : 0;
    const withErrors = documents.filter((d) => d.status === 'error').length;

    return (
      <div className={`${shellClass} relative overflow-hidden`}>
        <div className="pointer-events-none absolute -left-24 top-28 h-64 w-64 rounded-full bg-fuchsia-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-16 h-72 w-72 rounded-full bg-sky-300/25 blur-3xl" />
        <div className="pointer-events-none absolute bottom-10 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-indigo-300/20 blur-3xl" />

        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          <button
            type="button"
            onClick={() => setStep('setup')}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur transition hover:border-slate-300 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <div className="mb-8 rounded-3xl border border-white/70 bg-white/75 p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-fuchsia-600">Step 2 · Content Lab</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                  Upload your content
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                  Drop your files, let AI analyze them, then generate the training and slides.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2">
                  <p className="text-lg font-black text-sky-700">{documents.length}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-700/80">Files</p>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                  <p className="text-lg font-black text-emerald-700">{analyzed}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700/80">Analyzed</p>
                </div>
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2">
                  <p className="text-lg font-black text-rose-700">{withErrors}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-700/80">Errors</p>
                </div>
              </div>
            </div>
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-600">
                <span>Analysis progress</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 via-fuchsia-500 to-indigo-500 transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-800 shadow-sm">
              {error}
            </div>
          )}

          <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:p-8">
            <div
              className={`rounded-3xl border-2 border-dashed p-10 text-center transition-all duration-300 ${
                dragOver
                  ? 'scale-[1.01] border-fuchsia-500 bg-fuchsia-50 shadow-inner'
                  : 'border-slate-300 bg-gradient-to-br from-slate-50 to-sky-50/60 hover:border-fuchsia-400 hover:shadow-lg'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setDragOver(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files?.length) void enqueueFiles(Array.from(e.dataTransfer.files));
              }}
            >
              <div className="mb-4 flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 animate-pulse rounded-full bg-fuchsia-200/70 blur-xl" />
                  <div className="relative rounded-2xl border border-white/70 bg-white/90 p-4 shadow-md">
                    <Upload className="h-10 w-10 text-fuchsia-600" />
                  </div>
                </div>
              </div>
              <h3 className="text-2xl font-black tracking-tight text-slate-900">Drag & drop files here</h3>
              <p className="mt-2 text-sm text-slate-600">or click below to browse from your computer</p>
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt"
                className="hidden"
                id="rep-training-files"
                onChange={(e) => {
                  if (e.target.files?.length) void enqueueFiles(Array.from(e.target.files));
                  e.target.value = '';
                }}
              />
              <label
                htmlFor="rep-training-files"
                className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-purple-500/25 transition hover:translate-y-[-1px] hover:shadow-xl"
              >
                <Upload className="h-4 w-4" />
                Browse files
              </label>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {['PDF', 'Word', 'Text', 'AI Ready'].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-fuchsia-200 bg-fuchsia-50 px-3 py-1 text-xs font-semibold text-fuchsia-800"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {documents.length > 0 && (
            <div className="mt-8 rounded-3xl border border-white/70 bg-white/85 p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:p-8">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-xl font-black tracking-tight text-slate-900">Uploaded documents</h3>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                    {documents.length} total
                  </span>
                  {analyzed > 0 && (
                    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                      <CheckCircle className="h-4 w-4" />
                      {analyzed} analyzed
                    </span>
                  )}
                </div>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className={`rounded-2xl border p-5 transition-all ${
                      doc.status === 'done'
                        ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white shadow-sm'
                        : doc.status === 'error'
                          ? 'border-red-200 bg-gradient-to-br from-red-50 to-white shadow-sm'
                          : doc.status === 'analyzing' || doc.status === 'queued'
                            ? 'border-sky-200 bg-gradient-to-br from-sky-50 to-white shadow-sm'
                            : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 gap-3">
                        <FileText className="h-8 w-8 shrink-0 text-fuchsia-600" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900">{doc.name}</p>
                          <p className="text-xs text-slate-500">{(doc.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {doc.status === 'done' && <CheckCircle className="h-5 w-5 text-emerald-600" />}
                        {doc.status === 'error' && <AlertCircle className="h-5 w-5 text-red-600" />}
                        {(doc.status === 'analyzing' || doc.status === 'queued') && (
                          <Wand2 className="h-5 w-5 animate-spin text-sky-600" />
                        )}
                        <button
                          type="button"
                          onClick={() => removeDocument(doc.id)}
                          className="rounded-full p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                          aria-label="Remove file"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {doc.status === 'error' && doc.error && (
                      <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                        {doc.error}
                        <button
                          type="button"
                          onClick={() => retryDocument(doc)}
                          className="mt-2 block font-semibold text-red-700 underline"
                        >
                          Try again
                        </button>
                      </div>
                    )}

                    {(doc.status === 'analyzing' || doc.status === 'queued') && (
                      <div className="mt-4 flex items-center gap-3 rounded-xl border border-sky-200 bg-white p-3">
                        <Wand2 className="h-5 w-5 animate-spin text-sky-600" />
                        <div className="text-xs text-sky-900">
                          <p className="font-semibold">AI is analyzing this file...</p>
                          <p className="text-sky-700">Extracting topics, objectives, and module ideas.</p>
                        </div>
                      </div>
                    )}

                    {doc.status === 'done' && doc.analysis && (
                      <div className="mt-4 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-xl border border-emerald-200 bg-white p-3 text-center">
                            <BarChart3 className="mx-auto mb-1 h-5 w-5 text-emerald-600" />
                            <div className="text-lg font-black text-emerald-700">
                              {typeof doc.analysis.difficulty === 'number' ? doc.analysis.difficulty : '—'}
                              {typeof doc.analysis.difficulty === 'number' ? '/10' : ''}
                            </div>
                            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                              Difficulty
                            </div>
                          </div>
                          <div className="rounded-xl border border-emerald-200 bg-white p-3 text-center">
                            <Clock className="mx-auto mb-1 h-5 w-5 text-emerald-600" />
                            <div className="text-lg font-black text-emerald-700">
                              {typeof doc.analysis.estimatedReadTime === 'number'
                                ? `${doc.analysis.estimatedReadTime}m`
                                : '—'}
                            </div>
                            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                              Est. read
                            </div>
                          </div>
                        </div>
                        {Array.isArray(doc.analysis.keyTopics) && doc.analysis.keyTopics.length > 0 && (
                          <div>
                            <p className="text-xs font-bold text-slate-800">Key topics</p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {(doc.analysis.keyTopics as string[]).map((topic, i) => (
                                <span
                                  key={i}
                                  className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-900"
                                >
                                  {topic}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {Array.isArray(doc.analysis.learningObjectives) &&
                          doc.analysis.learningObjectives.length > 0 && (
                            <div>
                              <p className="text-xs font-bold text-slate-800">Learning objectives</p>
                              <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-slate-700">
                                {(doc.analysis.learningObjectives as string[]).slice(0, 8).map((o, i) => (
                                  <li key={i}>{o}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        {Array.isArray(doc.analysis.suggestedModules) &&
                          doc.analysis.suggestedModules.length > 0 && (
                            <div>
                              <p className="text-xs font-bold text-slate-800">Suggested modules</p>
                              <p className="mt-1 text-xs text-slate-600">
                                {(doc.analysis.suggestedModules as string[]).join(' -> ')}
                              </p>
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 rounded-3xl border border-white/70 bg-white/85 p-4 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
              <button
                type="button"
                disabled={loading || !canGenerateDocs}
                onClick={runGenerateFromDocuments}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 py-3.5 text-sm font-black text-white shadow-lg shadow-purple-500/25 transition hover:translate-y-[-1px] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:min-w-[250px]"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Generate from documents
              </button>
              {gigId && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={runGenerateFromGig}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white py-3.5 text-sm font-bold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50 sm:flex-none sm:min-w-[250px]"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Generate from gig only
                </button>
              )}
            </div>
            <p className="mt-3 text-center text-xs text-slate-500">
              Knowledge-base merge applies when enabled in step 1.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* preview */
  const modules = (curriculum?.modules as any[]) || [];

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-gradient-to-br from-slate-100 via-sky-50/30 to-indigo-50/40 font-sans">
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 lg:grid-cols-[minmax(260px,300px)_minmax(0,1fr)] lg:gap-4 lg:p-4">
        <aside className="flex max-h-[40vh] flex-col overflow-y-auto rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-sm lg:max-h-none">
          <p className="text-[10px] font-bold uppercase tracking-widest text-sky-600">Modules</p>
          <h2 className="mt-1 text-base font-bold text-slate-900">{displayTitle}</h2>
          <ol className="mt-3 max-h-48 flex-1 space-y-1 overflow-y-auto border-t border-slate-100 pt-3 lg:max-h-none">
            {modules.length === 0 ? (
              <li className="text-xs text-slate-500">No modules in response</li>
            ) : (
              modules.map((m: any, idx: number) => (
                <li key={idx} className="flex gap-2 text-sm text-slate-800">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-xs font-bold text-sky-900">
                    {idx + 1}
                  </span>
                  <span className="min-w-0 flex-1 font-medium">{m.title}</span>
                </li>
              ))
            )}
          </ol>
          <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={loading || !presentation}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-3 py-2.5 text-xs font-bold text-white shadow-md disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save training
            </button>
            <button
              type="button"
              onClick={handleRegenerateSlides}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              Regenerate slides
            </button>
            <button
              type="button"
              onClick={() => setStep('upload')}
              className="text-center text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Back to materials
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-center text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Cancel
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </aside>
        <section className="min-h-[280px] overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm lg:min-h-0">
          {presentation && (
            <SlideDeckViewer
              presentation={presentation as { slides?: any[]; title?: string }}
              title={displayTitle}
            />
          )}
        </section>
      </div>
    </div>
  );
}
