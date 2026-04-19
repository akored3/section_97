// Pure formatting helpers. No DOM, no network, no module state — safe to unit test.

// ── Order ID display form ──
// UUIDs are long and ugly in the admin UI. Truncate the first 6 hex chars,
// uppercase, prefix with "ORD-". Collision risk is negligible within one admin session.
export function shortId(uuid) {
    return `ORD-${uuid.slice(0, 6).toUpperCase()}`;
}

// ── Avatar initials ──
// "Jide Akinbolaji" → "JA". "Walead" → "W". "" → "?".
export function getInitials(name) {
    return (name || '').split(/\s+/).map(s => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
}

// ── Compact amount for tight spaces (leaderboard, badges) ──
// 1_500_000 → "1.5M", 12_340 → "12k", 850 → "850"
export function abbreviateAmount(amount) {
    if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (amount >= 1_000) return `${Math.round(amount / 1_000)}k`;
    return String(amount);
}
