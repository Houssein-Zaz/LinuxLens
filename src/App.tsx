import { Route, Routes } from 'react-router';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { ExplainPage } from './pages/ExplainPage';
import { ExplorerPage } from './pages/ExplorerPage';
import { CommandPage } from './pages/CommandPage';
import { LsPage } from './pages/LsPage';
import { ChmodPage } from './pages/ChmodPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PracticePage } from './pages/PracticePage';

export default function App() {
  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:shadow"
      >
        Aller au contenu
      </a>
      <Header />
      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        <Routes>
          <Route path="/" element={<ExplainPage />} />
          <Route path="/explorer" element={<ExplorerPage />} />
          <Route path="/commande/:name" element={<CommandPage />} />
          <Route path="/ls" element={<LsPage />} />
          <Route path="/chmod" element={<ChmodPage />} />
          <Route path="/exercices" element={<PracticePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
