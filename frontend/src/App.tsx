import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RequireAuth } from "./components/RequireAuth";
import { LoginPage } from "./pages/LoginPage";
import { ConsentPage } from "./pages/ConsentPage";
import { HomePage } from "./pages/HomePage";
import { ChatPage } from "./pages/ChatPage";
import { CheckInPage } from "./pages/CheckInPage";
import { PatternsPage } from "./pages/PatternsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { EnvironmentalPage } from "./pages/EnvironmentalPage";
import { JournalPage } from "./pages/JournalPage";
import { ExercisesPage } from "./pages/ExercisesPage";
import { CrisisHelpPage } from "./pages/CrisisHelpPage";
import { ArticlesPage } from "./pages/ArticlesPage";
import { GoalsPage } from "./pages/GoalsPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public: reachable whether or not the user is signed in, since
              this is meant to be always accessible, not gated behind auth. */}
          <Route path="/crisis-help" element={<CrisisHelpPage />} />

          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/consent"
            element={
              <RequireAuth>
                <ConsentPage />
              </RequireAuth>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat/:conversationId"
            element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/check-in"
            element={
              <ProtectedRoute>
                <CheckInPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patterns"
            element={
              <ProtectedRoute>
                <PatternsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/environmental"
            element={
              <ProtectedRoute>
                <EnvironmentalPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/journal"
            element={
              <ProtectedRoute>
                <JournalPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/exercises"
            element={
              <ProtectedRoute>
                <ExercisesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/articles"
            element={
              <ProtectedRoute>
                <ArticlesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/goals"
            element={
              <ProtectedRoute>
                <GoalsPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
