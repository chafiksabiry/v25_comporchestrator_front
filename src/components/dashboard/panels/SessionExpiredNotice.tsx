import { useTranslation } from 'react-i18next';

/**
 * Affiché par les panneaux société quand aucun identifiant de société n'est disponible
 * (cookie `companyId` absent) : aucun appel API n'est fait, on demande de se reconnecter.
 * Remplace l'ancien repli sur un identifiant de société réel codé en dur.
 */
export function SessionExpiredNotice() {
  const { t } = useTranslation();
  return (
    <div
      role="alert"
      className="mx-auto my-10 max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-sm font-semibold text-amber-800"
    >
      {t('common.sessionExpired', 'Session expired, please sign in again')}
    </div>
  );
}

export default SessionExpiredNotice;
