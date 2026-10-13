# [Client-Side Time-Series Forecast](https://github.com/europanite/client_side_time_series_forecast "Client-Side Time-Series Forecast")

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
![OS](https://img.shields.io/badge/OS-Linux%20%7C%20macOS%20%7C%20Windows-blue)
[![CI](https://github.com/europanite/client_side_time_series_forecast/actions/workflows/ci.yml/badge.svg)](https://github.com/europanite/client_side_time_series_forecast/actions/workflows/ci.yml)
[![docker](https://github.com/europanite/client_side_time_series_forecast/actions/workflows/docker.yml/badge.svg)](https://github.com/europanite/client_side_time_series_forecast/actions/workflows/docker.yml)
[![pages](https://github.com/europanite/client_side_time_series_forecast/actions/workflows/pages.yml/badge.svg)](https://github.com/europanite/client_side_time_series_forecast/actions/workflows/pages.yml)

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Jest](https://img.shields.io/badge/-jest-%23C21325?style=for-the-badge&logo=jest&logoColor=white)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)


<p align="right">
  <a href="./README.md">🇺🇸 English</a> |
  <a href="./README.hi.md">🇮🇳 हिंदी </a> |
  <a href="./README.ja.md">🇯🇵 日本語</a> |
  <a href="./README.zh-CN.md">🇨🇳 简体中文</a> |
  <a href="./README.es.md">🇪🇸 Español</a> |
  <a href="./README.pt-BR.md">🇧🇷 Português (Brasil)</a> |
  <a href="./README.ko.md">🇰🇷 한국어</a> |
  <a href="./README.de.md">🇩🇪 Deutsch</a> |
  <a href="./README.fr.md">🇫🇷 Français</a>
</p>

## 30-Second Demo

[![▶ Watch the 30-second demo](https://img.youtube.com/vi/qoiuBfhwuLE/hqdefault.jpg)](https://youtu.be/qoiuBfhwuLE)

## PlayGround

[▶ Open the browser-based forecasting app](https://europanite.github.io/client_side_time_series_forecast/)

Browser-Based Client-Side Time-Series Forecast Tool. This tool is completely free and safe because it runs only on your web browser.

You can choose [XGBoost](https://xgboost.readthedocs.io/en/stable/), [LightGBM](https://lightgbm.readthedocs.io/), an experimental VARMA-style model, [Chronos-2](https://github.com/amazon-science/chronos-forecasting), [TimesFM 2.5](https://github.com/google-research/timesfm), and Ridge regression.

---

## Overview

This is a multivariate time series forecasting tool that runs entirely in your web browser.
No installation, registration, or payment required. 
Just access it with your browser and you're ready to go.
It helps small businesses predict tomorrow's orders.

- Load CSV/XLSX time-series datasets in the browser
- Select any numeric column as the forecast target
- Choose among XGBoost, LightGBM, an experimental VARMA-style model, pretrained Chronos-2 and TimesFM 2.5, and Ridge regression
- Train the selected model locally in the browser
- Forecast the next 16 points and append them to the chart

Everything happens **inside your browser**. There is no backend API and no data leaves your machine.

---

## Demo

1. Open the GitHub Pages demo:  
   https://europanite.github.io/client_side_time_series_forecast/
2. Upload a sample file such as [`data/sample_data.csv`](./data/sample_data.csv) (stock prices) or [`data/sample_data.xlsx`](./data/sample_data.xlsx) (synthetic multivariate sample).
3. The app will:
   - Detect a **datetime-like column**
   - List available numeric columns
4. Choose one numeric column as the **target**.
5. Choose a **forecast model**. `XGBoost` is the default, `LightGBM` is an alternative locally trained GBDT, `VARMA experimental` is a lightweight multivariate baseline, `Chronos-2 pretrained` is a zero-shot foundation model, `TimesFM 2.5` is an optional zero-shot ONNX model, and `Ridge` is a locally trained linear baseline.
6. For XGBoost, LightGBM, VARMA, or Ridge, click **Train** first. Chronos-2 and TimesFM 2.5 are pretrained and do not require local training. Then click **Forecast +16** to predict the next 16 points.
7. Inspect the chart to compare the observed series and the forecast line.

---

## Data Structure

<pre>
datetime,item_a,item_b,item_c,...
2025-01-01 00:00:00+09:00,10,20,31,...
2025-01-02 00:00:00+09:00,12,19,31,...
2025-01-03 00:00:00+09:00,14,18,33,...
 ...
</pre>

### Requirements:

##### One datetime-like column
Column header contains "date" or "time" (case-insensitive).
Used as the time axis but not converted directly to numeric features.

##### One or more numeric columns
These columns are used as the target and/or exogenous features.
The app supports four locally fitted forecasting modes:

- **XGBoost**: you pick one numeric column as the target, and other numeric columns are used as additional signals.
- **LightGBM**: uses the same target and engineered multivariate features as XGBoost, but fits a LightGBM regressor.
- **VARMA experimental**: all numeric columns are modeled together, and the selected target column is displayed as the forecast output.
- **Ridge**: locally fitted regularized linear regression over the same engineered features and recursive prediction path as XGBoost and LightGBM.

---

## All-algorithm accuracy comparison

The matched browser benchmark evaluates **all six algorithms** on the same
five-sector stock snapshot: 256 observations of history followed by a held-out
16-session forecast. The supervised models use the UI default **Direct price**
strategy; Chronos-2 and TimesFM use target-only zero-shot inference. Results
must be generated by real Chromium inference, **not** copied from the separate
legacy/rolling benchmarks. **One GitHub Actions workflow runs every day at
18:37 JST**, fetches current stock bars, and evaluates all six models **only
when the benchmark's stock data has changed**. Weekends, holidays and delayed
feeds require no calendar: if the relevant closes have not changed, the workflow
skips expensive inference. TimesFM's ONNX model is cached between CI runs.

See the [daily workflow and Docker Compose reproduction instructions](docs/ALL_MODEL_EVALUATION.md).
The table is never populated with guessed scores.

<!-- ALL_MODEL_EVALUATION:START -->
### All six models — matched browser holdout (through 2026-10-09)

Each sector uses 256 historical closes to predict the same next 16 sessions. Lower MAPE is better.
The three supervised models use **Direct price** (the browser default); VARMA uses joint recursive forecasting;
Chronos-2 and TimesFM 2.5 use the selected target series only. Each is run in Chromium, not reimplemented in Node.

| Model | Automakers MAPE ↓ | Banks MAPE ↓ | Electronics MAPE ↓ | Telecom MAPE ↓ | Trading houses MAPE ↓ | Mean MAPE ↓ | Mean sMAPE ↓ |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| xgboost | 3.58% | 1.51% | 1.80% | 2.15% | 4.52% | 2.71% | 2.68% |
| lightgbm | 4.13% | 1.83% | 1.66% | 1.44% | 6.20% | 3.05% | 2.98% |
| ridge | 5.93% | 1.89% | 3.76% | 2.29% | 7.02% | 4.18% | 4.08% |
| varma | 3.67% | 12.66% | 21.04% | 14.50% | 1.05% | 10.58% | 9.69% |
| chronos | 3.20% | 4.60% | 3.09% | 3.09% | 3.45% | 3.48% | 3.40% |
| timesfm | 3.65% | 2.97% | 2.25% | 2.00% | 1.87% | 2.55% | 2.50% |
| last_close | 2.70% | 2.84% | 1.56% | 2.83% | 4.63% | 2.91% | 2.85% |

Protocol: `real-browser-recent-16step-all-six-v1`; input SHA256: `852dab2319b8…`; source SHA256: `493ab82ecc83…`.
Scores are retrospective and depend on the evaluated snapshot, not a live prediction audit.
[Method and reproduction](docs/ALL_MODEL_EVALUATION.md). Full MAE/RMSE, predictions and elapsed times: [`reports/stocks/all-models.json`](reports/stocks/all-models.json).
<!-- ALL_MODEL_EVALUATION:END -->

## Forecasting Approach

The project exposes six forecasting algorithms with deliberately different
assumptions:

| Model | Learning style | Uses multiple input series? | Local training? | Forecast style |
| --- | --- | --- | --- | --- |
| XGBoost | Gradient-boosted decision-tree regression over engineered time-series features | Yes | Yes | Recursive or direct 16-horizon forecasting |
| LightGBM | Histogram-based gradient-boosted decision-tree regression over the same engineered features as XGBoost | Yes | Yes | Recursive or direct 16-horizon forecasting |
| VARMA experimental | Linear multi-output autoregression with ridge regularization and residual correction | Yes, jointly | Yes | Joint recursive multi-output forecasting |
| Chronos-2-small INT8 ONNX | Pretrained patch-based time-series foundation model | Selected target only in the current UI | No | Direct probabilistic multi-step forecasting |
| TimesFM 2.5 ONNX | Pretrained time-series foundation model (large optional download) | Selected target only | No | Direct probabilistic multi-step forecasting |
| Ridge (linear baseline) | L2-regularized linear regression over the engineered features shared with the tree models | Yes | Yes | Recursive or direct 16-horizon forecasting |

These models should not be interpreted as six implementations of the same
algorithm. XGBoost and LightGBM convert the time series into the same supervised
tabular-learning problem, VARMA models lagged vectors of several series jointly,
Ridge provides a linear reference over the same supervised features,
and Chronos-2 and TimesFM 2.5 use pretrained neural forecasting models without fitting new
parameters to the uploaded dataset.

**Direct 16-step is the default forecasting strategy** for XGBoost, LightGBM,
and Ridge. Each future step is fitted independently, avoiding artificial future
peer inputs. To switch to recursive forecasting, open **Settings → Advanced
forecasting → Forecast strategy**. Recursive uses one model and iteratively
forecasts all 16 steps. VARMA uses joint multiseries autoregression;
Chronos-2 and TimesFM 2.5 are pretrained and predict directly. No fixed seasonal blend is
applied to supervised model predictions. See
[forecast strategies](docs/FORECAST_STRATEGIES.md).

### Model selection

#### XGBoost

`XGBoost` is the default locally trained model. XGBoost is a gradient-boosted
decision-tree algorithm: many decision trees are added sequentially, with each
new tree reducing errors left by the previous ensemble. Time series are not
passed to XGBoost directly. This project first converts each time step into a
feature vector and then trains XGBoost as a regression model.

The browser implementation uses:

- target and exogenous lags up to `MAX_LAG = 3`
- first differences
- a `ROLLING_WINDOW = 7` rolling mean
- spread, ratio, and product interactions between numeric series
- a time index
- Fourier features with periods 24 and 168
- `gbtree` with depth 4, learning rate 0.1, subsample 0.8, and 200 boosting iterations

In **recursive** mode the model predicts one step at a time; each prediction
becomes history for the next step, and unknown future peer series are continued
heuristically. In **direct** mode, 16 independently fitted horizon models use
the last real observed features without inventing future peer values.
No fixed seasonal blending is applied to model predictions.

**Strengths**

- captures nonlinear relationships and interactions between series
- works naturally with the project's hand-engineered multivariate features
- trains locally and relatively quickly in the browser
- does not require a large pretrained model download

**Limitations**

- forecasting quality depends on the chosen feature engineering
- recursive forecasting can accumulate errors over later steps
- the Fourier periods and seasonal continuation are application-level
  assumptions rather than automatically learned calendar structure

Use XGBoost when you want a lightweight, locally trained nonlinear model that
can exploit relationships among several numeric columns.

#### LightGBM

`LightGBM` is a second locally trained gradient-boosted decision-tree model.
The browser implementation uses `@wlearn/lightgbm`, a WebAssembly build of
LightGBM, and intentionally reuses the same `buildFeatures()` output and
16-step forecasting strategies as XGBoost (recursive or direct).

The default LightGBM configuration uses regression, learning rate 0.1,
31 leaves, max depth 4, subsample 0.8, and 200 boosting rounds. Raw model
forecasts are used without fixed seasonal blending.

Use LightGBM when you want a directly comparable histogram-based GBDT
alternative while keeping the feature pipeline and application-level forecast
protocol fixed.

#### VARMA experimental

`VARMA experimental` is a lightweight browser-native multivariate baseline.
Despite the name, this implementation is **not a full statistical
maximum-likelihood VARMA estimator**. It is closer to a regularized VAR-style
model with a small residual correction and optional seasonal stabilization.

The implementation:

1. selects up to 8 numeric series and standardizes them;
2. concatenates the previous 7 multivariate vectors into a lag feature vector;
3. fits all output series simultaneously with multi-output ridge regression
   (`ridge = 1e-2`);
4. estimates a small correction from recent residuals (`maLag = 1`);
5. optionally blends the autoregressive output with a seasonal lag vector
   (`seasonalLag = 7`; default `seasonalBlend = 0`);
6. recursively feeds the predicted vector back into the next forecast step.

Because the complete numeric vector is predicted at each step, VARMA advances
all modeled series together rather than forecasting only the selected target.

**Strengths**

- simple and computationally inexpensive
- models several numeric series jointly
- provides a useful linear/classical-style baseline against XGBoost and
  Chronos-2
- runs entirely in TypeScript without a separate model download

**Limitations**

- requires at least two numeric series and more than 7 usable rows
- assumes mostly linear lag relationships
- the residual correction and optional seasonal blending are heuristic,
  not a complete moving-average estimation procedure
- should not be presented as a reference implementation of statistical VARMA

Use `VARMA experimental` mainly as a transparent multivariate baseline when
several series move together.

#### Chronos-2 pretrained

`Chronos-2 pretrained` is fundamentally different from the two locally fitted
models above. Chronos-2 is a pretrained, patch-based time-series foundation
model that produces direct multi-step **quantile forecasts**. This repository
runs `Chronos-2-small INT8` as an ONNX model with ONNX Runtime Web, so inference
is performed locally after the model has been downloaded.

The current browser integration:

- does **not** train on the uploaded dataset;
- uses only the selected target series as Chronos context;
- requires at least 16 numeric target observations;
- keeps at most 5,760 context observations;
- groups the input into 16-point patches, left-padding an incomplete first
  patch with `NaN`;
- runs the ONNX graph's internal 672-step output
  (`42 × 16`) and exposes the first 16 steps to the UI;
- reads the model's quantile output and displays the median (`p50`) forecast
  together with `p10` and `p90` uncertainty bounds.

Chronos-2 itself supports richer multivariate and covariate-informed
forecasting, but **the current UI does not yet use those capabilities**.
Therefore the present Chronos implementation should be understood as a
pretrained univariate target forecaster inside an otherwise multivariate
application.

**Strengths**

- zero-shot forecasting: no per-dataset model fitting is required
- directly predicts the full forecast horizon instead of recursively fitting
  one-step models
- provides probabilistic information through forecast quantiles
- can transfer patterns learned during large-scale pretraining to a new series

**Limitations**

- the model must be downloaded before first use
- the browser uses an INT8 ONNX export, so results need not exactly match a
  full-precision official checkpoint
- the current UI ignores additional numeric columns when calling Chronos-2
- browser memory and WASM execution place practical limits on model size and
  context length

In a previously recorded AirPassengers 128/16 holdout benchmark,
`Chronos-2-small INT8 ONNX` achieved the lowest MAE, RMSE, MAPE, sMAPE, and
MASE among the comparable models. See the benchmark section below for the
measured values and evaluation protocol. **These are historical results from
an earlier app version and must not be compared with the revised feature and
forecast strategies without re-running the evaluation.**

### 16-step forecast

The application-level default horizon is 16 because the integrated Chronos-2
ONNX model uses 16-point patches, and the XGBoost, LightGBM, and VARMA APIs are
aligned to the same horizon for comparison.

The algorithms reach those 16 points differently:

- **XGBoost, LightGBM, and Ridge** can either predict recursively from one
  fitted one-step model, or directly using 16 horizon-specific models.
- **VARMA experimental** predicts the full multivariate vector recursively,
  so all included series are advanced together.
- **Chronos-2** performs direct multi-step probabilistic inference and returns
  the first 16 future positions from the pretrained model output.

The direct strategy is the **default** for XGBoost, LightGBM, and Ridge.
The recursive strategy is an advanced option under Settings. The direct target can also be changed under Settings from the default original values to cumulative log returns for strictly positive series. Direct forecasting
avoids iterative input fabrication at the cost of fitting up to 16 models. Results between strategies must be compared on the same
out-of-sample windows. Neither strategy guarantees an accuracy advantage.

---

## Feature Engineering (XGBoost / LightGBM)

The hand-engineered features in this section apply to both the XGBoost and
LightGBM pipelines. VARMA uses normalized lag vectors directly, while Chronos-2
operates on the selected target sequence without these features.

The tree-boosting pipelines treat the input as a small multi-variate time series:

- One *datetime-like* column (header contains `date` or `time` in any case).
- Several numeric columns (e.g., `item_a`, `item_b`, `item_c`, ...).
- One of the numeric columns is chosen as the **target** to forecast.

Internally, the feature builder constructs a **rich feature vector** for each time step `t` and a **future feature vector** for `t + 1`. All features are computed **purely on the client**, in JavaScript/TypeScript.

### Series used for features

- `datetimeKey`  
  - Detected automatically from the header that contains `"date"` or `"time"`.
  - Only used for locating the time axis; not used directly as a numeric feature.
- `targetKey`  
  - Numeric column the user chooses to forecast.
- `featureKeys`  
  - All other numeric columns (non-datetime, non-target).
  - Treated as **exogenous series**.

Internally we keep a `seriesMap: Record<string, number[]>` with one numeric array per series.

### Per-series features (exogenous series)

For every exogenous series `x(t)` (each key in `featureKeys`) and each time step `t`, we compute:

1. **Contemporaneous value**
   - `x(t)` (the value at time index `t`).

2. **Lag features (history)**
   - Up to `MAX_LAG = 3`:
     - `x(t - 1)`
     - `x(t - 2)`
     - `x(t - 3)`
   - This allows the model to learn short-term temporal dynamics per series.

3. **First difference**
   - `x(t) - x(t - 1)`
   - Captures local changes (trend / slope) rather than absolute level only.

4. **Rolling mean (local average)**
   - Rolling window of `ROLLING_WINDOW = 7` time steps:
     - `mean(x[t - 6 ... t])` (truncated near the beginning of the series)
   - Represents local trend / baseline level and smooths short-term noise.

> If the series is shorter than the window, the code automatically shrinks the window so that all available past points up to `t` are used.

### Target-series history

For the **target series** `y(t)` itself, we do **not** include the current value `y(t)` as a feature (because it is the label at that step), but we do include its history:

1. **Target lags**
   - `y(t - 1)`
   - `y(t - 2)`
   - `y(t - 3)`

2. **Target difference**
   - `y(t) - y(t - 1)`

3. **Target rolling mean**
   - Same rolling window as above:
     - `mean(y[t - 6 ... t])`

This lets the model learn patterns like “the next value depends on the last few values and their local trend,” which is typical in time-series forecasting.

### Cross-series interactions

To capture **relationships between different series**, we build interaction features for every **pair of numeric series** (including the target):

- Let `v_i(t)` and `v_j(t)` be the contemporaneous values of two series at time `t`.
- For each ordered pair `(i, j)` with `i < j`, we compute:

1. **Spread**
   - `v_i(t) - v_j(t)`
   - Encodes relative level differences between series.

2. **Ratio**
   - `v_i(t) / v_j(t)`
   - To avoid division by zero, the denominator includes a small epsilon if needed:
     - `denom = |v_j| < 1e-9 ? sign(v_j) * 1e-9 : v_j`
   - Encodes relative scale and proportionality.

3. **Product**
   - `v_i(t) * v_j(t)`
   - Allows the model to express “interaction effects” where both series being large or small matters.

These cross-series features explicitly expose **multi-series structure** to the booster instead of relying only on individual series values.

### Time index and Fourier features

We also encode time itself as numeric features:

1. **Time index**
   - Integer index `t = 0, 1, 2, ...` (row index).
   - Gives the booster a simple way to model global trends.

2. **Fourier features** (cyclical patterns)
   - Two periods (in units of “number of rows”):
     - Period 24 (e.g., 24 hours in hourly data)
     - Period 168 (e.g., 7 days × 24 hours)
   - For each period `P` we compute:
     - `sin(2πt / P)`
     - `cos(2πt / P)`
   - This is a standard way to embed seasonality/cycles in a form that tree models can still exploit.

The final feature vector for each time step `t` is:

```text
[ exogenous features (current, lags, diff, rolling mean for each series),
  target-series history (lags, diff, rolling mean),
  cross-series interactions (spread, ratio, product),
  time index, sin/cos(2πt/24), sin/cos(2πt/168) ]
```

### Future-step feature vector (lastFeatureRow)
The same feature-building logic is used to produce a feature vector for t + 1 (one-step-ahead prediction):
- Conceptually, we treat the next time index as t_next = n where n is the number of observed rows.
- For the “current” values of each series at t_next, we reuse the last observed value (index n - 1).
- Lags and rolling means are computed using the last MAX_LAG / ROLLING_WINDOW steps in the observed data.
- Time encodings use t_next as the time index.
- This gives a single feature vector lastFeatureRow that represents the next time step based on all history up to the last observation.

The buildFeatures function therefore returns:
```text
{
  X: number[][];        // feature matrix for all observed steps
  y: number[];          // target series values for those steps
  lastFeatureRow: number[]; // feature vector representing t + 1
}
```

---


## 🚀 Getting Started

### 1. Prerequisites
- [Docker Compose](https://docs.docker.com/compose/)

### 2. Build and start all services:

```bash

# Build the image
docker compose build

# Run the container
docker compose up

```

### 3. Test:
```bash
docker compose \
-f docker-compose.test.yml up \
--build --exit-code-from \
frontend_test
```

---

<!-- FRONTEND_STOCK_EVALUATION:START -->
## Stock results — browser benchmark (through 2026-10-09)

| Sector | Model | Previous 16-step MAPE ↓ | Recent 16-step MAPE ↓ | Rolling 1-step MAPE ↓ |
| --- | --- | ---: | ---: | ---: |
| Automakers | xgboost | 7.55% | 4.08% | 1.55% |
| Automakers | lightgbm | 2.58% | 4.74% | 1.71% |
| Automakers | varma | 11.82% | 3.67% | 1.81% |
| Automakers | chronos | 1.86% | 3.20% | 1.07% |
| Automakers | ridge | 2.69% | 6.78% | 1.47% |
| Automakers | last_close | 2.26% | 2.70% | 1.09% |
| Banks | xgboost | 3.56% | 2.27% | 1.66% |
| Banks | lightgbm | 3.13% | 1.89% | 1.60% |
| Banks | varma | 4.21% | 12.66% | 1.85% |
| Banks | chronos | 3.68% | 4.60% | 1.78% |
| Banks | ridge | 4.99% | 1.91% | 1.66% |
| Banks | last_close | 4.06% | 2.84% | 1.46% |
| Electronics | xgboost | 3.67% | 5.16% | 1.40% |
| Electronics | lightgbm | 3.58% | 1.09% | 1.38% |
| Electronics | varma | 5.13% | 21.04% | 1.81% |
| Electronics | chronos | 3.11% | 3.09% | 1.36% |
| Electronics | ridge | 7.11% | 5.62% | 1.72% |
| Electronics | last_close | 3.04% | 1.56% | 1.30% |
| Telecom | xgboost | 5.23% | 1.44% | 1.28% |
| Telecom | lightgbm | 5.96% | 1.47% | 1.47% |
| Telecom | varma | 13.19% | 14.50% | 1.41% |
| Telecom | chronos | 5.43% | 3.09% | 1.08% |
| Telecom | ridge | 7.14% | 1.65% | 1.13% |
| Telecom | last_close | 3.44% | 2.83% | 0.88% |
| Trading houses | xgboost | 3.08% | 4.58% | 1.41% |
| Trading houses | lightgbm | 2.78% | 4.40% | 1.48% |
| Trading houses | varma | 9.75% | 1.05% | 2.36% |
| Trading houses | chronos | 3.14% | 3.45% | 1.27% |
| Trading houses | ridge | 2.72% | 7.36% | 1.69% |
| Trading houses | last_close | 2.46% | 4.63% | 1.32% |
### Direct 16-step comparison (5 sectors, 2 holdouts; through 2026-10-09)

| Model | Recursive price MAPE ↓ | Direct price MAPE ↓ | Direct log-return MAPE ↓ | Last-close MAPE ↓ |
| --- | ---: | ---: | ---: | ---: |
| xgboost | 4.06% | 3.46% | 4.59% | 2.98% |
| lightgbm | 3.16% | 3.75% | 4.49% | 2.98% |
| ridge | 4.80% | 4.31% | 4.01% | 2.98% |
<!-- FRONTEND_STOCK_EVALUATION:END -->

## Stock results — separate-engine benchmark

<!-- STOCK_MULTIVARIATE:START -->
| Sector | Model | Long solo MAPE ↓ | Long multi MAPE ↓ | Recent solo MAPE ↓ | Recent multi MAPE ↓ |
| --- | --- | ---: | ---: | ---: | ---: |
| Automakers | ridge | 1.48% | 1.52% | 1.07% | 1.13% |
| Automakers | xgboost | 1.67% | 1.64% | 1.41% | 1.34% |
| Automakers | lightgbm | 1.60% | 1.59% | 1.33% | 1.34% |
| Banks | ridge | 1.63% | 1.66% | 1.47% | 1.52% |
| Banks | xgboost | 1.77% | 1.80% | 1.66% | 1.61% |
| Banks | lightgbm | 1.76% | 1.77% | 1.49% | 1.55% |
| Electronics | ridge | 1.69% | 1.70% | 1.27% | 1.35% |
| Electronics | xgboost | 1.83% | 1.91% | 1.45% | 1.50% |
| Electronics | lightgbm | 1.79% | 1.80% | 1.34% | 1.41% |
| Telecom | ridge | 0.81% | 0.82% | 0.90% | 0.87% |
| Telecom | xgboost | 0.85% | 0.87% | 1.04% | 1.01% |
| Telecom | lightgbm | 0.83% | 0.85% | 0.97% | 0.91% |
| Trading houses | ridge | 1.63% | 1.63% | 1.39% | 1.41% |
| Trading houses | xgboost | 1.77% | 1.69% | 1.50% | 1.53% |
| Trading houses | lightgbm | 1.69% | 1.66% | 1.34% | 1.43% |
<!-- STOCK_MULTIVARIATE:END -->


---

## AirPassengers Benchmark

See [`BENCHMARKS.md`](./BENCHMARKS.md) for the fair 16-step protocol and paper-comparison rules.

The repository includes an AirPassengers dataset and a benchmark command for checking model behavior against a classic monthly time-series dataset.

Run the benchmark with Docker Compose:

```bash
docker compose -f docker-compose.test.yml run --rm air_passengers_fair_benchmark
```

JSON output:

```bash
docker compose -f docker-compose.test.yml run --rm air_passengers_fair_benchmark \
  sh -lc 'npm --prefix frontend/app ci && node scripts/benchmark-air-passengers-fair.mjs --algorithm xgboost --json'
```

Seasonal naive baseline:

```bash
docker compose -f docker-compose.test.yml run --rm air_passengers_fair_benchmark \
  sh -lc 'npm --prefix frontend/app ci && node scripts/benchmark-air-passengers-fair.mjs --algorithm seasonal-naive --json'
```


### 16-step holdout benchmark

- train: first 128 AirPassengers observations
- holdout: next 16 observations
- no holdout target value is fed back during forecasting
- common point metrics: MAE, RMSE, MAPE, sMAPE, and MASE

Reproduce the benchmark with:

```bash
docker compose -f docker-compose.test.yml run --rm \
  air_passengers_fair_benchmark \
  sh -lc '
    npm --prefix frontend/app ci &&
    node scripts/benchmark-air-passengers-fair.mjs --markdown
  '
```

LightGBM-only AirPassengers evaluation:

```bash
docker compose -f docker-compose.test.yml run --rm \
  lightgbm_air_passengers_benchmark
```

This runs the same 128/16 protocol with
`--algorithm lightgbm`, so the result is directly comparable with the other
AirPassengers rows.

VARMA is reported as N/A because AirPassengers is univariate while this
repository's experimental VARMA implementation requires at least two numeric
series. See [`BENCHMARKS.md`](./BENCHMARKS.md) for the multivariate and
paper-comparison protocol.

# License
- Apache License 2.0
