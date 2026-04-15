import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './store/AppContext';
import Layout from './components/Layout/Layout';
import HomePage from './components/Home/HomePage';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import AuthPage from './components/Auth/AuthPage';
import PageLoading from './components/ui/PageLoading';

const ProgressPage = lazy(() => import('./components/Progress/ProgressPage'));
const DictionaryPage = lazy(() => import('./components/Dictionary/DictionaryPage'));
const ScenarioWalkthrough = lazy(() => import('./components/Scenarios/ScenarioWalkthrough'));
const AiChatPage = lazy(() => import('./components/AI/AiChatPage'));
const LeaderboardPage = lazy(() => import('./components/Leaderboard/LeaderboardPage'));
const GuessRiskGame = lazy(() => import('./components/Games/GuessRiskGame'));
const BuildPolicyGame = lazy(() => import('./components/Games/BuildPolicyGame'));
const ClaimSimulatorGame = lazy(() => import('./components/Games/ClaimSimulatorGame'));
const DailyQuizGame = lazy(() => import('./components/Games/DailyQuizGame'));
const GamesHubPage = lazy(() => import('./components/Games/GamesHubPage'));
const ProfilePage = lazy(() => import('./components/Profile/ProfilePage'));
const CatchPoliciesGame = lazy(() => import('./components/Games/CatchPoliciesGame'));
const MemoryTermsGame = lazy(() => import('./components/Games/MemoryTermsGame'));
const LaneRushGame = lazy(() => import('./components/Games/LaneRushGame'));
const TermSnapGame = lazy(() => import('./components/Games/TermSnapGame'));
const InsuranceSorterGame = lazy(() => import('./components/Games/InsuranceSorterGame'));
const QuizBattleGame = lazy(() => import('./components/Games/QuizBattleGame'));
const RewardsPage = lazy(() => import('./components/Rewards/RewardsPage'));
const TelegramGuidePage = lazy(() => import('./components/Telegram/TelegramGuidePage'));
const ClaimDetectiveGame = lazy(() => import('./components/Games/ClaimDetectiveGame'));
const WowLabPage = lazy(() => import('./components/Wow/WowLabPage'));

/**
 * Тяжёлые экраны (игры, лаборатория, словарь и т.д.) подгружаются по маршруту —
 * меньше парсинга JS при первом заходе. TensorFlow по-прежнему только в WowLab
 * через динамические import() внутри страницы.
 */
export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoading message="Загружаем раздел…" />}>
          <Routes>
            <Route path="/login" element={<AuthPage />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/ai-chat" element={<Navigate to="/help" replace />} />
              <Route element={<Layout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/progress" element={<ProgressPage />} />
                <Route path="/dictionary" element={<DictionaryPage />} />
                <Route path="/games" element={<GamesHubPage />} />
                <Route path="/settings" element={<Navigate to="/profile?tab=settings" replace />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/rewards" element={<RewardsPage />} />
                <Route path="/telegram" element={<TelegramGuidePage />} />
                <Route path="/leaderboard" element={<LeaderboardPage />} />
                <Route path="/help" element={<AiChatPage />} />
                <Route path="/lab" element={<WowLabPage />} />
                <Route path="/wow-lab" element={<Navigate to="/lab" replace />} />
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
                <Route path="/game/claim-detective" element={<ClaimDetectiveGame />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AppProvider>
  );
}
