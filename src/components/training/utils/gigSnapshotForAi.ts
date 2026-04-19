/**
 * Serializes a gig from the gigs API for AI prompts (chat, slides, curriculum).
 * Keeps learner-relevant fields only; avoids dumping huge nested objects.
 */

function namesFromList(items: unknown, keys: string[]): string[] {
  if (!Array.isArray(items)) return [];
  const out: string[] = [];
  for (const item of items) {
    if (item == null) continue;
    if (typeof item === 'string') {
      const s = item.trim();
      if (s) out.push(s);
      continue;
    }
    if (typeof item === 'object') {
      const o = item as Record<string, unknown>;
      for (const k of keys) {
        const v = o[k];
        if (typeof v === 'string' && v.trim()) {
          out.push(v.trim());
          break;
        }
      }
    }
  }
  return [...new Set(out)].slice(0, 24);
}

function skillRows(list: unknown, max: number): string[] {
  if (!Array.isArray(list)) return [];
  const rows: string[] = [];
  for (const row of list) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, any>;
    const details = String(r.details || '').trim();
    const skillObj = r.skill && typeof r.skill === 'object' ? r.skill : null;
    const skillName = skillObj ? String(skillObj.name || skillObj.title || '').trim() : '';
    const line = [skillName, details].filter(Boolean).join(' — ');
    if (line) rows.push(line);
    if (rows.length >= max) break;
  }
  return rows;
}

export function buildGigSnapshotForAi(gig: unknown): Record<string, unknown> | null {
  if (!gig || typeof gig !== 'object') return null;
  const g = gig as Record<string, any>;
  const id = String(g._id || g.id || '').trim();
  const title = String(g.title || '').trim();
  if (!id && !title) return null;

  const dz = g.destination_zone;
  const destinationZone =
    dz && typeof dz === 'object'
      ? String(dz.name || dz.label || dz.title || '').trim()
      : typeof dz === 'string'
        ? dz.trim()
        : '';

  const seniority =
    g.seniority && typeof g.seniority === 'object'
      ? {
          level: String(g.seniority.level || '').trim(),
          yearsExperience: String(g.seniority.yearsExperience || '').trim(),
        }
      : undefined;

  const commission = g.commission && typeof g.commission === 'object' ? g.commission : null;

  return {
    id: id || undefined,
    title: title || 'Untitled gig',
    description: String(g.description || '').trim(),
    category: String(g.category || '').trim(),
    status: String(g.status || '').trim(),
    industries: namesFromList(g.industries, ['name', 'title', 'label']),
    activities: namesFromList(g.activities, ['name', 'title', 'label']),
    sectors: namesFromList(g.sectors, ['name', 'title', 'label']),
    destinationZone: destinationZone || undefined,
    seniority: seniority?.level || seniority?.yearsExperience ? seniority : undefined,
    highlights: Array.isArray(g.highlights)
      ? g.highlights.filter((x: unknown) => typeof x === 'string').map((x: string) => x.trim()).filter(Boolean).slice(0, 24)
      : [],
    deliverables: Array.isArray(g.deliverables)
      ? g.deliverables.filter((x: unknown) => typeof x === 'string').map((x: string) => x.trim()).filter(Boolean).slice(0, 24)
      : [],
    skillsSummary: {
      professional: skillRows(g.skills?.professional, 12),
      technical: skillRows(g.skills?.technical, 12),
      soft: skillRows(g.skills?.soft, 8),
    },
    commission: commission
      ? {
          structure: String(commission.structure || '').trim(),
          additionalDetails: String(commission.additionalDetails || '').trim(),
        }
      : undefined,
  };
}
