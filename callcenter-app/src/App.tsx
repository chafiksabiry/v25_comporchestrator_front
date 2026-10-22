import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAppState } from '@/store/store';
import AppLayout from '@/pages/AppLayout';
import Dashboard from '@/pages/Dashboard';
import Calls from '@/pages/Calls';
import Agents from '@/pages/Agents';
import Queues from '@/pages/Queues';
import Planning from '@/pages/Planning';
import Numbers from '@/pages/Numbers';
import Scripts from '@/pages/Scripts';
import Quality from '@/pages/Quality';
import Billing from '@/pages/Billing';
import Onboarding from '@/pages/Onboarding';

function Home() {
  const { onboarding } = useAppState();
  return <Navigate to={onboarding.done ? '/app/dashboard' : '/onboarding'} replace />;
}

function RequireOnboarding({ children }: { children: JSX.Element }) {
  const { onboarding } = useAppState();
  return onboarding.done ? children : <Navigate to="/onboarding" replace />;
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/app" element={<RequireOnboarding><AppLayout /></RequireOnboarding>}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="calls" element={<Calls />} />
          <Route path="agents" element={<Agents />} />
          <Route path="queues" element={<Queues />} />
          <Route path="planning" element={<Planning />} />
          <Route path="numbers" element={<Numbers />} />
          <Route path="scripts" element={<Scripts />} />
          <Route path="quality" element={<Quality />} />
          <Route path="billing" element={<Billing />} />
        </Route>
        <Route path="*" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}
