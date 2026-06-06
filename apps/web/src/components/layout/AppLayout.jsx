import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function AppLayout() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--page-bg)' }}>
      <Sidebar />
      <TopBar />
      <main
        style={{
          marginLeft: 'var(--sidebar-width)',
          paddingTop: 'calc(var(--topbar-height) + 24px)',
          paddingRight: 24,
          paddingBottom: 24,
          paddingLeft: 24,
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}
