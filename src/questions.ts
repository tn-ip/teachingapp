import { questionById as bankQuestionById, type Question } from "./bank";
import { generatedById } from "./drillPools";

/** A real Paper 2 question, or a generated practice item when the id starts with `wqg-`. */
export function questionById(id: string): Question | undefined {
  return bankQuestionById(id) ?? generatedById(id);
}
