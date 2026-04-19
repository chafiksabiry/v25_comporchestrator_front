import React from 'react';
import { StatCardProps } from '../../types';

export function StatCard({ title, value, icon: Icon, trend, trendUp = true, detail = null }: StatCardProps) {
  return (
    <div className="rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow" style={{ backgroundColor: '#f3f4f6' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-rose-50 rounded-lg">
            <Icon className="w-5 h-5 text-rose-500" />
          </div>
          <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        </div>
        {trend && (
          <span className={`flex items-center text-sm ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
            {trend}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {detail && <p className="mt-1 text-sm text-gray-500">{detail}</p>}
    </div>
  );
}
