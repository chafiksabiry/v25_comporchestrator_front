import React from 'react';
import { Outlet } from 'react-router-dom';

export function DashboardLayout() {
  return (
    <div className="flex-1 w-full h-full relative overflow-y-auto">
      <div className="p-8 pb-32">
        <Outlet />
      </div>
    </div>
  );
}

export default DashboardLayout;
