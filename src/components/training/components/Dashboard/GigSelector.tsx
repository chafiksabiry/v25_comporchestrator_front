import React, { useState, useEffect, useRef } from 'react';
import { Loader2, AlertCircle, ChevronDown, Check, MapPin, Briefcase } from 'lucide-react';
import { GigFromApi } from '../../types';
import { OnboardingService } from '../../infrastructure/services/OnboardingService';

const HARX = '#ff4d4d';

interface GigSelectorProps {
  companyId?: string;
  industryFilter?: string;
  industryName?: string;
  onGigSelect: (gig: GigFromApi) => void;
  selectedGigId?: string;
}

export default function GigSelector({ companyId, industryFilter, industryName, onGigSelect, selectedGigId }: GigSelectorProps) {
  const [gigs, setGigs] = useState<GigFromApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchGigs = async () => {
      try {
        setLoading(true);
        let response;
        if (industryFilter) {
          response = await OnboardingService.fetchGigsByIndustry(industryFilter, companyId);
        } else {
          response = await OnboardingService.fetchGigsByCompany(companyId);
        }
        if (!response.data || response.data.length === 0) {
          setGigs([]);
        } else {
          setGigs(response.data);
        }
      } catch {
        setGigs([]);
      } finally {
        setLoading(false);
      }
    };
    fetchGigs();
  }, [companyId, industryFilter, industryName]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = gigs.find(g => g._id === selectedGigId);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: '1px dashed #d1d5db', borderRadius: 10, padding: '12px 14px' }}>
        <Loader2 className="animate-spin" style={{ width: 16, height: 16, color: HARX }} />
        <span style={{ fontSize: 13, color: '#6b7280' }}>Loading gigs...</span>
      </div>
    );
  }

  if (gigs.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: HARX, border: `1px solid #fecaca` }}>
        <AlertCircle style={{ width: 15, height: 15, flexShrink: 0 }} />
        <span>No gigs for &quot;{industryName || industryFilter || 'this industry'}&quot;. Choose another industry.</span>
      </div>
    );
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          border: open ? `1.5px solid ${HARX}` : '1px solid #d1d5db',
          borderRadius: 10, padding: '11px 14px', fontSize: 14, background: '#fff',
          color: selected ? '#111827' : '#9ca3af', cursor: 'pointer',
          boxShadow: open ? '0 0 0 3px rgba(255,77,77,0.1)' : 'none',
          transition: 'all 150ms',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {selected ? (
            <>
              <Briefcase style={{ width: 14, height: 14, color: HARX }} />
              <span style={{ fontWeight: 500 }}>{selected.title}</span>
              {selected.destination_zone?.name?.common && (
                <span style={{ fontSize: 12, color: '#6b7280' }}>— {selected.destination_zone.name.common}</span>
              )}
            </>
          ) : 'Select a gig...'}
        </span>
        <ChevronDown style={{ width: 16, height: 16, color: '#9ca3af', transition: 'transform 200ms', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50,
          background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
          boxShadow: '0 12px 32px rgba(0,0,0,0.12)', overflow: 'hidden',
        }}>
          <div style={{ padding: '6px 10px', borderBottom: '1px solid #f3f4f6' }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#9ca3af' }}>
              {gigs.length} gig{gigs.length > 1 ? 's' : ''} available
            </span>
          </div>
          <div style={{ maxHeight: 240, overflowY: 'auto', padding: '4px 0' }}>
            {gigs.map(gig => {
              const isSelected = selectedGigId === gig._id;
              return (
                <button
                  key={gig._id}
                  type="button"
                  onClick={() => { onGigSelect(gig); setOpen(false); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '10px 14px', border: 'none',
                    background: isSelected ? '#fff5f5' : 'transparent',
                    cursor: 'pointer', transition: 'background 100ms', textAlign: 'left',
                  }}
                  onMouseEnter={(e) => { if (!isSelected) (e.currentTarget.style.background = '#f9fafb'); }}
                  onMouseLeave={(e) => { if (!isSelected) (e.currentTarget.style.background = isSelected ? '#fff5f5' : 'transparent'); }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: 14,
                    background: isSelected ? '#fee2e2' : '#f3f4f6',
                    color: isSelected ? HARX : '#6b7280',
                  }}>
                    <Briefcase style={{ width: 15, height: 15 }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: isSelected ? 600 : 500, color: isSelected ? HARX : '#111827', lineHeight: 1.3 }}>
                      {gig.title}
                    </div>
                    {(gig.destination_zone?.name?.common || gig.description) && (
                      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {gig.destination_zone?.name?.common && (
                          <>
                            <MapPin style={{ width: 10, height: 10 }} />
                            <span>{gig.destination_zone.name.common}</span>
                          </>
                        )}
                        {gig.destination_zone?.name?.common && gig.description && <span>·</span>}
                        {gig.description && (
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {gig.description.slice(0, 60)}{gig.description.length > 60 ? '…' : ''}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {isSelected && <Check style={{ width: 14, height: 14, color: HARX, flexShrink: 0, marginTop: 2 }} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
