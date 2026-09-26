import { lazy, Suspense, type ComponentType } from 'react';
import { Route, Routes, useLocation } from 'react-router';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { RequireAuth } from './components/auth/RequireAuth';
import { AuthProvider } from './hooks/useAuth';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { ExplainPage } from './pages/ExplainPage';
import { NotFoundPage } from './pages/NotFoundPage';
import type { Backend } from './types/backend';

// L'accueil est chargé tout de suite ; les autres pages seulement quand on les ouvre.
const page = <K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) =>
  lazy(() => load().then((m) => ({ default: m[name] })));

const ExplorerPage = page(() => import('./pages/ExplorerPage'), 'ExplorerPage');
const CommandPage = page(() => import('./pages/CommandPage'), 'CommandPage');
const LsPage = page(() => import('./pages/LsPage'), 'LsPage');
const ChmodPage = page(() => import('./pages/ChmodPage'), 'ChmodPage');
const PracticePage = page(() => import('./pages/PracticePage'), 'PracticePage');
const PrivacyPage = page(() => import('./pages/PrivacyPage'), 'PrivacyPage');
const AccountPage = page(() => import('./pages/auth/AccountPage'), 'AccountPage');
const ForgotPasswordPage = page(() => import('./pages/auth/ForgotPasswordPage'), 'ForgotPasswordPage');
const ResetPasswordPage = page(() => import('./pages/auth/ResetPasswordPage'), 'ResetPasswordPage');
const SignInPage = page(() => import('./pages/auth/SignInPage'), 'SignInPage');
const SignUpPage = page(() => import('./pages/auth/SignUpPage'), 'SignUpPage');

/** `backend` : injecté par les tests ; sinon choisi selon la configuration (Supabase ou démo). */
export default function App({ backend }: { backend?: Backend }) {
  const { pathname } = useLocation();
  return (
    <AuthProvider {...(backend && { backend })}>
      <div className="flex min-h-dvh flex-col overflow-x-clip">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:shadow"
        >
          Aller au contenu
        </a>
        <Header />
        <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
          <ErrorBoundary key={pathname}>
            <Suspense fallback={<p className="text-zinc-500">Chargement…</p>}>
              <Routes>
                <Route path="/" element={<ExplainPage />} />
                <Route path="/explorer" element={<ExplorerPage />} />
                <Route path="/commande/:name" element={<CommandPage />} />
                <Route path="/ls" element={<LsPage />} />
                <Route path="/chmod" element={<ChmodPage />} />
                <Route path="/exercices" element={<PracticePage />} />
                <Route path="/connexion" element={<SignInPage />} />
                <Route path="/inscription" element={<SignUpPage />} />
                <Route path="/mot-de-passe-oublie" element={<ForgotPasswordPage />} />
                <Route path="/nouveau-mot-de-passe" element={<ResetPasswordPage />} />
                <Route
                  path="/compte"
                  element={
                    <RequireAuth>
                      <AccountPage />
                    </RequireAuth>
                  }
                />
                <Route path="/confidentialite" element={<PrivacyPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>
        <Footer />
      </div>
    </AuthProvider>
  );
}
