import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';

const ComparateurNeufVsAncien = lazy(() =>
  import('./pages/ComparateurNeufVsAncien').then((m) => ({
    default: m.ComparateurNeufVsAncien,
  }))
);

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center text-text-muted text-sm">
      Chargement…
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route
          path="/compare/neuf-vs-ancien"
          element={
            <Suspense fallback={<PageLoader />}>
              <ComparateurNeufVsAncien />
            </Suspense>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
