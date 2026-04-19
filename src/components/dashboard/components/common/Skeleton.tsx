import React from "react";

// ─── Base Skeleton Block ─────────────────────────────────────────────────────
interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] rounded-lg ${className}`}
      style={{
        animation: "skeleton-shimmer 1.5s infinite linear",
      }}
    />
  );
}

// ─── Table Row Skeleton ───────────────────────────────────────────────────────
export function TableRowSkeleton({ cols = 3 }: { cols?: number }) {
  return (
    <tr className="border-b border-gray-100">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="py-4 px-4">
          <Skeleton className="h-4 w-full rounded-md" />
          {i === 0 && <Skeleton className="h-3 w-2/3 mt-2 rounded-md opacity-60" />}
        </td>
      ))}
    </tr>
  );
}

// ─── Card Skeleton ────────────────────────────────────────────────────────────
export function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4 shadow-sm animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-gray-200 shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3 opacity-60" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5 opacity-70" />
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="h-8 w-20 rounded-lg opacity-60" />
      </div>
    </div>
  );
}

// ─── Gigs Table Skeleton ──────────────────────────────────────────────────────
export function GigsTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-x-auto animate-pulse">
      <table className="w-full">
        <thead>
          <tr className="text-left border-b bg-gray-50">
            {["Gig Details", "Category", "Actions"].map((h) => (
              <th key={h} className="pb-4 pt-4 px-4">
                <Skeleton className="h-3 w-24 rounded" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
              <td className="py-4 px-4">
                <Skeleton className="h-4 w-40 mb-2" />
                <Skeleton className="h-3 w-28 opacity-60" />
              </td>
              <td className="py-4 px-4">
                <Skeleton className="h-6 w-20 rounded-full" />
              </td>
              <td className="py-4 px-4">
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Leads Table Skeleton ─────────────────────────────────────────────────────
export function LeadsTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="overflow-x-auto animate-pulse">
      <table className="w-full">
        <thead>
          <tr className="text-left border-b bg-gray-50">
            {["Name", "Contact", "Status", "Score", "Actions"].map((h) => (
              <th key={h} className="pb-3 pt-3 px-4">
                <Skeleton className="h-3 w-20 rounded" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
              <td className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-3 w-20 opacity-60" />
                  </div>
                </div>
              </td>
              <td className="py-3 px-4">
                <Skeleton className="h-3 w-32 mb-1.5" />
                <Skeleton className="h-3 w-24 opacity-60" />
              </td>
              <td className="py-3 px-4">
                <Skeleton className="h-6 w-20 rounded-full" />
              </td>
              <td className="py-3 px-4">
                <Skeleton className="h-6 w-12 rounded-full" />
              </td>
              <td className="py-3 px-4">
                <div className="flex gap-1.5">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── KPI Stats Bar Skeleton ───────────────────────────────────────────────────
export function StatBarSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-${count} gap-4 animate-pulse`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <Skeleton className="h-3 w-20 mb-3" />
          <Skeleton className="h-8 w-16 mb-1" />
          <Skeleton className="h-3 w-24 opacity-60" />
        </div>
      ))}
    </div>
  );
}

// ─── Panel Header Skeleton ────────────────────────────────────────────────────
export function PanelHeaderSkeleton() {
  return (
    <div className="flex items-center justify-between mb-6 animate-pulse">
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-28 opacity-60" />
        </div>
      </div>
      <Skeleton className="h-10 w-28 rounded-lg" />
    </div>
  );
}
