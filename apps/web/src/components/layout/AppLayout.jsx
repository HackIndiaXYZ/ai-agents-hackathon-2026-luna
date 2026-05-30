import React from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export const AppLayout = ({ children }) => {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--surface-alt)' }}>
      {/* Fixed Left Navigation Sidebar */}
      <Sidebar />

      {/* Top Header Bar */}
      <TopBar />

      {/* Main Viewport Content container */}
      <main className="ml-16 md:ml-[240px] pt-16 min-h-screen transition-all duration-300">
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
