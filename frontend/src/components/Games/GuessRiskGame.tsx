import QuizGame from './QuizGame';
import { riskCards } from '../../data/mockData';

export default function GuessRiskGame() {
  return (
    <QuizGame
      title="Угадай риск"
      cards={riskCards}
      gameId="guess-risk"
      choicesLabel="Какой вид страхования поможет?"
    />
  );
}
