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
} from "lucide-react";
import {
  GuideBadge,
  GuideHero,
  GuideIconOrb,
  GuideModalLayout,
  GuidePrimaryButton,
} from "../GuideModalLayout";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ManualCompanyGuideModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();

  const sections = [
    {
      icon: Building2,
      gradient: "from-rose-500 via-pink-500 to-fuchsia-500",
      title: t(
        "searchCompanyWizard.manual.guide.basics.title",
        "Start with the essentials"
      ),
      description: t(
        "searchCompanyWizard.manual.guide.basics.desc",
        "Company name, industry, founding year and headquarters help us position you correctly when matching reps and gigs."
      ),
    },
    {
      icon: ImageIcon,
      gradient: "from-blue-500 via-indigo-500 to-violet-500",
      title: t(
        "searchCompanyWizard.manual.guide.logo.title",
        "Upload a clean logo"
      ),
      description: t(
        "searchCompanyWizard.manual.guide.logo.desc",
        "Drop a transparent PNG or SVG (max 5 MB). Your logo appears on the dashboard, scripts, and rep-facing screens."
      ),
    },
    {
      icon: Target,
      gradient: "from-amber-500 via-orange-500 to-rose-500",
      title: t(
        "searchCompanyWizard.manual.guide.story.title",
        "Tell your story"
      ),
      description: t(
        "searchCompanyWizard.manual.guide.story.desc",
        "A short overview and a clear mission give the AI enough context to draft accurate gigs, scripts and rep onboarding kits."
      ),
    },
    {
      icon: ShieldCheck,
      gradient: "from-emerald-500 via-teal-500 to-cyan-500",
      title: t(
        "searchCompanyWizard.manual.guide.contact.title",
        "Add reachable contacts"
      ),
      description: t(
        "searchCompanyWizard.manual.guide.contact.desc",
        "Pro email, phone and social links are reused later for sales pages, lead routing and trust signals."
      ),
    },
  ] as const;

  const tips = [
    t(
      "searchCompanyWizard.manual.guide.tips.0",
      "Only Company name and Overview are required — everything else can be added later."
    ),
    t(
      "searchCompanyWizard.manual.guide.tips.1",
      "You can come back at any time to refine the profile from the company dashboard."
    ),
    t(
      "searchCompanyWizard.manual.guide.tips.2",
      "If you have a website, prefer the URL mode in the previous screen — it auto-fills most fields for you."
    ),
  ];

  return (
    <GuideModalLayout
      isOpen={isOpen}
      onBackdropClick={onClose}
      onClose={onClose}
      closeLabel={t("searchCompanyWizard.manual.guide.close", "Close")}
      maxWidth="lg"
      footer={
        <GuidePrimaryButton onClick={onClose}>
          <Sparkles className="h-4 w-4" />
          {t("searchCompanyWizard.manual.guide.cta", "Got it, let's fill the form")}
        </GuidePrimaryButton>
      }
    >
      <AnimatePresence mode="wait">
        <motion.div
          key="manual-guide"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <GuideHero gradientClass="from-[#ff4d4d] via-[#ec4899] to-[#c026d3]">
            <GuideIconOrb>
              <PenLine className="h-9 w-9 text-white drop-shadow-md" />
            </GuideIconOrb>
          </GuideHero>

          <div className="px-6 sm:px-8 pt-6 pb-2">
            <div className="mb-3 flex justify-center sm:justify-start">
              <GuideBadge>
                {t(
                  "searchCompanyWizard.manual.guide.badge",
                  "Manual creation"
                )}
              </GuideBadge>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
              {t(
                "searchCompanyWizard.manual.guide.title",
                "Build your company profile manually"
              )}
            </h2>
            <p className="mt-3 text-sm sm:text-base text-gray-400 leading-relaxed">
              {t(
                "searchCompanyWizard.manual.guide.intro",
                "Use this mode when you don't have a website yet, or when search and scraping miss your company. Fill in what you know — you can polish the rest later."
              )}
            </p>
          </div>

          <div className="px-6 sm:px-8 mt-6 grid gap-3 sm:grid-cols-2">
            {sections.map(({ icon: Icon, gradient, title, description }) => (
              <motion.div
                key={title}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm"
              >
                <div
                  className={`absolute -top-12 -right-12 h-28 w-28 rounded-full bg-gradient-to-br ${gradient} opacity-20 blur-2xl transition-opacity group-hover:opacity-35`}
                />
                <div className="relative flex items-start gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-white leading-tight">
                      {title}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-gray-400">
                      {description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="px-6 sm:px-8 mt-6 mb-6">
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Info className="h-4 w-4 text-amber-400" />
                <h4 className="text-[11px] font-black uppercase tracking-widest text-amber-300">
                  {t("searchCompanyWizard.manual.guide.tipsTitle", "Pro tips")}
                </h4>
              </div>
              <ul className="space-y-1.5">
                {tips.map((tip) => (
                  <li
                    key={tip}
                    className="flex items-start gap-2 text-xs text-gray-300 leading-relaxed"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400 mt-0.5" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </GuideModalLayout>
  );
};

export default ManualCompanyGuideModal;
