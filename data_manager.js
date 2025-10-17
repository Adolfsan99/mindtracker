const STORAGE_KEY = 'progressTrackerState';

/**
 * Calculates XP required for the next level based on the formula:
 * XP_needed_for_L(N+1) = XP_needed_for_L(N) + N + (N + 25)
 * Where N is the current level.
 * @param {number} level 
 * @returns {number} Total XP required for the start of that level.
 */
function calculateLevelXPThreshold(level) {
    if (level <= 1) return 0;
    let requiredXP = 0;
    for (let N = 1; N < level; N++) {
        const cost = 50 + (N - 1) * 25; // 50, 75, 100, 125...
        requiredXP += cost;
    }
    return requiredXP;
}

/**
 * Determines the current level based on total accumulated XP.
 * @param {number} currentXp 
 * @returns {{level: number, xpToNextLevel: number, totalXpForCurrentLevel: number}}
 */
function calculateLevel(currentXp) {
    let level = 1;
    let required = 0;

    while (true) {
        required = calculateLevelXPThreshold(level + 1);
        if (currentXp >= required) {
            level++;
        } else {
            const totalXpForCurrentLevel = calculateLevelXPThreshold(level);
            const xpNeededForNext = required - currentXp;
            return {
                level,
                xpToNextLevel: xpNeededForNext,
                totalXpForCurrentLevel
            };
        }
    }
}


function loadState() {
    try {
        const serializedState = localStorage.getItem(STORAGE_KEY);
        if (serializedState === null) {
            return {
                appTitle: "Mindful Tracker",
                items: [], // Mixed list of tasks and goals
                user: {
                    level: 1,
                    xp: 0
                }
            };
        }
        const state = JSON.parse(serializedState);
        if (!state.appTitle) {
            state.appTitle = "Mindful Tracker";
        }
        return state;
    } catch (e) {
        console.error("Error loading state:", e);
        // Return default state on parse error
        return {
            appTitle: "Mindful Tracker",
            items: [],
            user: {
                level: 1,
                xp: 0
            }
        };
    }
}

function saveState(state) {
    try {
        // Ensure we save a deep copy if state mutations are happening elsewhere, but since we manage it centrally in app.js, a direct save is fine.
        const serializedState = JSON.stringify(state);
        localStorage.setItem(STORAGE_KEY, serializedState);
        return true;
    } catch (e) {
        console.error("Error saving state:", e);
        return false;
    }
}

function resetScore(state) {
    // Note: We modify the passed state object reference
    state.user.xp = 0;
    // Recalculate level immediately
    const { level } = calculateLevel(0);
    state.user.level = level;

    return state;
}

function deleteAllData() {
    try {
        localStorage.removeItem(STORAGE_KEY);
        return true;
    } catch (e) {
        console.error("Error deleting data:", e);
        return false;
    }
}

export { loadState, saveState, calculateLevel, resetScore, deleteAllData };