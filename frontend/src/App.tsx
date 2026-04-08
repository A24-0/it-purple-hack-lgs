import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './store/AppContext';
import Layout from './components/Layout/Layout';
import HomePage from './components/Home/HomePage';
import ProgressPage from './components/Progress/ProgressPage';
import DictionaryPage from './components/Dictionary/DictionaryPage';
import SettingsPage from './components/Settings/SettingsPage';
import ScenarioWalkthrough from './components/Scenarios/ScenarioWalkthrough';
import AiChatPage from './components/AI/AiChatPage';
import LeaderboardPage from './components/Leaderboard/LeaderboardPage';
import AuthPage from './components/Auth/AuthPage';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import GuessRiskGame from './components/Games/GuessRiskGame';
import BuildPolicyGame from './components/Games/BuildPolicyGame';
import ClaimSimulatorGame from './components/Games/ClaimSimulatorGame';
import DailyQuizGame from './components/Games/DailyQuizGame';
import GamesHubPage from './components/Games/GamesHubPage';
import ProfilePage from './components/Profile/ProfilePage';
import CatchPoliciesGame from './components/Games/CatchPoliciesGame';
import MemoryTermsGame from './components/Games/MemoryTermsGame';
import LaneRushGame from './components/Games/LaneRushGame';
import TermSnapGame from './components/Games/TermSnapGame';
import InsuranceSorterGame from './components/Games/InsuranceSorterGame';
import QuizBattleGame from './components/Games/QuizBattleGame';
import RewardsPage from './components/Rewards/RewardsPage';
import TelegramGuidePage from './components/Telegram/TelegramGuidePage';

const ClaimDetectiveGame = lazy(() => import('./components/Games/ClaimDetectiveGame'));

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<AuthPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/ai-chat" element={<Navigate to="/help" replace />} />
            <Route element={<Layout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/progress" element={<ProgressPage />} />
              <Route path="/dictionary" element={<DictionaryPage />} />
              <Route path="/games" element={<GamesHubPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/rewards" element={<RewardsPage />} />
              <Route path="/telegram" element={<TelegramGuidePage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/help" element={<AiChatPage />} />
              <Route path="/scenario/:id" element={<ScenarioWalkthrough />} />
              <Route path="/game/guess-risk" element={<GuessRiskGame />} />
              <Route path="/game/build-policy" element={<BuildPolicyGame />} />
              <Route path="/game/claim-simulator" element={<ClaimSimulatorGame />} />
              <Route path="/game/daily-quiz" element={<DailyQuizGame />} />
              <Route path="/game/catch-policies" element={<CatchPoliciesGame />} />
              <Route path="/game/memory-terms" element={<MemoryTermsGame />} />
              <Route path="/game/lane-rush" element={<LaneRushGame />} />
              <Route path="/game/term-snap" element={<TermSnapGame />} />
              <Route path="/game/insurance-sorter" element={<InsuranceSorterGame />} />
              <Route path="/game/quiz-battle" element={<QuizBattleGame />} />
              <Route
                path="/game/claim-detective"
                element={
                  <Suspense fallback={<div style={{ padding: 24 }}>Загрузка игры...</div>}>
                    <ClaimDetectiveGame />
                  </Suspense>
                }
              />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
