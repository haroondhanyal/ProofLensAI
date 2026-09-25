# Risk scoring

Each local finding contains a source, severity, type, explanation and configured weight. The score is the capped sum of weights (0–100), categorized by `RISK_CAUTION_THRESHOLD`, `RISK_HIGH_THRESHOLD`, and `RISK_CRITICAL_THRESHOLD` (defaults 30/55/75). Confidence is a separate description based on the number of weighted signals. Neither value is a probability. Rule weights are an initial baseline and need validation before production use.
