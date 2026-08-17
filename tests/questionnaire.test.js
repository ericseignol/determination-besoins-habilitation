import { describe, expect, it } from "vitest";
import { FIN, questions } from "../src/data/questions.js";
import {
  addUniqueRecommendation,
  buildAnswer,
  getOrganizationSlug,
  splitEmployeeNames,
} from "../src/lib/questionnaire.js";

function followPath(optionIndexes) {
  let currentQuestion = 0;
  let recommendations = [];

  for (const optionIndex of optionIndexes) {
    const answer = buildAnswer(currentQuestion, optionIndex);
    recommendations = addUniqueRecommendation(recommendations, answer.recommendation);
    currentQuestion = answer.nextQuestion;
  }

  return { currentQuestion, recommendations };
}

describe("questionnaire data", () => {
  it("keeps every option, result, affirmation and next step aligned", () => {
    for (const question of questions) {
      expect(question.options).toHaveLength(question.results.length);
      expect(question.options).toHaveLength(question.affirmations.length);
      expect(question.options).toHaveLength(question.next.length);

      for (const nextQuestion of question.next) {
        expect(nextQuestion === FIN || questions[nextQuestion]).toBeTruthy();
      }
    }
  });

  it("preserves the non-electrician low-voltage path", () => {
    const path = followPath([1, 1, 1, 1, 1, 1, 1, 1]);
    expect(path.currentQuestion).toBe(FIN);
    expect(path.recommendations).toEqual(["B0"]);
  });

  it("preserves a representative BT electrician path", () => {
    const path = followPath([0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1]);
    expect(path.currentQuestion).toBe(FIN);
    expect(path.recommendations).toEqual(["B1V", "BR", "BE manœuvre", "BC"]);
  });

  it("does not duplicate the same recommendation", () => {
    expect(addUniqueRecommendation(["H0"], "H0")).toEqual(["H0"]);
  });
});

describe("public routing helpers", () => {
  it("extracts the tenant slug from the public route", () => {
    expect(getOrganizationSlug("/q/asfor")).toBe("asfor");
    expect(getOrganizationSlug("/q/centre-test/")).toBe("centre-test");
  });

  it("uses a configured fallback on the root route", () => {
    expect(getOrganizationSlug("/", "asfor")).toBe("asfor");
  });

  it("normalizes employee names", () => {
    expect(splitEmployeeNames(" Marie Dupont, Jules Martin, ")).toEqual([
      "Marie Dupont",
      "Jules Martin",
    ]);
  });
});
