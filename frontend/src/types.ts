export interface ScenarioChoice {
  id: string;
  text: string;
  consequence: string;
  isOptimal: boolean;
  xpDelta: number;
  coinsDelta: number;
  nextStepId?: string;
}

export interface ScenarioStep {
  id: string;
  situation: string;
  choices: ScenarioChoice[];
  isTerminal?: boolean;
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  icon: string;
  maxXp: number;
  steps: ScenarioStep[];
}

export interface UserProgress {
  xp: number;
  coins: number;
  todayXp: number;
  level: number;
  streak: number;
  totalAnswers: number;
  correctAnswers: number;
  completedScenarioIds: string[];
}

export interface Achievement {
  id: string;
  icon: string;
  title: string;
  description: string;
  completed: boolean;
}

export interface DictionaryTerm {
  id: string;
  term: string;
  definition: string;
  category: string;
  examples?: string[];
  relatedTerms?: string[];
}

export interface RiskCard {
  id: string;
  situation: string;
  options: { id: string; text: string; isCorrect: boolean }[];
  explanation: string;
}

export interface PolicyOption {
  id: string;
  name: string;
  description: string;
  cost: number;
  coveragePoints: number;
}

export interface PolicyChallenge {
  id: string;
  title: string;
  description: string;
  budget: number;
  targetCoverage: number;
  options: PolicyOption[];
}
