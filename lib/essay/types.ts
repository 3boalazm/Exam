export type EssayDifficulty = "easy" | "medium" | "hard";

export interface EssayQuestion {
  id: string;
  topic: string;
  skill: string;
  difficulty: EssayDifficulty;
  points: number;
  text: string;
  answer: string;
}

export type EssayLayout = 1 | 2 | 4;

export interface EssayForm {
  /** رقم النموذج (1..45) */
  number: number;
  /** كود مختصر يُطبع على النموذج */
  code: string;
  questions: EssayQuestion[];
  totalPoints: number;
}

export interface EssayMeta {
  title: string;
  school: string;
  duration: string;
  instructions: string;
}

export interface EssayBuildOptions {
  count: number;
  perForm: number;
  topics: string[];
  difficulty: EssayDifficulty | "mixed";
  seed: number;
  shuffleQuestions: boolean;
}
