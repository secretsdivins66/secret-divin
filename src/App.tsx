import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { getCSRFToken, setCSRFToken } from './utils/security';
import { PrivateRoute } from './components/PrivateRoute';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { PoidsMystiquePage } from './pages/PoidsMystiquePage';
import { CarresMagiquesPage } from './pages/CarresMagiquesPage';
import { DestinPage } from './pages/DestinPage';
import { SecretsPage } from './pages/SecretsPage';
import { JoursPage } from './pages/JoursPage';
import { GeomanciePage } from './pages/GeomanciePage';
import { RevesPage } from './pages/RevesPage';
import { PlantesPage } from './pages/PlantesPage';
import { CompatibilitePage } from './pages/CompatibilitePage';
import { AttraperPage } from './pages/AttraperPage';
import { TutorielsPage } from './pages/TutorielsPage';
import { FormationPage } from './pages/FormationPage';
import { CreditsPage } from './pages/CreditsPage';
import { FonctionnalitesPage } from './pages/FonctionnalitesPage';
import { BlogPage } from './pages/BlogPage';
import { BlogArticlePage } from './pages/BlogArticlePage';
import { ContactPage } from './pages/ContactPage';
import { AdminPage } from './pages/AdminPage';
import { ProfilPage } from './pages/ProfilPage';

function WithLayout({ children }: { children: React.ReactNode }) {
  return <Layout>{children}</Layout>;
}

function App() {
  // Initialiser le token CSRF au démarrage de l'application
  useEffect(() => {
    if (!getCSRFToken()) {
      setCSRFToken();
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Auth sans layout */}
        <Route path="/auth" element={<AuthPage />} />

        {/* Publiques avec layout */}
        <Route path="/" element={<WithLayout><LandingPage /></WithLayout>} />
        <Route path="/fonctionnalites" element={<WithLayout><FonctionnalitesPage /></WithLayout>} />
        <Route path="/credits" element={<WithLayout><CreditsPage /></WithLayout>} />
        <Route path="/blog" element={<WithLayout><BlogPage /></WithLayout>} />
        <Route path="/blog/:slug" element={<WithLayout><BlogArticlePage /></WithLayout>} />
        <Route path="/contact" element={<WithLayout><ContactPage /></WithLayout>} />

        {/* Protégées avec layout */}
        <Route path="/dashboard" element={<WithLayout><PrivateRoute><DashboardPage /></PrivateRoute></WithLayout>} />
        <Route path="/poids-mystique" element={<WithLayout><PrivateRoute><PoidsMystiquePage /></PrivateRoute></WithLayout>} />
        <Route path="/destin" element={<WithLayout><PrivateRoute><DestinPage /></PrivateRoute></WithLayout>} />
        <Route path="/jours" element={<WithLayout><PrivateRoute><JoursPage /></PrivateRoute></WithLayout>} />
        <Route path="/secrets" element={<WithLayout><PrivateRoute><SecretsPage /></PrivateRoute></WithLayout>} />
        <Route path="/carres-magiques" element={<WithLayout><PrivateRoute><CarresMagiquesPage /></PrivateRoute></WithLayout>} />
        <Route path="/geomancie" element={<WithLayout><PrivateRoute><GeomanciePage /></PrivateRoute></WithLayout>} />
        <Route path="/reves" element={<WithLayout><PrivateRoute><RevesPage /></PrivateRoute></WithLayout>} />
        <Route path="/plantes" element={<WithLayout><PrivateRoute><PlantesPage /></PrivateRoute></WithLayout>} />
        <Route path="/compatibilite" element={<WithLayout><PrivateRoute><CompatibilitePage /></PrivateRoute></WithLayout>} />
        <Route path="/attraper" element={<WithLayout><PrivateRoute><AttraperPage /></PrivateRoute></WithLayout>} />
        <Route path="/tutoriels" element={<WithLayout><PrivateRoute><TutorielsPage /></PrivateRoute></WithLayout>} />
        <Route path="/formation" element={<WithLayout><PrivateRoute><FormationPage /></PrivateRoute></WithLayout>} />
        <Route path="/profil" element={<WithLayout><PrivateRoute><ProfilPage /></PrivateRoute></WithLayout>} />
        <Route path="/admin" element={<WithLayout><PrivateRoute><AdminPage /></PrivateRoute></WithLayout>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
