// src/leaderboard.js

const LEADERBOARD_KEY = 'triviabong_leaderboards_v1';

/**
 * Retrieves the leaderboard array for a specific category.
 * @param {string} category 
 * @returns {Array<{nickname: string, score: number, date: string}>}
 */
export const getLeaderboard = (category = 'General') => {
    try {
        const data = localStorage.getItem(LEADERBOARD_KEY);
        const leaderboards = data ? JSON.parse(data) : {};
        return leaderboards[category] || [];
    } catch (error) {
        console.error('Failed to fetch leaderboard from localStorage:', error);
        return [];
    }
};

/**
 * Saves a new score to a category's leaderboard if eligible.
 * Keeps only the Top 10 highest scores.
 * @param {string} category 
 * @param {string} nickname 
 * @param {number} score 
 */
export const saveHighScore = (category = 'General', nickname, score) => {
    if (!nickname || score <= 0) return;

    try {
        const data = localStorage.getItem(LEADERBOARD_KEY);
        const leaderboards = data ? JSON.parse(data) : {};
        const categoryScores = leaderboards[category] || [];

        const newEntry = {
            nickname: nickname.trim(),
            score,
            date: new Date().toLocaleDateString()
        };

        // Add entry, sort descending by score, keep top 10
        const updatedScores = [...categoryScores, newEntry]
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);

        leaderboards[category] = updatedScores;
        localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(leaderboards));
    } catch (error) {
        console.error('Failed to save score to localStorage:', error);
    }
};