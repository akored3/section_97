import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shortId, getInitials, abbreviateAmount } from '../js/utils/format.js';

// ── shortId ────────────────────────────────────────────────

test('shortId truncates UUID and adds ORD- prefix', () => {
    assert.equal(shortId('abcdef12-3456-7890-1234-567890abcdef'), 'ORD-ABCDEF');
});

test('shortId uppercases hex characters', () => {
    assert.equal(shortId('a1b2c3d4-e5f6-7890-1234-567890abcdef'), 'ORD-A1B2C3');
});

test('shortId handles already-short input without crashing', () => {
    assert.equal(shortId('abc'), 'ORD-ABC');
});

// ── getInitials ────────────────────────────────────────────

test('getInitials takes first two words', () => {
    assert.equal(getInitials('Jide Akinbolaji'), 'JA');
});

test('getInitials caps at two letters even with more words', () => {
    assert.equal(getInitials('Jide Kayode Akinbolaji'), 'JK');
});

test('getInitials uppercases', () => {
    assert.equal(getInitials('jide akinbolaji'), 'JA');
});

test('getInitials handles single word', () => {
    assert.equal(getInitials('Walead'), 'W');
});

test('getInitials handles empty string', () => {
    assert.equal(getInitials(''), '?');
});

test('getInitials handles null/undefined', () => {
    assert.equal(getInitials(null), '?');
    assert.equal(getInitials(undefined), '?');
});

test('getInitials handles extra whitespace', () => {
    assert.equal(getInitials('  Jide   Akinbolaji  '), 'JA');
});

// ── abbreviateAmount ───────────────────────────────────────

test('abbreviateAmount returns raw value under 1000', () => {
    assert.equal(abbreviateAmount(0), '0');
    assert.equal(abbreviateAmount(500), '500');
    assert.equal(abbreviateAmount(999), '999');
});

test('abbreviateAmount formats thousands with k suffix', () => {
    assert.equal(abbreviateAmount(1_000), '1k');
    assert.equal(abbreviateAmount(12_340), '12k');
    assert.equal(abbreviateAmount(999_999), '1000k');
});

test('abbreviateAmount formats millions with M suffix', () => {
    assert.equal(abbreviateAmount(1_000_000), '1M');
    assert.equal(abbreviateAmount(1_500_000), '1.5M');
    assert.equal(abbreviateAmount(12_500_000), '12.5M');
});

test('abbreviateAmount drops trailing .0 on whole millions', () => {
    assert.equal(abbreviateAmount(2_000_000), '2M');
    assert.equal(abbreviateAmount(10_000_000), '10M');
});
