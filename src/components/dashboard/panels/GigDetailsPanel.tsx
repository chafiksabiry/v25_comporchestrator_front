import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Skeleton } from '../components/common/Skeleton';
import { GigReview } from '../../gigsaicreation/components/GigReview';
import Swal from 'sweetalert2';

const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
] as const;

function GigDetailsPanel() {
  const { gigId } = useParams<{ gigId: string }>();
  const navigate = useNavigate();
  const [gig, setGig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGigDetails = useCallback(async () => {
      if (!gigId) {
        setError('No gig ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(`${import.meta.env.VITE_GIGS_API}/gigs/${gigId}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch gig details: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        

        if (data.message === "Gig retrieved successfully" && data.data) {
          const rawGig = data.data;

          // Map populated API data back into the flat GigData structure expected by GigReview
          const mappedGig = {
            ...rawGig,
            destination_zone: rawGig.destination_zone?._id || rawGig.destination_zone?.cca2 || rawGig.destination_zone,
            commission: {
              ...rawGig.commission,
              currency: rawGig.commission?.currency?._id || rawGig.commission?.currency
            },
            skills: {
              ...rawGig.skills,
              professional: rawGig.skills?.professional?.map((s: any) => ({
                skill: s.skill?._id || s.skill,
                level: s.level || 50
              })) || [],
              technical: rawGig.skills?.technical?.map((s: any) => ({
                skill: s.skill?._id || s.skill,
                level: s.level || 50
              })) || [],
              soft: rawGig.skills?.soft?.map((s: any) => ({
                skill: s.skill?._id || s.skill,
                level: s.level || 50
              })) || [],
              languages: rawGig.skills?.languages?.map((l: any) => ({
                language: l.language?._id || l.language,
                proficiency: l.proficiency || 'Intermediate',
                iso639_1: l.language?.iso639_1 || 'en'
              })) || []
            },
            industries: rawGig.industries?.map((i: any) => i._id || i) || [],
            activities: rawGig.activities?.map((a: any) => a._id || a) || [],
            schedule: {
               ...rawGig.schedule,
               schedules: rawGig.availability?.schedule?.map((s: any) => ({
                  day: s.day,
                  hours: s.hours
               })) || []
            }
          };

          setGig(mappedGig);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (error) {
        console.error('Error fetching gig details:', error);
        setError('Failed to load gig details');
      } finally {
        setLoading(false);
      }
  }, [gigId]);

  useEffect(() => {
    fetchGigDetails();
  }, [fetchGigDetails]);

  const handleBack = () => {
    navigate('/dashboard/gigs');
  };

  // PATCH the gig and refresh the local data.
  const patchGig = useCallback(async (patch: Record<string, any>) => {
    if (!gigId) return false;
    try {
      const res = await fetch(`${import.meta.env.VITE_GIGS_API}/gigs/${gigId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch)
      });
      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        throw new Error(`PUT failed: ${res.status} ${errBody}`);
      }
      await fetchGigDetails();
      return true;
    } catch (err) {
      console.error('Failed to update gig:', err);
      Swal.fire({ icon: 'error', title: 'Échec de la mise à jour', text: 'Impossible de sauvegarder les modifications.' });
      return false;
    }
  }, [gigId, fetchGigDetails]);

  const handleEditSection = useCallback(async (section: string) => {
    if (!gig) return;

    switch (section) {
      case 'header': {
        const { value: formValues, isConfirmed } = await Swal.fire({
          title: 'Modifier Titre & Catégorie',
          html:
            `<input id="swal-title" class="swal2-input" placeholder="Titre du gig" value="${escapeHtml(gig.title || '')}" />` +
            `<input id="swal-category" class="swal2-input" placeholder="Catégorie (ex: OUTBOUND SALES)" value="${escapeHtml(gig.category || '')}" />`,
          focusConfirm: false,
          showCancelButton: true,
          confirmButtonText: 'Sauvegarder',
          cancelButtonText: 'Annuler',
          preConfirm: () => ({
            title: (document.getElementById('swal-title') as HTMLInputElement)?.value.trim(),
            category: (document.getElementById('swal-category') as HTMLInputElement)?.value.trim()
          })
        });
        if (isConfirmed && formValues) {
          await patchGig({ title: formValues.title, category: formValues.category });
        }
        break;
      }

      case 'description': {
        const { value: formValues, isConfirmed } = await Swal.fire({
          title: 'Modifier la description',
          html:
            `<textarea id="swal-desc" class="swal2-textarea" placeholder="Description du gig" style="min-height: 180px;">${escapeHtml(gig.description || '')}</textarea>` +
            `<input id="swal-seniority-level" class="swal2-input" placeholder="Niveau (Junior / Mid-Level / Senior)" value="${escapeHtml(gig.seniority?.level || '')}" />` +
            `<input id="swal-seniority-years" type="number" min="0" class="swal2-input" placeholder="Années d'expérience" value="${gig.seniority?.yearsExperience ?? ''}" />`,
          focusConfirm: false,
          showCancelButton: true,
          confirmButtonText: 'Sauvegarder',
          cancelButtonText: 'Annuler',
          preConfirm: () => ({
            description: (document.getElementById('swal-desc') as HTMLTextAreaElement)?.value.trim(),
            seniorityLevel: (document.getElementById('swal-seniority-level') as HTMLInputElement)?.value.trim(),
            seniorityYears: (document.getElementById('swal-seniority-years') as HTMLInputElement)?.value
          })
        });
        if (isConfirmed && formValues) {
          await patchGig({
            description: formValues.description,
            seniority: {
              ...(gig.seniority || {}),
              level: formValues.seniorityLevel || undefined,
              yearsExperience: formValues.seniorityYears ? Number(formValues.seniorityYears) : undefined
            }
          });
        }
        break;
      }

      case 'commission': {
        const c = gig.commission || {};
        const mv = c.minimumVolume || {};
        const { value: formValues, isConfirmed } = await Swal.fire({
          title: 'Modifier la commission',
          html:
            `<input id="swal-c-call" type="number" step="0.01" min="0" class="swal2-input" placeholder="€ / appel" value="${c.commission_per_call ?? ''}" />` +
            `<input id="swal-c-tx" type="number" step="0.01" min="0" class="swal2-input" placeholder="€ / transaction" value="${c.transactionCommission ?? ''}" />` +
            `<input id="swal-c-bonus" type="number" step="0.01" min="0" class="swal2-input" placeholder="Bonus (€)" value="${c.bonusAmount ?? ''}" />` +
            `<input id="swal-c-vol" type="number" min="0" class="swal2-input" placeholder="Volume minimum (appels)" value="${mv.amount ?? ''}" />` +
            `<select id="swal-c-period" class="swal2-input">` +
              ['Daily', 'Weekly', 'Monthly'].map(p =>
                `<option value="${p}" ${mv.period === p ? 'selected' : ''}>${p}</option>`
              ).join('') +
            `</select>` +
            `<textarea id="swal-c-details" class="swal2-textarea" placeholder="Détails supplémentaires">${escapeHtml(c.additionalDetails || '')}</textarea>`,
          focusConfirm: false,
          showCancelButton: true,
          confirmButtonText: 'Sauvegarder',
          cancelButtonText: 'Annuler',
          preConfirm: () => ({
            commission_per_call: numOrUndef(document.getElementById('swal-c-call')),
            transactionCommission: numOrUndef(document.getElementById('swal-c-tx')),
            bonusAmount: numOrUndef(document.getElementById('swal-c-bonus')),
            volumeAmount: numOrUndef(document.getElementById('swal-c-vol')),
            volumePeriod: (document.getElementById('swal-c-period') as HTMLSelectElement)?.value,
            additionalDetails: (document.getElementById('swal-c-details') as HTMLTextAreaElement)?.value
          })
        });
        if (isConfirmed && formValues) {
          await patchGig({
            commission: {
              ...c,
              commission_per_call: formValues.commission_per_call,
              transactionCommission: formValues.transactionCommission,
              bonusAmount: formValues.bonusAmount,
              minimumVolume: {
                ...(mv || {}),
                amount: formValues.volumeAmount,
                period: formValues.volumePeriod
              },
              additionalDetails: formValues.additionalDetails
            }
          });
        }
        break;
      }

      case 'team': {
        const { value: formValues, isConfirmed } = await Swal.fire({
          title: 'Modifier la team',
          html:
            `<input id="swal-team-size" type="number" min="1" class="swal2-input" placeholder="Taille de l'équipe" value="${gig.team?.size ?? ''}" />`,
          focusConfirm: false,
          showCancelButton: true,
          confirmButtonText: 'Sauvegarder',
          cancelButtonText: 'Annuler',
          preConfirm: () => ({
            size: numOrUndef(document.getElementById('swal-team-size'))
          })
        });
        if (isConfirmed && formValues) {
          await patchGig({ team: { ...(gig.team || {}), size: formValues.size } });
        }
        break;
      }

      case 'destination': {
        const current = gig.destination_zone?._id || gig.destination_zone?.cca2 || gig.destination_zone || '';
        const { value: formValues, isConfirmed } = await Swal.fire({
          title: 'Modifier la zone de destination',
          html:
            `<input id="swal-dest" class="swal2-input" placeholder="Pays / Zone (ex: FR, US, EU)" value="${escapeHtml(String(current))}" />`,
          focusConfirm: false,
          showCancelButton: true,
          confirmButtonText: 'Sauvegarder',
          cancelButtonText: 'Annuler',
          preConfirm: () => ({
            destination_zone: (document.getElementById('swal-dest') as HTMLInputElement)?.value.trim()
          })
        });
        if (isConfirmed && formValues?.destination_zone) {
          await patchGig({ destination_zone: formValues.destination_zone });
        }
        break;
      }

      case 'availability': {
        const existing = (gig.availability?.schedule || []) as Array<{ day: string; hours: { start: string; end: string } }>;
        const tz = gig.availability?.time_zone || (Array.isArray(gig.availability?.timeZones) ? gig.availability.timeZones[0] : '') || '';
        const byDay = new Map(existing.map(s => [s.day, s.hours]));
        const rowsHtml = DAYS_OF_WEEK.map(day => {
          const slot = byDay.get(day);
          const checked = slot ? 'checked' : '';
          const start = slot?.start || '09:00';
          const end = slot?.end || '18:00';
          return (
            `<div style="display: grid; grid-template-columns: 110px 1fr 1fr; gap: 8px; align-items: center; margin-bottom: 6px;">` +
              `<label style="display:flex; gap:6px; align-items:center; font-weight:600; font-size:13px;">` +
                `<input type="checkbox" data-day="${day}" ${checked} /> ${day.slice(0,3)}` +
              `</label>` +
              `<input type="time" data-day-start="${day}" value="${start}" class="swal2-input" style="margin:0;" />` +
              `<input type="time" data-day-end="${day}" value="${end}" class="swal2-input" style="margin:0;" />` +
            `</div>`
          );
        }).join('');
        const { value: formValues, isConfirmed } = await Swal.fire({
          title: 'Modifier les disponibilités',
          html:
            `<input id="swal-tz" class="swal2-input" placeholder="Timezone (ex: Europe/Paris)" value="${escapeHtml(String(tz))}" />` +
            `<div style="text-align:left; margin-top:12px;">${rowsHtml}</div>`,
          width: 560,
          focusConfirm: false,
          showCancelButton: true,
          confirmButtonText: 'Sauvegarder',
          cancelButtonText: 'Annuler',
          preConfirm: () => {
            const schedule: Array<{ day: string; hours: { start: string; end: string } }> = [];
            DAYS_OF_WEEK.forEach(day => {
              const cb = document.querySelector(`input[data-day="${day}"]`) as HTMLInputElement | null;
              const s = document.querySelector(`input[data-day-start="${day}"]`) as HTMLInputElement | null;
              const e = document.querySelector(`input[data-day-end="${day}"]`) as HTMLInputElement | null;
              if (cb?.checked && s?.value && e?.value) {
                schedule.push({ day, hours: { start: s.value, end: e.value } });
              }
            });
            return {
              timezone: (document.getElementById('swal-tz') as HTMLInputElement)?.value.trim(),
              schedule
            };
          }
        });
        if (isConfirmed && formValues) {
          const timezones = formValues.timezone ? [formValues.timezone] : [];
          await patchGig({
            availability: {
              ...(gig.availability || {}),
              schedule: formValues.schedule,
              time_zone: formValues.timezone,
              timeZones: timezones
            },
            schedule: {
              ...(gig.schedule || {}),
              schedules: formValues.schedule,
              time_zone: formValues.timezone,
              timeZones: timezones
            }
          });
        }
        break;
      }

      case 'skills': {
        const skills = gig.skills || {};
        const flat = (arr: any[]): string => Array.isArray(arr)
          ? arr.map(s => (typeof s === 'string' ? s : (s?.skill?.name || s?.name || ''))).filter(Boolean).join(', ')
          : '';
        const { isConfirmed } = await Swal.fire({
          title: 'Édition des compétences',
          icon: 'info',
          html:
            `<p style="text-align:left; font-size:13px; color:#475569;">L'édition fine des compétences nécessite l'assistant de création complet.</p>` +
            `<div style="text-align:left; margin-top:10px; font-size:12px; color:#64748b;">` +
              `<div><b>Technical:</b> ${escapeHtml(flat(skills.technical))}</div>` +
              `<div><b>Professional:</b> ${escapeHtml(flat(skills.professional))}</div>` +
              `<div><b>Soft:</b> ${escapeHtml(flat(skills.soft))}</div>` +
              `<div><b>Languages:</b> ${escapeHtml(flat(skills.languages))}</div>` +
            `</div>`,
          showCancelButton: true,
          confirmButtonText: 'Ouvrir l\'assistant',
          cancelButtonText: 'Fermer'
        });
        if (isConfirmed) {
          window.location.hash = `#/dashboard/gigs/${gigId}/edit?section=skills`;
        }
        break;
      }

      default:
        break;
    }
  }, [gig, gigId, patchGig]);

  if (loading) {
    return (
      <div className="px-4 py-3 bg-gray-50">
        {/* Header skeleton */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4 h-16">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-3 w-20 opacity-60" />
              </div>
            </div>
          </div>
        </div>

        {/* Content skeleton */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Info */}
              <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6 opacity-70" />
                <Skeleton className="h-4 w-4/5 opacity-60" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !gig) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <span className="text-red-500 font-bold text-2xl">!</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error || 'Gig not found'}</p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors"
          >
            Back to Gigs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <GigReview 
        data={gig as any}
        isReadOnly={true}
        onBack={handleBack}
        onEdit={() => {}}
        onSubmit={async () => {}}
        isSubmitting={false}
        onEditSection={handleEditSection}
      />
    </div>
  );
}

// Local helpers --------------------------------------------------------------

function escapeHtml(input: unknown): string {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function numOrUndef(el: HTMLElement | null): number | undefined {
  if (!el) return undefined;
  const v = (el as HTMLInputElement).value;
  if (v === '' || v === null || v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export default GigDetailsPanel;
