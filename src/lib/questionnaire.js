import { FIN, questions } from "../data/questions.js";

export function getOrganizationSlug(pathname, fallbackSlug = "") {
  const match = pathname.match(/^\/q\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/i);
  return (match?.[1] || fallbackSlug).toLowerCase();
}

export function buildAnswer(questionIndex, optionIndex) {
  const question = questions[questionIndex];

  if (!question || optionIndex < 0 || optionIndex >= question.options.length) {
    throw new Error("Réponse de questionnaire invalide.");
  }

  return {
    questionId: question.id,
    question: question.question,
    answer: question.options[optionIndex],
    affirmation: question.affirmations[optionIndex],
    recommendation: question.results[optionIndex].trim(),
    nextQuestion: question.next[optionIndex],
  };
}

export function addUniqueRecommendation(recommendations, recommendation) {
  if (!recommendation || recommendations.includes(recommendation)) {
    return recommendations;
  }

  return [...recommendations, recommendation];
}

export function isQuestionnaireComplete(nextQuestion) {
  return nextQuestion === FIN;
}

export function splitEmployeeNames(value) {
  return value
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
}
