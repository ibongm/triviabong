import { getQuestionsByCategory, getAllQuestions } from '../data/questionsLoader';
import { getQuestionOptions, shuffleArray } from './questionUtils';

// 10 questions for the round + 1 pre-selected reserve for a sudden-death
// tiebreak (see firestore.rules' matches/{matchId} comment) - chosen ONCE
// by the host at match creation and written to Firestore as ids only, so
// both clients resolve the exact same question text locally from the
// already-bundled static JSON (see questionsLoader.js) with no extra
// network read. Picking live per-question-index would need the two clients
// to agree on an identical shuffle seed for no real benefit.
const QUESTIONS_TO_PICK = 11;

// Async because getQuestionsByCategory/getAllQuestions now lazy-load the
// question JSON on first call (see questionsLoader.js) - createMatch, the
// only caller, already awaits this.
export const pickMatchQuestionIds = async (categoryKey) => {
    const [rawPool, rawFallback] = await Promise.all([getQuestionsByCategory(categoryKey), getAllQuestions()]);
    const pool = rawPool.filter(q => q && q.id);
    const fallbackPool = rawFallback.filter(q => q && q.id);
    const combined = [...pool, ...fallbackPool];
    const uniqueMap = new Map(combined.map(q => [q.id, q]));
    const shuffled = shuffleArray(Array.from(uniqueMap.values()));
    return shuffled.slice(0, QUESTIONS_TO_PICK).map(q => q.id);
};

// Resolves a match's stored question ids back to full question objects
// (text/answers) from the same bundled JSON both clients already have.
// Looks up against the full aggregate pool rather than just the match's
// category, since Opće znanje matches store ids that can come from any
// category (see CLAUDE.md's aggregate-category note) and a raw category
// lookup would miss them. Async for the same reason as pickMatchQuestionIds
// above - MatchView.jsx awaits this in an effect rather than a render-path
// useMemo (question data is no longer synchronously available).
export const resolveMatchQuestions = async (questionIds, _categoryKey) => {
    const pool = await getAllQuestions();
    const byId = new Map(pool.map(q => [q.id, q]));
    return questionIds.map(id => byId.get(id)).filter(Boolean);
};

// Deterministic string -> 32-bit int hash (djb2 variant) + mulberry32 PRNG,
// same construction as dailySeed.js's getDailyChallengeQuestions - reused
// here (not imported, since dailySeed.js doesn't export the pieces) for a
// different problem: shuffleArray's Math.random() ordering would let each
// client see the SAME question's answer options in a DIFFERENT order, so
// the optionIndex (0-3) each client writes to matches/{matchId} wouldn't
// mean the same physical answer to both players - a fairness bug, not just
// a cosmetic one. Seeding on matchId+questionId makes both clients compute
// the identical option order locally, with nothing extra written to
// Firestore.
const hashStringToSeed = (str) => {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
    }
    return hash >>> 0;
};

const mulberry32 = (seed) => {
    let t = seed;
    return () => {
        t |= 0;
        t = (t + 0x6D2B79F5) | 0;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
};

const seededShuffle = (array, rand) => {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
};

// Same shuffled option order for every caller given the same
// (matchId, question.id) pair - see the comment above for why this can't
// just be questionUtils.js's shuffleArray.
export const getMatchQuestionOptions = (matchId, question) => {
    if (!question) return [];
    const rand = mulberry32(hashStringToSeed(`${matchId}_${question.id}`));
    return seededShuffle(getQuestionOptions(question), rand);
};

export const isMatchAnswerCorrect = (matchId, question, optionIndex) => {
    if (!question || optionIndex == null) return false;
    const options = getMatchQuestionOptions(matchId, question);
    const correct = question.correct_answer || question.correctAnswer;
    return options[optionIndex] === correct;
};
