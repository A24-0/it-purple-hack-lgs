import QuizGame from './QuizGame';
import { claimCards } from '../../data/mockData';

export default function ClaimSimulatorGame() {
  return (
    <QuizGame
      title="Симулятор убытка"
      cards={claimCards}
      gameId="claim-simulator"
      choicesLabel="Что правильнее сделать?"
    />
  );
}
