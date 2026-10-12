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
| LightGBM | yes | yes (16 fitted models) | no |
| Ridge | yes | yes (16 fitted models) | no |
| VARMA experimental | internally recursive over ALL modeled series | no | yes |
| Chronos-2 | no | pretrained direct 16-step | selected target only in current UI |

**Recursive:** fit one model to predict t+1, then iteratively append the predicted
target. Unknown future peer values are continued via a heuristic, NOT observed.
**Direct:** fit 16 separate, horizon-aligned supervised models, all using the
same last REAL observed features (no hypothetical peer values). CPU/memory
cost is ~16 fitted models. This is the **default** for XGBoost, LightGBM,
and Ridge. Recursive forecasting is available under **Settings → Advanced
forecasting → Forecast strategy**. **Joint:** VARMA fits and evolves all series
simultaneously, using a linear vector autoregression approximation. Joint
series vs direct multi-horizon are separate design dimensions.

No forced seasonal blend is applied to XGBoost/LightGBM/Ridge forecasts.
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
The new UI-default *direct 16-step* strategy is NOT measured by the scheduled
stock benchmark. It intentionally preserves recursive predictions for
historical protocol continuity. Do not treat the scheduled score as
a direct-strategy score. Any claim of a direct-strategy advantage requires
an additional, explicitly matched evaluation on the same holdout dates.

No synthetic dataset generator, generic benchmark job, or extra scheduled
workflow is installed by this patch.

## Important limitations

The time-index and fixed Fourier periods are generic heuristics, not inferred
from sampling frequency. On irregular timestamps there is no time-aware resampling.
Many models still use horizon-independent feature engineering. Data should be
sorted and sampled consistently, and supervised regressors require valid numeric
observations. Future exogenous variables are NOT magically known.
