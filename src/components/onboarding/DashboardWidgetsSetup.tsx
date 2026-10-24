import React, { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp, CheckCircle, LayoutDashboard, Loader2, RotateCcw } from 'lucide-react';
import {
  DASHBOARD_CONFIG_EVENT,
  DashboardWidgetConfig,
  defaultWidgetConfig,
  fetchDashboardConfig,
  saveDashboardConfig,
} from '../dashboard/widgets/catalog';

const DashboardWidgetsSetup: React.FC<{ companyId?: string | null }> = ({ companyId: propCompanyId }) => {
  const { t } = useTranslation();
  const companyId = propCompanyId || Cookies.get('companyId') || '';
  const [widgets, setWidgets] = useState<DashboardWidgetConfig[]>(defaultWidgetConfig());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!companyId) {
      setLoading(false);
      return;
    }
    void fetchDashboardConfig(companyId).then((cfg) => {
      if (cancelled) return;
      setWidgets(cfg.widgets);
      setSaved(cfg.configured);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('stepGuideUpdate', {
        detail: {
          title: t('sidebar.nextAction.6.title', 'Personnalisez votre tableau de bord'),
          description: t('sidebar.nextAction.6.description', 'Choisissez les widgets à afficher et leur ordre. Cette étape est facultative.'),
          steps: t('sidebar.nextAction.6.steps', {
            returnObjects: true,
            defaultValue: ['Activez ou masquez chaque widget.', "Changez l'ordre avec les flèches.", 'Cliquez sur « Enregistrer ».'],
          }),
        },
      })
    );
  }, [t]);

  const change = (next: DashboardWidgetConfig[]) => {
    setWidgets(next);
    setDirty(true);
    setSaved(false);
  };

  const toggle = (index: number) =>
    change(widgets.map((w, i) => (i === index ? { ...w, enabled: !w.enabled } : w)));

  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= widgets.length) return;
    const next = [...widgets];
    [next[index], next[target]] = [next[target], next[index]];
    change(next);
  };

  const handleSave = async () => {
    if (!companyId) return;
    setSaving(true);
    setError(null);
    try {
      const stored = await saveDashboardConfig(companyId, widgets);
      setWidgets(stored);
      setSaved(true);
      setDirty(false);
      window.dispatchEvent(new CustomEvent(DASHBOARD_CONFIG_EVENT, { detail: { configured: true } }));
    } catch {
      setError(t('dashboardWidgets.saveError', "L'enregistrement a échoué. Réessayez."));
    } finally {
      setSaving(false);
    }
  };

  const enabledCount = widgets.filter((w) => w.enabled).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
      <header className="space-y-2">
        <h1 className="flex items-center gap-3 text-2xl font-black text-gray-900">
          <LayoutDashboard className="h-7 w-7 text-harx-600" />
          {t('dashboardWidgets.title', 'Votre tableau de bord')}
        </h1>
        <p className="text-sm text-gray-600">
          {t(
            'dashboardWidgets.intro',
            "Choisissez les widgets affichés sur le tableau de bord de votre entreprise et leur ordre. Cette configuration est propre à votre entreprise et modifiable à tout moment. Cette étape est facultative."
          )}
        </p>
      </header>

      <ul className="space-y-3">
        {widgets.map((widget, index) => (
          <li
            key={widget.id}
            className={`flex items-center gap-4 rounded-2xl border-2 bg-white p-4 transition-colors ${
              widget.enabled ? 'border-harx-200' : 'border-gray-100 opacity-70'
            }`}
          >
            <button
              type="button"
              role="switch"
              aria-checked={widget.enabled}
              aria-label={t(`dashboardWidgets.items.${widget.id}.title`)}
              onClick={() => toggle(index)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${widget.enabled ? 'bg-harx-600' : 'bg-gray-300'}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${widget.enabled ? 'left-[22px]' : 'left-0.5'}`}
              />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-gray-900">{t(`dashboardWidgets.items.${widget.id}.title`)}</p>
              <p className="text-xs text-gray-500">{t(`dashboardWidgets.items.${widget.id}.description`)}</p>
            </div>
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                aria-label={t('dashboardWidgets.moveUp', 'Monter')}
                className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === widgets.length - 1}
                aria-label={t('dashboardWidgets.moveDown', 'Descendre')}
                className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || !dirty}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-harx px-6 py-3 text-sm font-bold text-white shadow-lg shadow-harx-500/20 transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {t('dashboardWidgets.save', 'Enregistrer')}
        </button>
        <button
          type="button"
          onClick={() => change(defaultWidgetConfig())}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          <RotateCcw className="h-4 w-4" />
          {t('dashboardWidgets.reset', 'Réinitialiser')}
        </button>
        <span className="text-xs text-gray-500">
          {t('dashboardWidgets.count', '{{count}} widget(s) affiché(s) sur {{total}}', { count: enabledCount, total: widgets.length })}
        </span>
        {saved && !dirty && (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-green-700">
            <CheckCircle className="h-4 w-4" />
            {t('dashboardWidgets.saved', 'Configuration enregistrée')}
          </span>
        )}
      </div>
    </div>
  );
};

export default DashboardWidgetsSetup;
