import QuizGame from './QuizGame';
import { dailyQuizCards } from '../../data/mockData';

export default function DailyQuizGame() {
  return (
    <QuizGame
      title="Ежедневный квиз"
      cards={dailyQuizCards}
      gameId="daily-quiz"
      choicesLabel="Быстрый ответ — закрепи знание!"
    />
  );
}
