import React from 'react';

export type ProjectView = 'comporchestrator' | 'dashboard';

export type ProjectViewSwitchProps = {
  /** `comporchestrator` = shell Smart Orchestrator (défaut). */
  activeView: ProjectView;
  /** Contenu du projet Comporchestrator (sidebar + zone principale). */
  comporchestrator: React.ReactNode;
  /** Projet Dashboard HARX (application séparée, plein écran). */
  dashboard: React.ReactNode;
};

/**
 * Bascule entre deux applications montées dans le même bundle :
 * — défaut : Comporchestrator (onboarding, étapes) ;
 * — `dashboard` : application Dashboard (routes, sidebar HARX).
 */
export function ProjectViewSwitch({
  activeView,
  comporchestrator,
  dashboard,
}: ProjectViewSwitchProps) {
  if (activeView === 'dashboard') {
    return <div className="h-screen w-full overflow-hidden">{dashboard}</div>;
  }
  return <>{comporchestrator}</>;
}
