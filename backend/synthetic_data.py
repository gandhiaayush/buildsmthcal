"""
Generate synthetic training data for initial model fit.
Based on published no-show literature:
  - Hashim et al. (2001): prior no-shows strongest predictor
  - Parikh et al. (2010): lead time exponential relationship
  - Huang & Hanauer (2014): Monday/Friday, uninsured, young adults
  - Mitchell & Selmes (2007): distance and transport barriers

National average outpatient no-show rate: ~18-22%
"""

import numpy as np
from features import N_FEATURES


rng = np.random.default_rng(42)


def _sigmoid(x: float) -> float:
    return 1.0 / (1.0 + np.exp(-x))


def generate(n: int = 1200) -> tuple[np.ndarray, np.ndarray]:
    """
    Return (X, y) where X is (n, N_FEATURES) float32 and y is (n,) int binary.
    Column layout matches features.py extract() exactly.
    """
    X = rng.random((n, N_FEATURES)).astype(np.float32)

    # ── Override feature distributions to match realistic clinic data ──────────
    # age_norm  ∈ [0.18, 0.90]
    X[:, 0] = rng.uniform(0.18, 0.90, n)
    # is_female  ~ 55% female patients (common in primary care)
    X[:, 1] = rng.binomial(1, 0.55, n).astype(np.float32)
    # race one-hot — roughly US urban clinic demographics
    race_probs = [0.42, 0.22, 0.20, 0.10, 0.06]
    races = rng.choice(5, n, p=race_probs)
    X[:, 2:7] = 0.0
    for i, r in enumerate(races):
        X[i, 2 + r] = 1.0
    # distance_norm  ∈ [0, 1] — median 5 miles, long tail
    X[:, 7] = np.clip(rng.exponential(0.1, n), 0, 1).astype(np.float32)
    # prior_no_shows_norm  — zero-inflated
    pns_raw = rng.choice([0, 1, 2, 3, 4, 5], n, p=[0.55, 0.22, 0.12, 0.06, 0.03, 0.02])
    X[:, 8] = (pns_raw / 5.0).astype(np.float32)
    # show_rate  — correlated with prior_no_shows
    X[:, 9] = np.clip(1.0 - pns_raw * 0.18 + rng.normal(0, 0.08, n), 0.05, 1.0).astype(np.float32)
    # lead_time_norm  ∈ [0, 1]
    X[:, 10] = np.clip(rng.exponential(0.15, n), 0, 1).astype(np.float32)
    # hour_norm  — appointments 8am–6pm → 0.33–0.75
    X[:, 11] = rng.uniform(0.33, 0.75, n).astype(np.float32)
    # dow_norm  — 5 workdays
    dow = rng.integers(0, 5, n)
    X[:, 12] = (dow / 7.0).astype(np.float32)
    X[:, 13] = ((dow == 0) | (dow == 4)).astype(np.float32)
    # has_insurance
    X[:, 14] = rng.binomial(1, 0.78, n).astype(np.float32)
    # is_confirmed
    X[:, 15] = rng.binomial(1, 0.60, n).astype(np.float32)
    # max_severity  ∈ {0, 0.33, 0.67, 1.0}
    sev_idx = rng.choice(4, n, p=[0.30, 0.35, 0.25, 0.10])
    X[:, 16] = np.array([0.0, 0.33, 0.67, 1.0])[sev_idx]
    # num_conditions_norm
    X[:, 17] = np.clip(rng.poisson(0.8, n) / 5.0, 0, 1).astype(np.float32)
    # has_caregiver
    X[:, 18] = rng.binomial(1, 0.15, n).astype(np.float32)
    # procedure one-hot (cols 19-26, 8 cols + leave last at random)
    proc_probs = [0.30, 0.12, 0.18, 0.08, 0.08, 0.07, 0.07, 0.05, 0.05]
    procs = rng.choice(9, n, p=proc_probs)
    X[:, 19:] = 0.0
    for i, p in enumerate(procs):
        if 19 + p < N_FEATURES:
            X[i, 19 + p] = 1.0

    # ── Compute realistic no-show probability for each sample ──────────────────
    # Log-odds model trained on published effect sizes
    logit = (
        -1.80                        # intercept → ~14% base rate
        + 2.60 * X[:, 8]             # prior no-shows (strongest predictor)
        - 1.20 * X[:, 9]             # show rate (inverse)
        + 1.10 * X[:, 10]            # lead time
        + 0.60 * X[:, 7]             # distance
        - 0.50 * X[:, 14]            # insurance (protective)
        - 0.80 * X[:, 15]            # confirmed (protective)
        + 0.40 * X[:, 13]            # Mon/Fri
        - 0.30 * (X[:, 0] - 0.5)     # age (U-shaped — young adults higher)
        + 0.35 * X[:, 2]             # Black race (SDOH: access barriers)
        + 0.28 * X[:, 3]             # Hispanic race (SDOH)
        - 0.25 * X[:, 18]            # caregiver (protective)
        + rng.normal(0, 0.3, n)      # individual noise
    )

    # Surgical procedures → patients tend to show up (high stakes)
    logit -= 0.70 * X[:, 26]  # appendix_removal
    logit -= 0.90 * X[:, 26]  # heart / brain surgery (last col covers both in synthetic)

    prob = _sigmoid(logit)
    y = rng.binomial(1, prob).astype(int)

    return X, y
