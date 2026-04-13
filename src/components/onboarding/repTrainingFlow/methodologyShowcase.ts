import type { LucideIcon } from 'lucide-react';
import { BookOpen, Shield, Building2, Zap, UserCog, Target } from 'lucide-react';

export type MethodologyPillar = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  iconBg: string;
  border: string;
};

/** 360° methodology pillars (aligned with training platform messaging). */
export const METHODOLOGY_PILLARS: MethodologyPillar[] = [
  {
    id: 'foundational',
    title: 'Foundational knowledge',
    description: 'Core concepts, vocabulary, and principles learners need before going deeper.',
    icon: BookOpen,
    accent: 'text-sky-700',
    iconBg: 'bg-sky-100',
    border: 'border-sky-200/80'
  },
  {
    id: 'compliance',
    title: 'Regulatory compliance',
    description: 'Risk-aware training that reflects rules, disclosures, and ethical guardrails.',
    icon: Shield,
    accent: 'text-rose-700',
    iconBg: 'bg-rose-100',
    border: 'border-rose-200/80'
  },
  {
    id: 'industry',
    title: 'Industry expertise',
    description: 'Domain-specific scenarios, products, and market context for your sector.',
    icon: Building2,
    accent: 'text-violet-700',
    iconBg: 'bg-violet-100',
    border: 'border-violet-200/80'
  },
  {
    id: 'operations',
    title: 'Operational excellence',
    description: 'Workflows, tools, and playbooks that translate learning into day-to-day execution.',
    icon: Zap,
    accent: 'text-amber-700',
    iconBg: 'bg-amber-100',
    border: 'border-amber-200/80'
  },
  {
    id: 'integration',
    title: 'Company integration',
    description: 'On-brand tone, processes, and culture so training feels native to your org.',
    icon: UserCog,
    accent: 'text-emerald-700',
    iconBg: 'bg-emerald-100',
    border: 'border-emerald-200/80'
  },
  {
    id: 'development',
    title: 'Professional development',
    description: 'Skill progression, assessments, and reinforcement for lasting performance.',
    icon: Target,
    accent: 'text-fuchsia-700',
    iconBg: 'bg-fuchsia-100',
    border: 'border-fuchsia-200/80'
  }
];

export const TRAINING_INDUSTRY_OPTIONS: string[] = [
  'Technology',
  'Healthcare',
  'Finance',
  'Retail',
  'Manufacturing',
  'Education',
  'Real Estate',
  'Hospitality',
  'Automotive',
  'Entertainment',
  'Telecoms & Digital Services',
  'Insurance',
  'General'
];
