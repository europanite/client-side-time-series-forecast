# General time-series forecast strategies

This project is a **general purpose** in-browser time-series forecasting demo.
Stocks are one difficult retrospective test dataset, **not** the target task.

## Supervised learning and leakage

`X[t]` is constructed solely from observations `0..t-1`, and `y[t]` is the
label supplied at fit time. Having `y[t]` as the training label is **normal**;
using `y[t]` inside `X[t]` is leakage. Training-time and true future inference
must use the same feature conventions. `buildFeatures()` now includes the
**target's own prior lags and rolling statistics**, even for univariate data.
Tests mutate all future observations and check that past-origin inputs are
unchanged.

## Strategies / model compatibility

| Model | Recursive | Direct 16 horizons | Joint multiseries |
| --- | --- | --- | --- |
| XGBoost | yes | yes (16 fitted models) | no |
| XGBoost Bagging ×2 | yes (2 fitted models) | yes (32 fitted models) | no |
| LightGBM | yes | yes (16 fitted models) | no |
| LightGBM Bagging ×2 | yes (2 fitted models) | yes (32 fitted models) | no |
| Ridge | yes | yes (16 fitted models) | no |
| VARMA experimental | internally recursive over ALL modeled series | no | yes |
| Chronos-2 | no | pretrained direct 16-step | selected target only in current UI |

**Recursive:** fit one model to predict t+1, then iteratively append the predicted
target. Unknown future peer values are continued via a heuristic, NOT observed.
**Direct:** fit 16 separate, horizon-aligned supervised models, all using the
same last REAL observed features (no hypothetical peer values). CPU/memory
cost is ~16 fitted models, or 32 for either bagging variant. This is the **default** for XGBoost, XGBoost Bagging ×2, LightGBM, LightGBM Bagging ×2,
and Ridge. Recursive forecasting is available under **Settings → Advanced
forecasting → Forecast strategy**. **Joint:** VARMA fits and evolves all series
simultaneously, using a linear vector autoregression approximation. Joint
series vs direct multi-horizon are separate design dimensions.

XGBoost Bagging ×2 and LightGBM Bagging ×2 draw two reproducible bootstrap
samples (with replacement) from the supervised training pairs and average the
two predictions. Both variants use the same resampling seeds as one another
and retain their respective single-model features, without new dependencies
or a backend.
No forced seasonal blend is applied to the supervised forecasts.
VARMA separately retains its own optional stabilization setting, disabled by
default. Historical blended scores are not directly comparable with this
protocol.

## Existing stock benchmark (example dataset)

The existing browser-based stock benchmark remains the sole automated benchmark.
It measures 50 fixed-origin 16-step forecasts and 800 rolling one-step
forecasts from the real app models, with no fixed seasonal blend.
Run it with the existing `docker-compose.frontend-evaluation.yml`.

**Scope:** The scheduled stock benchmark continues to evaluate the existing
recursive XGBoost/LightGBM/Ridge and joint VARMA / pretrained Chronos-2 modes.
The scheduled stock benchmark retains the original Recursive model
results for continuity. The optional Direct comparison uses the same 5 stock
groups, 256 prior sessions, two disjoint 16-session holdouts, and real browser
models for XGBoost, LightGBM and Ridge. It compares 3 methods on the **same
prediction dates**: Recursive price, Direct price, and Direct cumulative log
return, plus the last-known-close baseline. See
[`FRONTEND_STOCK_EVALUATION.md`](FRONTEND_STOCK_EVALUATION.md).

For Direct log returns, each horizon `h` is trained to estimate
`ln(y[t+h-1] / y[t-1])`. Inference returns
`y[last_observed] * exp(predicted_log_return_h)`. This requires strictly
positive target values. The output is converted to original price units and
scored with the same MAE/MAPE as the price-level variants. The log-return
feature is an **advanced setting**; generic time series with zeros/negatives
remain supported by the default direct price-level target.

No synthetic dataset generator, generic benchmark job, or extra scheduled
workflow is installed by this patch.

## Important limitations

The time-index and fixed Fourier periods are generic heuristics, not inferred
from sampling frequency. On irregular timestamps there is no time-aware resampling.
Many models still use horizon-independent feature engineering. Data should be
sorted and sampled consistently, and supervised regressors require valid numeric
observations. Future exogenous variables are NOT magically known.
