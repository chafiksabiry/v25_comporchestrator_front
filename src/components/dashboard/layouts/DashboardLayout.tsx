import React from 'react';
import { Outlet } from 'react-router-dom';

export function DashboardLayout() {
  return (
    <div className="flex-1 w-full h-full relative">
      <div className="px-4 py-3 pb-32">
        <Outlet />
      </div>
    </div>
  );
}

export default DashboardLayout;
