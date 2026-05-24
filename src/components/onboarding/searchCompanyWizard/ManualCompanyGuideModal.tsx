import React from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  CheckCircle2,
  Image as ImageIcon,
  Info,
  PenLine,
  ShieldCheck,
  Sparkles,
  Target,
  X,
} from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ManualCompanyGuideModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const sections = [
    {
      icon: Building2,
      gradient: "from-rose-500 to-fuchsia-500",
      title: t(
        "searchCompanyWizard.manual.guide.basics.title",
        "Start with the essentials"
      ),
      description: t(
        "searchCompanyWizard.manual.guide.basics.desc",
        "Name, industry, founding year and headquarters help position you for the right reps and gigs."
      ),
    },
    {
      icon: ImageIcon,
      gradient: "from-blue-500 to-violet-500",
      title: t(
        "searchCompanyWizard.manual.guide.logo.title",
        "Upload a clean logo"
      ),
      description: t(
        "searchCompanyWizard.manual.guide.logo.desc",
        "PNG or SVG (max 5 MB). Used on the dashboard, scripts and rep-facing screens."
      ),
    },
    {
      icon: Target,
      gradient: "from-amber-500 to-rose-500",
      title: t(
        "searchCompanyWizard.manual.guide.story.title",
        "Tell your story"
      ),
      description: t(
        "searchCompanyWizard.manual.guide.story.desc",
        "A short overview + clear mission give the AI context to draft accurate gigs and scripts."
      ),
    },
    {
      icon: ShieldCheck,
      gradient: "from-emerald-500 to-cyan-500",
      title: t(
        "searchCompanyWizard.manual.guide.contact.title",
        "Add reachable contacts"
      ),
      description: t(
        "searchCompanyWizard.manual.guide.contact.desc",
        "Pro email, phone and social links are reused for sales pages and lead routing."
      ),
    },
  ] as const;

  const tips = [
    t(
      "searchCompanyWizard.manual.guide.tips.0",
      "Only name and overview are required — the rest can be added later."
    ),
    t(
      "searchCompanyWizard.manual.guide.tips.1",
      "You can refine the profile anytime from the company dashboard."
    ),
    t(
      "searchCompanyWizard.manual.guide.tips.2",
      "Have a website? Use the URL mode in the previous screen — it auto-fills most fields."
    ),
  ];

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
      >
        <motion.div
          className="absolute inset-0 bg-black/60"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 8 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl bg-white shadow-2xl ring-1 ring-black/5 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Compact gradient header */}
          <div className="relative shrink-0 px-6 py-5 bg-gradient-to-r from-[#ff4d4d] via-[#ec4899] to-[#c026d3]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.15),transparent_60%)]" />

            <button
              type="button"
              onClick={onClose}
              aria-label={t("searchCompanyWizard.manual.guide.close", "Close")}
              className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative z-[1] flex items-center gap-3">
              <motion.div
                animate={{ y: [0, -3, 0] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20"
              >
                <PenLine className="h-6 w-6 text-white" />
              </motion.div>
              <div className="min-w-0">
                <span className="inline-block rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white">
                  {t("searchCompanyWizard.manual.guide.badge", "Manual creation")}
                </span>
                <h2 className="mt-1 text-lg sm:text-xl font-black text-white tracking-tight leading-tight">
                  {t(
                    "searchCompanyWizard.manual.guide.title",
                    "Build your profile manually"
                  )}
                </h2>
              </div>
            </div>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <p className="text-sm text-slate-600 leading-relaxed">
              {t(
                "searchCompanyWizard.manual.guide.intro",
                "Use this mode when you don't have a website yet, or when search/scraping miss your company. Fill what you know — polish the rest later."
              )}
            </p>

            <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
              {sections.map(({ icon: Icon, gradient, title, description }) => (
                <div
                  key={title}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60 p-3"
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${gradient} text-white shadow-sm`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-black text-slate-900 leading-snug">
                        {title}
                      </h3>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                        {description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Info className="h-3.5 w-3.5 text-amber-600" />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-700">
                  {t("searchCompanyWizard.manual.guide.tipsTitle", "Pro tips")}
                </h4>
              </div>
              <ul className="space-y-1">
                {tips.map((tip) => (
                  <li
                    key={tip}
                    className="flex items-start gap-1.5 text-[11px] text-slate-700 leading-relaxed"
                  >
                    <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600 mt-0.5" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Sticky footer */}
          <div className="shrink-0 border-t border-slate-100 bg-white px-6 py-3.5">
            <button
              type="button"
              onClick={onClose}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#ff4d4d] to-[#ec4899] px-6 py-2.5 text-sm font-black uppercase tracking-wider text-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.99]"
            >
              <Sparkles className="h-4 w-4" />
              {t("searchCompanyWizard.manual.guide.cta", "Got it, let's start")}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ManualCompanyGuideModal;
