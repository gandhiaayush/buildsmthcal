"""
PPO-enhanced risk scoring model.

Architecture:
  ┌─────────────────────────────────────────────────────────┐
  │  Base model: GradientBoostingClassifier                 │
  │  (pre-trained on synthetic + real outcomes)              │
  │                                                         │
  │  PPO adapter: linear (alpha, beta) on log-odds          │
  │    adapted_prob = σ(alpha + beta * logit(base_prob))    │
  │                                                         │
  │  Online update: PPO clipped objective on (α, β)         │
  │    r(θ) = π_new(a|s) / π_old(a|s)                      │
  │    L_CLIP = E[min(r·A, clip(r, 1-ε, 1+ε)·A)]           │
  └─────────────────────────────────────────────────────────┘

The PPO layer learns from every logged outcome via /update-outcome.
"""

import os
import json
import numpy as np
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import roc_auc_score
from typing import Any

STATE_FILE = os.path.join(os.path.dirname(__file__), "model_state.json")

CLIP_EPS = 0.20          # PPO clip ratio
LR_ALPHA = 0.08          # learning rate for intercept
LR_BETA  = 0.04          # learning rate for scale
GAMMA    = 0.95          # discount (unused for single-step, kept for API parity)
BUFFER_MAX = 256         # max PPO experience buffer size


def _sigmoid(x: float) -> float:
    return 1.0 / (1.0 + np.exp(-np.clip(x, -30, 30)))


def _logit(p: float) -> float:
    p = np.clip(p, 1e-6, 1 - 1e-6)
    return float(np.log(p / (1 - p)))


