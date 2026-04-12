import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  const updatePos = useCallback(() => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left, width: r.width });
    }
  }, []);

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
        setGigs(!response.data || response.data.length === 0 ? [] : response.data);
      } catch {
        setGigs([]);
      } finally {
        setLoading(false);
      }
    };
    fetchGigs();
  }, [companyId, industryFilter, industryName]);

  useEffect(() => {
    if (open) {
      updatePos();
      window.addEventListener('scroll', updatePos, true);
      window.addEventListener('resize', updatePos);
      return () => { window.removeEventListener('scroll', updatePos, true); window.removeEventListener('resize', updatePos); };
    }
  }, [open, updatePos]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: HARX, border: '1px solid #fecaca' }}>
        <AlertCircle style={{ width: 15, height: 15, flexShrink: 0 }} />
        <span>No gigs for &quot;{industryName || industryFilter || 'this industry'}&quot;. Choose another industry.</span>
      </div>
    );
  }

  return (
    <div>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          border: open ? `1.5px solid ${HARX}` : '1px solid #d1d5db',
          borderRadius: 10, padding: '10px 14px', fontSize: 14, background: '#fff',
          color: selected ? '#111827' : '#9ca3af', cursor: 'pointer',
          boxShadow: open ? '0 0 0 3px rgba(255,77,77,0.08)' : 'none',
          transition: 'all 150ms',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
          {selected ? (
            <>
              <Briefcase style={{ width: 14, height: 14, color: HARX, flexShrink: 0 }} />
              <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.title}</span>
              {selected.destination_zone?.name?.common && (
                <span style={{ fontSize: 12, color: '#6b7280', flexShrink: 0 }}>— {selected.destination_zone.name.common}</span>
              )}
            </>
          ) : 'Select a gig...'}
        </span>
        <ChevronDown style={{ width: 16, height: 16, color: '#9ca3af', flexShrink: 0, transition: 'transform 200ms', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          style={{
            position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 99999,
            background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
            boxShadow: '0 8px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '6px 12px', borderBottom: '1px solid #f3f4f6' }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#9ca3af' }}>
              {gigs.length} gig{gigs.length > 1 ? 's' : ''} available
            </span>
          </div>
          <div style={{ maxHeight: 260, overflowY: 'auto', padding: '4px 0' }}>
            {gigs.map(gig => {
              const isSel = selectedGigId === gig._id;
              return (
                <button
                  key={gig._id}
                  type="button"
                  onClick={() => { onGigSelect(gig); setOpen(false); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '10px 14px', border: 'none',
                    background: isSel ? '#fff5f5' : 'transparent',
                    cursor: 'pointer', transition: 'background 100ms', textAlign: 'left',
                  }}
                  onMouseEnter={(e) => { if (!isSel) (e.currentTarget.style.background = '#f9fafb'); }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = isSel ? '#fff5f5' : 'transparent'; }}
                >
                  <div style={{
                    width: 30, height: 30, borderRadius: 8, flexShrink: 0, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    background: isSel ? '#fee2e2' : '#f3f4f6',
                    color: isSel ? HARX : '#6b7280',
                  }}>
                    <Briefcase style={{ width: 14, height: 14 }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: isSel ? 600 : 500, color: isSel ? HARX : '#111827', lineHeight: 1.3 }}>
                      {gig.title}
                    </div>
                    {(gig.destination_zone?.name?.common || gig.description) && (
                      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {gig.destination_zone?.name?.common && (
                          <>
                            <MapPin style={{ width: 10, height: 10, flexShrink: 0 }} />
                            <span>{gig.destination_zone.name.common}</span>
                          </>
                        )}
                        {gig.destination_zone?.name?.common && gig.description && <span style={{ flexShrink: 0 }}>·</span>}
                        {gig.description && (
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {gig.description.slice(0, 50)}{gig.description.length > 50 ? '…' : ''}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {isSel && <Check style={{ width: 14, height: 14, color: HARX, flexShrink: 0, marginTop: 2 }} />}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
