// Shared rank/level system — used by profilePage.js and leaderboardPage.js

// ── Level / XP system ──
// ₦25,000 spent = 1 XP. Levels use quadratic thresholds.
export const LEVEL_THRESHOLDS = [0, 2, 5, 10, 18, 30, 48, 72, 105, 150, 210];

export function calculateLevel(totalSpent) {
    const xp = Math.floor(totalSpent / 25000);
    let level = 1;
    let xpForNext = LEVEL_THRESHOLDS[1] || 5;
    let xpForCurrent = 0;

    for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
        if (xp >= LEVEL_THRESHOLDS[i]) {
            level = i + 1;
            xpForCurrent = LEVEL_THRESHOLDS[i];
            xpForNext = LEVEL_THRESHOLDS[i + 1] || LEVEL_THRESHOLDS[i] + 100;
        } else {
            break;
        }
    }

    const xpInLevel = xp - xpForCurrent;
    const xpNeeded = xpForNext - xpForCurrent;
    const percent = Math.min((xpInLevel / xpNeeded) * 100, 100);

    return { level, xp, xpForNext, percent };
}

// ── Rank badge based on level ──
// Metallic progression: grey → bronze → silver → gold → diamond → legendary
export const RANK_DATA = [
    { name: 'NEWBIE',          color: '#4a9eff' },  // LVL 1 — blue
    { name: 'FIT_ROOKIE',      color: '#22c55e' },  // LVL 2 — green
    { name: 'STREET_STYLER',   color: '#cd7f32' },  // LVL 3 — bronze
    { name: 'NEON_DRIPPER',    color: '#e86e2a' },  // LVL 4 — copper
    { name: 'FIT_COMMANDER',   color: '#b0b0b0' },  // LVL 5 — silver
    { name: 'CYBER_SWAGLORD',  color: '#a78bfa' },  // LVL 6 — purple
    { name: 'DRIP_ARCHITECT',  color: '#ffd700' },  // LVL 7 — gold
    { name: 'OUTFIT_WARLORD',  color: '#ff6b35' },  // LVL 8 — flame
    { name: 'FITBOSS_2099',    color: '#b9f2ff' },  // LVL 9 — diamond
    { name: 'GODOFDRIP.EXE',   color: '#ff44cc' },  // LVL 10+ — legendary
];

export function getRank(level) {
    return RANK_DATA[Math.min(level, 10) - 1] || RANK_DATA[0];
}