class PPORiskModel:
    """Gradient boosting base + PPO online adapter."""

    def __init__(self) -> None:
        self.base: GradientBoostingClassifier = GradientBoostingClassifier(
            n_estimators=200,
            max_depth=4,
            learning_rate=0.05,
            subsample=0.8,
            random_state=42,
        )
        self.scaler = StandardScaler()
        self.is_fitted = False

        # PPO adapter parameters (per-class log-odds shift)
        self.alpha: float = 0.0   # intercept correction
        self.beta:  float = 1.0   # scale correction

        # Experience replay buffer: (feature_vec, old_prob, action, reward)
        self.buffer: list[tuple] = []

        # Metrics
        self.total_updates: int = 0
        self.outcome_log: list[dict] = []   # {pred, actual, correct}

        self._load_state()

    # ─── Training ────────────────────────────────────────────────────────────

    def fit(self, X: np.ndarray, y: np.ndarray) -> None:
        X_s = self.scaler.fit_transform(X)
        self.base.fit(X_s, y)
        self.is_fitted = True
        self._save_state()

    # ─── Inference ───────────────────────────────────────────────────────────

    def predict_proba(self, x: np.ndarray) -> float:
        """Return P(no-show) ∈ [0, 1]."""
        if not self.is_fitted:
            return 0.35   # prior before any training
        x_s = self.scaler.transform(x.reshape(1, -1))
        base_prob = float(self.base.predict_proba(x_s)[0, 1])
        adapted_logit = self.alpha + self.beta * _logit(base_prob)
        return float(_sigmoid(adapted_logit))

    def predict_batch(self, X: np.ndarray) -> np.ndarray:
        if not self.is_fitted:
            return np.full(len(X), 0.35, dtype=np.float32)
        X_s = self.scaler.transform(X)
        base_probs = self.base.predict_proba(X_s)[:, 1]
        logits = self.alpha + self.beta * np.array([_logit(p) for p in base_probs])
        return np.array([_sigmoid(l) for l in logits], dtype=np.float32)

    # ─── PPO online update ────────────────────────────────────────────────────

    def record_outcome(
        self,
        x: np.ndarray,
        old_prob: float,
        actual_no_show: bool,
    ) -> dict[str, Any]:
        """
        Called when a patient's actual outcome is known.
        Computes reward, stores in buffer, runs PPO mini-batch update.

        Reward shaping (asymmetric — missing a no-show is worse):
          True positive  (predicted ≥0.5, actually no-showed): +1.0
          True negative  (predicted <0.5, actually showed):    +0.5
          False negative (predicted <0.5, actually no-showed): -2.0  ← worst
          False positive (predicted ≥0.5, actually showed):   -0.5
        """
        predicted_high = old_prob >= 0.5
        correct = predicted_high == actual_no_show

        if actual_no_show and predicted_high:
            reward = +1.0
        elif not actual_no_show and not predicted_high:
            reward = +0.5
        elif actual_no_show and not predicted_high:
            reward = -2.0   # false negative — highest cost
        else:
            reward = -0.5   # false positive

        # advantage (simplified — single-step, no value baseline needed)
        advantage = reward

        self.buffer.append((x, old_prob, int(actual_no_show), advantage))
        if len(self.buffer) > BUFFER_MAX:
            self.buffer.pop(0)

        self.outcome_log.append({
            "predicted": round(old_prob, 3),
            "actual_no_show": actual_no_show,
            "correct": correct,
            "reward": reward,
        })

        result = self._ppo_update()
        self.total_updates += 1
        self._save_state()
        return result

    def _ppo_update(self) -> dict[str, Any]:
        """Run one PPO mini-batch over the full experience buffer."""
        if len(self.buffer) < 4:
            return {"skipped": True, "reason": "buffer too small"}

        d_alpha = 0.0
        d_beta  = 0.0

        for (x, old_prob, action, advantage) in self.buffer:
            # Current policy probability under adapter
            if self.is_fitted:
                x_s = self.scaler.transform(x.reshape(1, -1))
                base_prob = float(self.base.predict_proba(x_s)[0, 1])
            else:
                base_prob = 0.35
            base_logit = _logit(base_prob)
            adapted_logit = self.alpha + self.beta * base_logit
            new_prob = _sigmoid(adapted_logit)

            # PPO ratio
            old_p = old_prob if action == 1 else (1 - old_prob)
            new_p = new_prob if action == 1 else (1 - new_prob)
            ratio = new_p / (old_p + 1e-8)
            clipped = float(np.clip(ratio, 1 - CLIP_EPS, 1 + CLIP_EPS))

            eff_ratio = min(ratio, clipped) if advantage >= 0 else max(ratio, clipped)

            # d/d_logit [sigmoid(logit)] = sigmoid * (1 - sigmoid)
            d_sigma = new_prob * (1 - new_prob)

            # Gradient w.r.t. adapted_logit
            grad_logit = advantage * eff_ratio * d_sigma

            # Chain to adapter params
            d_alpha += grad_logit * 1.0           # ∂logit/∂alpha = 1
            d_beta  += grad_logit * base_logit    # ∂logit/∂beta = base_logit

        n = len(self.buffer)
        self.alpha = float(np.clip(self.alpha + LR_ALPHA * d_alpha / n, -3.0, 3.0))
        self.beta  = float(np.clip(self.beta  + LR_BETA  * d_beta  / n,  0.1, 3.0))

        return {
            "alpha": round(self.alpha, 4),
            "beta":  round(self.beta,  4),
            "buffer_size": n,
            "total_updates": self.total_updates,
        }

    # ─── Metrics ─────────────────────────────────────────────────────────────

    def metrics(self) -> dict[str, Any]:
        if not self.outcome_log:
            return {"message": "No outcomes logged yet."}
        preds   = [o["predicted"]     for o in self.outcome_log]
        actuals = [int(o["actual_no_show"]) for o in self.outcome_log]
        correct = [o["correct"]       for o in self.outcome_log]
        n = len(self.outcome_log)
        acc = sum(correct) / n

        auc = None
        if len(set(actuals)) > 1:
            try:
                auc = round(roc_auc_score(actuals, preds), 3)
            except Exception:
                pass

        return {
            "n_outcomes": n,
            "accuracy": round(acc, 3),
            "auc": auc,
            "ppo_alpha": round(self.alpha, 4),
            "ppo_beta":  round(self.beta,  4),
            "ppo_updates": self.total_updates,
            "no_show_rate": round(sum(actuals) / max(n, 1), 3),
            "false_negative_rate": round(
                sum(1 for p, a in zip(preds, actuals) if p < 0.5 and a == 1) / max(sum(actuals), 1), 3
            ),
        }

    def feature_importance(self) -> list[dict]:
        if not self.is_fitted:
            return []
        labels = [
            "Age", "Female", "Race: White", "Race: Black", "Race: Hispanic",
            "Race: Asian", "Race: Other", "Distance", "Prior No-Shows",
            "Show Rate", "Lead Time", "Appt Hour", "Day of Week", "Mon/Fri",
            "Has Insurance", "Confirmed", "Max Severity", "# Conditions",
            "Has Caregiver", "Proc: Ultrasound", "Proc: Blood Work",
            "Proc: Consultation", "Proc: Physical", "Proc: MRI", "Proc: CT",
            "Proc: Echo", "Proc: Appendix",
        ]
        importances = self.base.feature_importances_
        return sorted(
            [{"feature": l, "importance": round(float(v), 4)}
             for l, v in zip(labels, importances)],
            key=lambda x: x["importance"], reverse=True,
        )

    # ─── Persistence ─────────────────────────────────────────────────────────

    def _save_state(self) -> None:
        state = {
            "alpha": self.alpha,
            "beta":  self.beta,
            "total_updates": self.total_updates,
            "outcome_log": self.outcome_log[-200:],   # keep last 200
        }
        with open(STATE_FILE, "w") as f:
            json.dump(state, f)

    def _load_state(self) -> None:
        if not os.path.exists(STATE_FILE):
            return
        try:
            with open(STATE_FILE) as f:
                state = json.load(f)
            self.alpha = float(state.get("alpha", 0.0))
            self.beta  = float(state.get("beta",  1.0))
            self.total_updates = int(state.get("total_updates", 0))
            self.outcome_log = state.get("outcome_log", [])
        except Exception:
            pass   # corrupt state — start fresh
