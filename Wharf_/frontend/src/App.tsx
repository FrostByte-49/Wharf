import React, { Suspense } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Header, Footer, BottomNav } from './components/layout';
import { ToastProvider, useToast } from './components/ui';
import { usePageViewTracking } from './hooks/useAnalytics';
import { useAuthStore } from './stores/authStore';

const HomePage = React.lazy(() =>
  import('./pages/HomePage').then((m) => ({ default: m.HomePage }))
);
const AuthCallback = React.lazy(() =>
  import('./pages/AuthCallback').then((m) => ({ default: m.AuthCallback }))
);
const GeneratorPage = React.lazy(() =>
  import('./pages/GeneratorPage').then((m) => ({ default: m.GeneratorPage }))
);
const ProfileGeneratorPage = React.lazy(() =>
  import('./pages/ProfileGeneratorPage').then((m) => ({ default: m.ProfileGeneratorPage }))
);
const ChatPage = React.lazy(() =>
  import('./pages/ChatPage').then((m) => ({ default: m.ChatPage }))
);
const HealthPage = React.lazy(() =>
  import('./pages/HealthPage').then((m) => ({ default: m.HealthPage }))
);
const ChangelogPage = React.lazy(() =>
  import('./pages/ChangelogPage').then((m) => ({ default: m.ChangelogPage }))
);
const SettingsPage = React.lazy(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);
const AdminDashboard = React.lazy(() =>
  import('./pages/AdminDashboard').then((m) => ({ default: m.AdminDashboard }))
);
const AboutPage = React.lazy(() =>
  import('./pages/AboutPage').then((m) => ({ default: m.AboutPage }))
);
const TermsPage = React.lazy(() =>
  import('./pages/TermsPage').then((m) => ({ default: m.TermsPage }))
);
const PrivacyPage = React.lazy(() =>
  import('./pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage }))
);
const DocsPage = React.lazy(() =>
  import('./pages/DocsPage').then((m) => ({ default: m.DocsPage }))
);


function GlobalToastListener() {
  const { showToast } = useToast();
  const navigate = useNavigate();

  React.useEffect(() => {
    const handleRateLimit = (e: Event) => {
      const customEvent = e as CustomEvent;

      showToast(
        customEvent.detail?.message || 'Too Many Requests',
        'error'
      );
    };

    const handleAuthExpired = () => {
      const { isAuthenticated, logout } = useAuthStore.getState();

      // Avoid repeated logout notifications.
      if (!isAuthenticated) return;

      logout();

      showToast(
        'Session expired. Please sign in again.',
        'error'
      );

      navigate('/', { replace: true });
    };

    const handleServerError = () => {
      showToast(
        'Unable to connect to server. Please try again.',
        'error'
      );
    };

    window.addEventListener('api:rate-limit', handleRateLimit);
    window.addEventListener('auth:expired', handleAuthExpired);
    window.addEventListener('api:server-error', handleServerError);

    return () => {
      window.removeEventListener('api:rate-limit', handleRateLimit);
      window.removeEventListener('auth:expired', handleAuthExpired);
      window.removeEventListener('api:server-error', handleServerError);
    };
  }, [showToast, navigate]);

  return null;
}


function App() {
  usePageViewTracking();
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname.replace(/^\/+/, '') || 'home';

  const isChatPage = location.pathname === '/chat';

  return (
    <ToastProvider>
      <GlobalToastListener />
      <div className="min-h-screen flex flex-col bg-wharf-surface-primary">
        {!isChatPage && <Header />}

        <main className="flex-1">
          <Suspense
            fallback={
              <div className="flex min-h-[50vh] items-center justify-center animate-pulse">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-wharf-border-primary border-t-wharf-pink rounded-full animate-spin" />
                  <div className="font-mono font-bold text-sm text-wharf-text-secondary tracking-widest uppercase">
                    Loading…
                  </div>
                </div>
              </div>
            }
          >
            <Routes>
              {/* Main Pages */}
              <Route path="/" element={<HomePage />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/generator" element={<GeneratorPage />} />
              <Route path="/profile" element={<ProfileGeneratorPage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/health" element={<HealthPage />} />
              <Route path="/changelog" element={<ChangelogPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/admin" element={<AdminDashboard />} />

              {/* Documentation Pages */}
              <Route path="/about" element={<AboutPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/docs" element={<DocsPage />} />

              <Route path="*" element={<HomePage />} />
            </Routes>
          </Suspense>
        </main>

        {/* Footer */}
        {!isChatPage && <Footer />}

        {/* BottomNav */}
        {!isChatPage && (
          <BottomNav
            currentPage={pathname}
            onNavigate={(page) => {
              navigate(`/${page === 'home' ? '' : page}`);
              window.scrollTo(0, 0);
            }}
          />
        )}
      </div>
    </ToastProvider>
  );
}

export default App;
