import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateLevel, getRank, LEVEL_THRESHOLDS, RANK_DATA } from '../js/data/ranks.js';

// XP formula: ₦25,000 spent = 1 XP. Thresholds: [0, 2, 5, 10, 18, 30, 48, 72, 105, 150, 210]
// So level 1 starts at 0 XP, level 2 at 2 XP = ₦50,000, level 3 at 5 XP = ₦125,000, etc.

// ── calculateLevel ─────────────────────────────────────────

test('calculateLevel: brand new user at 0 spend is level 1', () => {
    const result = calculateLevel(0);
    assert.equal(result.level, 1);
    assert.equal(result.xp, 0);
    assert.equal(result.percent, 0);
});

test('calculateLevel: below level 2 threshold stays at level 1', () => {
    // 1 XP = ₦25,000 (still under the 2-XP level-2 threshold)
    assert.equal(calculateLevel(25_000).level, 1);
    assert.equal(calculateLevel(49_999).level, 1);
});

test('calculateLevel: hitting exactly the level-2 XP threshold bumps level', () => {
    // 2 XP = ₦50,000 → level 2
    assert.equal(calculateLevel(50_000).level, 2);
});

test('calculateLevel: level-3 threshold at 5 XP = ₦125,000', () => {
    assert.equal(calculateLevel(125_000).level, 3);
    assert.equal(calculateLevel(124_999).level, 2);
});

test('calculateLevel: mid-tier spend lands on correct level', () => {
    // 18 XP = ₦450,000 → level 5
    assert.equal(calculateLevel(450_000).level, 5);
    // 48 XP = ₦1,200,000 → level 7
    assert.equal(calculateLevel(1_200_000).level, 7);
});

test('calculateLevel: very high spend caps out at max tier', () => {
    // 210 XP = ₦5,250,000 → level 11 (top of thresholds list)
    const result = calculateLevel(5_250_000);
    assert.equal(result.level, LEVEL_THRESHOLDS.length);
});

test('calculateLevel: percent is 0 when just entering a level', () => {
    // Exactly at level-2 threshold → 0% into level 2
    assert.equal(calculateLevel(50_000).percent, 0);
});

test('calculateLevel: percent reaches 50 exactly halfway to next level', () => {
    // Level 4 spans XP 10→18 (span 8, even). Midpoint = 14 XP = ₦350,000.
    // Using an even-span level so the floor(spent / 25000) math lands cleanly on 50%.
    const result = calculateLevel(350_000);
    assert.equal(result.level, 4);
    assert.equal(result.percent, 50);
});

test('calculateLevel: percent caps at 100', () => {
    const result = calculateLevel(100_000_000);
    assert.ok(result.percent <= 100);
});

// ── getRank ────────────────────────────────────────────────

test('getRank: level 1 is NEWBIE', () => {
    assert.equal(getRank(1).name, 'NEWBIE');
});

test('getRank: level 10 is GODOFDRIP.EXE', () => {
    assert.equal(getRank(10).name, 'GODOFDRIP.EXE');
});

test('getRank: levels past 10 still return top rank (not undefined)', () => {
    assert.equal(getRank(15).name, 'GODOFDRIP.EXE');
    assert.equal(getRank(100).name, 'GODOFDRIP.EXE');
});

test('getRank: every rank has a name and a color', () => {
    RANK_DATA.forEach((rank, i) => {
        assert.ok(rank.name, `rank ${i} missing name`);
        assert.match(rank.color, /^#[0-9a-f]{6}$/i, `rank ${i} color not a hex string`);
    });
});
