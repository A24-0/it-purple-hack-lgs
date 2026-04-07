import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
import GuessRiskGame from './components/Games/GuessRiskGame';
import BuildPolicyGame from './components/Games/BuildPolicyGame';
import ProfilePage from './components/Profile/ProfilePage';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/dictionary" element={<DictionaryPage />} />
          </Route>

          <Route path="/login" element={<AuthPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/scenario/:id" element={<ScenarioWalkthrough />} />
          <Route path="/ai-chat" element={<AiChatPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/game/guess-risk" element={<GuessRiskGame />} />
          <Route path="/game/build-policy" element={<BuildPolicyGame />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
