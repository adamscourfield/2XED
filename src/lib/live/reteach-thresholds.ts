// Fraction of assigned students in Lane 3 that triggers a reteach alert.
// Two tiers: when all Lane 3 failures are expected (prior weak skill state)
// the bar is higher; unexpected failures warrant an earlier alert.
export const RETEACH_THRESHOLD_ALL_EXPECTED = 0.50;
export const RETEACH_THRESHOLD_HAS_UNEXPECTED = 0.35;
