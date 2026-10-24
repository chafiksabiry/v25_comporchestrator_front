import axios from 'axios';

/** Blocks of the dashboard overview ("Vue globale"), in their default order. */
export type DashboardWidgetId =
  | 'kpis'
  | 'voiceAssistant'
  | 'coverage'
  | 'agents'
  | 'resources'
  | 'performance7d';

/** Keep in sync with DASHBOARD_WIDGET_IDS in the company backend. */
export const DASHBOARD_WIDGET_IDS: DashboardWidgetId[] = [
  'kpis',
  'voiceAssistant',
  'coverage',
  'agents',
  'resources',
  'performance7d',
];

export interface DashboardWidgetConfig {
  id: DashboardWidgetId;
  enabled: boolean;
}

export const defaultWidgetConfig = (): DashboardWidgetConfig[] =>
  DASHBOARD_WIDGET_IDS.map((id) => ({ id, enabled: true }));

/** Known ids only, no duplicates; widgets added to the catalogue later are appended enabled. */
export function normalizeWidgetConfig(raw: unknown): DashboardWidgetConfig[] {
  const known = new Set<string>(DASHBOARD_WIDGET_IDS);
  const seen = new Set<string>();
  const out: DashboardWidgetConfig[] = [];
  if (Array.isArray(raw)) {
    for (const w of raw) {
      const id = String((w as any)?.id ?? '');
      if (!known.has(id) || seen.has(id)) continue;
      seen.add(id);
      out.push({ id: id as DashboardWidgetId, enabled: (w as any)?.enabled !== false });
    }
  }
  for (const id of DASHBOARD_WIDGET_IDS) {
    if (!seen.has(id)) out.push({ id, enabled: true });
  }
  return out;
}

const apiBase = () =>
  import.meta.env.VITE_COMPANY_API_URL || 'https://v25searchcompanywizardbackend-recette.up.railway.app/api';

export async function fetchDashboardConfig(
  companyId: string
): Promise<{ widgets: DashboardWidgetConfig[]; configured: boolean }> {
  try {
    const res = await axios.get(`${apiBase()}/companies/${companyId}/dashboard-config`);
    const data = res.data?.data;
    return { widgets: normalizeWidgetConfig(data?.widgets), configured: Boolean(data?.configured) };
  } catch {
    return { widgets: defaultWidgetConfig(), configured: false };
  }
}

export async function saveDashboardConfig(
  companyId: string,
  widgets: DashboardWidgetConfig[]
): Promise<DashboardWidgetConfig[]> {
  const res = await axios.put(`${apiBase()}/companies/${companyId}/dashboard-config`, { widgets });
  return normalizeWidgetConfig(res.data?.data?.widgets);
}

export const DASHBOARD_CONFIG_EVENT = 'dashboardConfigChanged';
