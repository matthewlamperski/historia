import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ReportsPage from './pages/ReportsPage';
import ReportDetailPage from './pages/ReportDetailPage';
import UsersPage from './pages/UsersPage';
import LevelsPage from './pages/LevelsPage';
import LevelEditPage from './pages/LevelEditPage';
import EarningRulesPage from './pages/EarningRulesPage';
import RewardTiersPage from './pages/RewardTiersPage';
import RewardTierEditPage from './pages/RewardTierEditPage';
import WelcomeMessagePage from './pages/WelcomeMessagePage';
import BlogPostsPage from './pages/BlogPostsPage';
import BlogPostEditPage from './pages/BlogPostEditPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="reports/:reportId" element={<ReportDetailPage />} />
          <Route path="users" element={<UsersPage />} />

          {/* Points / Levels / Rewards editors */}
          <Route path="levels" element={<LevelsPage />} />
          <Route path="levels/:levelId" element={<LevelEditPage />} />
          <Route path="earning-rules" element={<EarningRulesPage />} />
          <Route path="reward-tiers" element={<RewardTiersPage />} />
          <Route path="reward-tiers/new" element={<RewardTierEditPage />} />
          <Route path="reward-tiers/:tierId" element={<RewardTierEditPage />} />

          {/* Welcome Message editor (spec §6.8) */}
          <Route path="welcome-message" element={<WelcomeMessagePage />} />

          {/* Blog editor (marketing site content) */}
          <Route path="blog" element={<BlogPostsPage />} />
          <Route path="blog/new" element={<BlogPostEditPage />} />
          <Route path="blog/:postId" element={<BlogPostEditPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
