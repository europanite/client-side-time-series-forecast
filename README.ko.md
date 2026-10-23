# [Client-Side Time-Series Forecast AI](https://github.com/europanite/client-side-time-series-forecast-ai "Client-Side Time-Series Forecast AI")

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
![OS](https://img.shields.io/badge/OS-Linux%20%7C%20macOS%20%7C%20Windows-blue)
[![CI](https://github.com/europanite/client-side-time-series-forecast-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/europanite/client-side-time-series-forecast-ai/actions/workflows/ci.yml)
[![docker](https://github.com/europanite/client-side-time-series-forecast-ai/actions/workflows/docker.yml/badge.svg)](https://github.com/europanite/client-side-time-series-forecast-ai/actions/workflows/docker.yml)
[![pages](https://github.com/europanite/client-side-time-series-forecast-ai/actions/workflows/pages.yml/badge.svg)](https://github.com/europanite/client-side-time-series-forecast-ai/actions/workflows/pages.yml)


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

## 40-Second Demo

[![▶ Watch the 40-second demo](https://img.youtube.com/vi/qoiuBfhwuLE/hqdefault.jpg)](https://youtu.be/qoiuBfhwuLE)

## PlayGround

[▶ Open the browser-based forecasting app](https://europanite.github.io/client-side-time-series-forecast-ai/)


XGBoost, LightGBM, 실험적 VARMA 스타일 모델, Chronos-2로 구동되는 클라이언트 측 브라우저 기반 시계열 예측 플레이그라운드입니다.

이 앱은 CSV 또는 XLSX 파일을 불러오고 datetime 및 숫자 열을 감지하며, 예측 모델을 선택할 수 있게 해 줍니다. 또한 관측값과 16-step forecast를 모두 시각화합니다. 데이터는 브라우저 안에 그대로 유지됩니다.

---

## 개요

이 도구는 웹 브라우저 안에서 완전히 실행되는 다변량 시계열 예측 도구입니다.
설치, 등록, 결제가 필요하지 않습니다. 
브라우저에서 접속하기만 하면 바로 사용할 수 있습니다.
소규모 사업자가 다음 날 주문량을 예측하는 데 도움이 됩니다.

- 브라우저에서 CSV/XLSX 시계열 데이터셋 불러오기
- 숫자 열 중 하나를 예측 target으로 선택하기
- XGBoost, LightGBM, 실험적 VARMA 스타일 모델, 사전 학습된 Chronos-2 중 선택하기
- 선택한 모델을 브라우저에서 로컬로 학습하기
- 다음 16개 포인트를 예측하고 차트에 추가하기

모든 처리는 **브라우저 내부**에서 이루어집니다. backend API가 없으며 데이터가 사용자의 머신 밖으로 나가지 않습니다.

---

## 데모

1. GitHub Pages 데모를 엽니다:  
   https://europanite.github.io/client-side-time-series-forecast-ai/

2. [`data/sample_data.csv`](./data/datsample_data.csv) 또는 [`data/sample_data.xlsx`](./data/sample_data.xlsx) 같은 샘플 파일을 업로드합니다.
3. 앱은 다음을 수행합니다:
   - **datetime과 유사한 열** 감지
   - 사용 가능한 숫자 열 목록 표시
4. 숫자 열 하나를 **target**으로 선택합니다.
5. **forecast model**을 선택합니다. `XGBoost`가 기본값이고, `LightGBM`은 로컬에서 학습되는 대체 GBDT, `VARMA experimental`은 가벼운 다변량 baseline, `Chronos-2 pretrained`는 zero-shot foundation model입니다.
6. XGBoost, LightGBM 또는 VARMA의 경우 먼저 **Train**을 클릭합니다. Chronos-2는 이미 사전 학습되어 있어 로컬 학습이 필요하지 않습니다. 그다음 **Forecast +16**을 클릭하여 다음 16개 포인트를 예측합니다.
7. 차트를 확인해 관측 시계열과 예측선을 비교합니다.

---

## 데이터 구조

<pre>
datetime,item_a,item_b,item_c,...
2025-01-01 00:00:00+09:00,10,20,31,...
2025-01-02 00:00:00+09:00,12,19,31,...
2025-01-03 00:00:00+09:00,14,18,33,...
 ...
</pre>

### 요구 사항:

##### datetime과 유사한 열 하나
열 헤더에 "date" 또는 "time"이 포함되어야 합니다(대소문자 구분 없음).
시간 축으로 사용되지만 직접 숫자 feature로 변환되지는 않습니다.

##### 하나 이상의 숫자 열
이 열들은 target 및/또는 exogenous features로 사용됩니다.
앱은 로컬에서 fit되는 세 가지 예측 모드를 지원합니다:

- **XGBoost**: 숫자 열 하나를 target으로 선택하고, 나머지 숫자 열은 추가 signal로 사용합니다.
- **LightGBM**: XGBoost와 같은 target 및 engineered multivariate features를 사용하지만 LightGBM regressor를 fit합니다.
- **VARMA experimental**: 모든 숫자 열을 함께 모델링하고, 선택한 target 열을 forecast output으로 표시합니다.

---

## 예측 접근 방식

이 프로젝트는 의도적으로 서로 다른 가정을 가진 네 가지 예측 알고리즘을 제공합니다:

| 모델 | 학습 방식 | 여러 입력 시계열 사용? | 로컬 학습? | 예측 방식 |
| --- | --- | --- | --- | --- |
| XGBoost | engineered time-series features에 대한 gradient-boosted decision-tree regression | 예 | 예 | Recursive one-step forecasting |
| LightGBM | XGBoost와 동일한 engineered features에 대한 histogram-based gradient-boosted decision-tree regression | 예 | 예 | Recursive one-step forecasting |
| VARMA experimental | ridge regularization, residual correction, seasonal stabilization을 포함한 linear multi-output autoregression | 예, 공동으로 | 예 | Recursive multi-output forecasting |
| Chronos-2-small INT8 ONNX | 사전 학습된 patch-based time-series foundation model | 현재 UI에서는 선택한 target만 | 아니요 | Direct probabilistic multi-step forecasting |

이 모델들을 같은 알고리즘의 네 가지 구현으로 해석해서는 안 됩니다. XGBoost와 LightGBM은 시계열을 동일한 supervised tabular-learning problem으로 변환하고, VARMA는 여러 series의 lagged vectors를 공동으로 모델링하며, Chronos-2는 업로드된 데이터셋에 새 parameter를 fit하지 않고 사전 학습된 neural forecasting model을 사용합니다.

### 모델 선택

#### XGBoost

`XGBoost`는 기본 로컬 학습 모델입니다. XGBoost는 gradient-boosted decision-tree algorithm으로, 여러 decision tree를 순차적으로 추가하고 각 새 tree가 이전 ensemble이 남긴 오류를 줄입니다. 시계열을 XGBoost에 직접 전달하지는 않습니다. 이 프로젝트는 먼저 각 time step을 feature vector로 변환한 다음 XGBoost를 regression model로 학습합니다.

브라우저 구현에서는 다음을 사용합니다:

- `MAX_LAG = 3`까지의 target 및 exogenous lags
- first differences
- `ROLLING_WINDOW = 7` rolling mean
- 숫자 series 간 spread, ratio, product interactions
- time index
- 주기 24와 168의 Fourier features
- depth 4, learning rate 0.1, subsample 0.8, 200 boosting iterations의 `gbtree`

16-step forecast에서는 모델이 한 번에 한 step씩 예측합니다. 각 prediction은 작업 history에 추가되므로 다음 step에서 사용할 수 있습니다. raw XGBoost prediction은 seasonal continuation estimate와도 blend됩니다. non-target numeric context는 고정하지 않고 앞으로 진행시킵니다.

**장점**

- series 간 비선형 관계와 interaction을 포착할 수 있음
- 프로젝트의 hand-engineered multivariate features와 자연스럽게 작동함
- 브라우저에서 로컬로 비교적 빠르게 학습됨
- 큰 사전 학습 모델을 다운로드할 필요가 없음

**제한 사항**

- forecasting quality가 선택한 feature engineering에 좌우됨
- recursive forecasting은 뒤쪽 step에서 error를 누적할 수 있음
- 고정 Fourier period와 seasonal continuation은 자동 학습된 calendar structure가 아니라 application-level 가정임

여러 숫자 열의 관계를 활용할 수 있는 가벼운 로컬 학습 비선형 모델이 필요할 때 XGBoost를 사용하세요.

#### LightGBM

`LightGBM`은 두 번째 로컬 학습 gradient-boosted decision-tree model입니다. 브라우저 구현은 LightGBM의 WebAssembly build인 `@wlearn/lightgbm`을 사용하며, 의도적으로 XGBoost와 동일한 `buildFeatures()` output과 16-step recursive forecasting path를 재사용합니다.

기본 LightGBM 설정은 regression, learning rate 0.1, 31 leaves, max depth 4, subsample 0.8, 200 boosting rounds를 사용합니다. raw tree prediction은 XGBoost에 사용하는 것과 같은 seasonal continuation estimate와 blend됩니다.

feature pipeline과 application-level forecast protocol을 고정한 상태에서 직접 비교 가능한 histogram-based GBDT alternative가 필요할 때 LightGBM을 사용하세요.

#### VARMA experimental

`VARMA experimental`은 가벼운 browser-native 다변량 baseline입니다. 이름과 달리 이 구현은 **완전한 통계적 maximum-likelihood VARMA estimator가 아닙니다**. 작은 residual correction과 명시적인 seasonal stabilization을 포함한 regularized VAR-style model에 더 가깝습니다.

구현은 다음과 같습니다:

1. 최대 8개의 숫자 series를 선택하고 표준화합니다;
2. 이전 7개의 multivariate vector를 이어 붙여 lag feature vector를 만듭니다;
3. multi-output ridge regression (`ridge = 1e-2`)으로 모든 output series를 동시에 fit합니다;
4. 최근 residual에서 작은 correction을 추정합니다 (`maLag = 1`);
5. forecasting 중 autoregressive output과 seasonal lag의 vector를 blend합니다 (`seasonalLag = 7`, `seasonalBlend = 0.55`);
6. predicted vector를 다음 forecast step에 재귀적으로 다시 입력합니다.

각 step에서 전체 numeric vector를 예측하므로 VARMA는 선택한 target만 예측하는 것이 아니라 모델링된 모든 series를 함께 앞으로 진행시킵니다.

**장점**

- 단순하고 계산 비용이 낮음
- 여러 숫자 series를 공동으로 모델링함
- XGBoost와 Chronos-2에 대한 유용한 linear/classical-style baseline을 제공함
- 별도 모델 다운로드 없이 TypeScript만으로 완전히 실행됨

**제한 사항**

- 최소 두 개의 숫자 series와 7개를 초과하는 usable rows가 필요함
- 주로 선형 lag 관계를 가정함
- residual correction과 seasonal blending은 실용적 stabilizer이며 완전한 moving-average estimation procedure가 아님
- 통계적 VARMA의 reference implementation으로 제시해서는 안 됨

여러 series가 함께 움직이는 경우 `VARMA experimental`을 투명한 다변량 baseline으로 주로 사용하세요.

#### Chronos-2 pretrained

`Chronos-2 pretrained`는 위의 로컬 fit 모델과 근본적으로 다릅니다. Chronos-2는 직접 multi-step **quantile forecasts**를 생성하는 사전 학습 patch-based time-series foundation model입니다. 이 repository는 `Chronos-2-small INT8`을 ONNX Runtime Web과 함께 ONNX model로 실행하므로, 모델을 다운로드한 뒤에는 inference가 로컬에서 수행됩니다.

현재 브라우저 통합은:

- 업로드한 데이터셋으로 **학습하지 않음**;
- Chronos context로 선택된 target series만 사용함;
- 최소 16개의 numeric target observations가 필요함;
- 최대 5,760개의 context observations를 유지함;
- 입력을 16-point patches로 묶고 불완전한 첫 patch의 왼쪽을 `NaN`으로 padding함;
- ONNX graph의 내부 672-step output (`42 × 16`)을 실행하고 첫 16 steps를 UI에 노출함;
- 모델의 quantile output을 읽고 median (`p50`) forecast와 `p10`, `p90` uncertainty bounds를 함께 표시함.

Chronos-2 자체는 더 풍부한 multivariate 및 covariate-informed forecasting을 지원하지만, **현재 UI는 아직 그 기능을 사용하지 않습니다**. 따라서 현재 Chronos 구현은 전반적으로는 multivariate인 애플리케이션 안에 포함된 사전 학습 univariate target forecaster로 이해해야 합니다.

**장점**

- zero-shot forecasting: 데이터셋마다 model fitting을 할 필요가 없음
- one-step model을 재귀적으로 fit하는 대신 전체 forecast horizon을 직접 예측함
- forecast quantiles를 통해 probabilistic information을 제공함
- 대규모 pretraining에서 학습한 pattern을 새 series에 transfer할 수 있음

**제한 사항**

- 처음 사용하기 전에 모델을 다운로드해야 함
- 브라우저는 INT8 ONNX export를 사용하므로 결과가 full-precision official checkpoint와 정확히 일치하지 않을 수 있음
- 현재 UI는 Chronos-2 호출 시 추가 숫자 열을 무시함
- browser memory와 WASM execution 때문에 model size와 context length에 실질적인 제한이 있음

repository의 현재 AirPassengers 128/16 holdout benchmark에서 `Chronos-2-small INT8 ONNX`는 비교 가능한 모델 중 가장 낮은 MAE, RMSE, MAPE, sMAPE, MASE를 달성했습니다. 측정값과 evaluation protocol은 아래 benchmark section을 참조하세요.

### 16-step forecast

application-level 기본 horizon이 16인 이유는 통합된 Chronos-2 ONNX model이 16-point patches를 사용하고, 비교를 위해 XGBoost, LightGBM, VARMA API도 같은 horizon에 맞춰져 있기 때문입니다.

각 알고리즘이 이 16개 포인트에 도달하는 방식은 다릅니다:

- **XGBoost**는 재귀적으로 예측합니다. 각 predicted target value가 다음 step의 history 일부가 되며, non-target context도 함께 앞으로 진행합니다.
- **LightGBM**은 XGBoost와 같은 engineered feature pipeline 및 recursive application-level forecast policy를 사용합니다.
- **VARMA experimental**은 전체 multivariate vector를 재귀적으로 예측하고, 그 predicted vector를 다음 step에 입력합니다.
- **Chronos-2**는 direct multi-step probabilistic inference를 수행하고 사전 학습된 model output에서 첫 16개의 future positions를 반환합니다.

이 차이는 모델 비교에서 중요합니다. XGBoost, LightGBM, VARMA는 recursive forecast error가 누적될 수 있지만, Chronos-2는 요청된 미래 시퀀스를 직접 생성합니다.

---

## Feature Engineering (XGBoost / LightGBM)

이 section의 hand-engineered features는 XGBoost와 LightGBM pipeline 모두에 적용됩니다. VARMA는 normalized lag vectors를 직접 사용하고, Chronos-2는 이러한 features 없이 선택된 target sequence에서 동작합니다.

tree-boosting pipeline은 입력을 작은 multi-variate time series로 취급합니다:

- 하나의 *datetime-like* column (header에 대소문자와 관계없이 `date` 또는 `time`이 포함됨).
- 여러 numeric columns (예: `item_a`, `item_b`, `item_c`, ...).
- numeric columns 중 하나를 예측할 **target**으로 선택함.

내부적으로 feature builder는 각 time step `t`에 대해 **rich feature vector**를 구성하고, `t + 1`에 대해 **future feature vector**를 구성합니다. 모든 features는 JavaScript/TypeScript로 **완전히 클라이언트 측에서** 계산됩니다.

### feature에 사용하는 series

- `datetimeKey`  
  - `"date"` 또는 `"time"`을 포함한 header에서 자동으로 감지됩니다.
  - time axis를 찾는 데만 사용되며 직접 numeric feature로 사용되지는 않습니다.
- `targetKey`  
  - 사용자가 예측 대상으로 선택한 numeric column입니다.
- `featureKeys`  
  - 나머지 모든 numeric columns (non-datetime, non-target).
  - **exogenous series**로 취급됩니다.

내부적으로 series마다 하나의 numeric array를 갖는 `seriesMap: Record<string, number[]>`을 유지합니다.

### series별 features (exogenous series)

각 exogenous series `x(t)` (`featureKeys`의 각 key)와 각 time step `t`에 대해 다음을 계산합니다:

1. **동시점 값**
   - `x(t)` (time index `t`에서의 값).

2. **Lag features (history)**
   - `MAX_LAG = 3`까지:
     - `x(t - 1)`
     - `x(t - 2)`
     - `x(t - 3)`
   - 이를 통해 모델이 각 series의 단기 시간적 동역학을 학습할 수 있습니다.

3. **First difference**
   - `x(t) - x(t - 1)`
   - 절대 수준만이 아니라 국소 변화(trend / slope)를 포착합니다.

4. **Rolling mean (local average)**
   - `ROLLING_WINDOW = 7` time steps의 rolling window:
     - `mean(x[t - 6 ... t])` (series 시작 부분에서는 축소됨)
   - local trend / baseline level을 나타내고 단기 noise를 완화합니다.

> series가 window보다 짧으면 code가 window를 자동으로 줄여 `t`까지 사용할 수 있는 모든 과거 포인트를 사용합니다.

### Target-series history

**target series** `y(t)` 자체에 대해서는 현재 값 `y(t)`를 feature에 **포함하지 않습니다**(그 step의 label이기 때문입니다). 대신 history는 포함합니다:

1. **Target lags**
   - `y(t - 1)`
   - `y(t - 2)`
   - `y(t - 3)`

2. **Target difference**
   - `y(t) - y(t - 1)`

3. **Target rolling mean**
   - 위와 같은 rolling window:
     - `mean(y[t - 6 ... t])`

이를 통해 모델은 “다음 값은 최근 몇 개 값과 그 local trend에 의존한다”와 같은, time-series forecasting에서 일반적인 pattern을 학습할 수 있습니다.

### Cross-series interactions

**서로 다른 series 간의 관계**를 포착하기 위해 target을 포함한 모든 **numeric series pair**에 대해 interaction features를 만듭니다:

- `v_i(t)`와 `v_j(t)`를 time `t`에서 두 series의 contemporaneous values라고 합시다.
- `i < j`인 각 ordered pair `(i, j)`에 대해 다음을 계산합니다:

1. **Spread**
   - `v_i(t) - v_j(t)`
   - series 간 상대적인 level 차이를 encode합니다.

2. **Ratio**
   - `v_i(t) / v_j(t)`
   - division by zero를 피하기 위해 필요한 경우 denominator에 작은 epsilon을 포함합니다:
     - `denom = |v_j| < 1e-9 ? sign(v_j) * 1e-9 : v_j`
   - 상대적인 scale과 proportionality를 encode합니다.

3. **Product**
   - `v_i(t) * v_j(t)`
   - 두 series가 모두 크거나 작은 것이 중요해지는 “interaction effects”를 모델이 표현할 수 있게 합니다.

이러한 cross-series features는 개별 series 값에만 의존하지 않고 **multi-series structure**를 booster에 명시적으로 제공합니다.

### Time index와 Fourier features

시간 자체도 numeric features로 encode합니다:

1. **Time index**
   - Integer index `t = 0, 1, 2, ...` (row index).
   - booster가 global trends를 모델링할 수 있는 간단한 방법을 제공합니다.

2. **Fourier features** (cyclical patterns)
   - “행 수” 단위의 두 고정 period:
     - Period 24 (예: hourly data의 24 hours)
     - Period 168 (예: 7 days × 24 hours)
   - 각 period `P`에 대해 다음을 계산합니다:
     - `sin(2πt / P)`
     - `cos(2πt / P)`
   - tree models도 활용할 수 있는 형태로 seasonality/cycles를 임베딩하는 표준적인 방법입니다.

각 time step `t`의 최종 feature vector는 다음과 같습니다:

```text
[ exogenous features (current, lags, diff, rolling mean for each series),
  target-series history (lags, diff, rolling mean),
  cross-series interactions (spread, ratio, product),
  time index, sin/cos(2πt/24), sin/cos(2πt/168) ]
```

### Future-step feature vector (lastFeatureRow)
같은 feature-building logic을 사용해 `t + 1` (one-step-ahead prediction)용 feature vector를 만듭니다:
- 개념적으로 다음 time index를 `t_next = n`으로 두며, 여기서 `n`은 observed rows 수입니다.
- `t_next`에서 각 series의 “current” 값으로 마지막 observed value (index `n - 1`)를 재사용합니다.
- lag와 rolling mean은 observed data의 마지막 `MAX_LAG` / `ROLLING_WINDOW` steps를 이용해 계산합니다.
- time encoding은 `t_next`를 time index로 사용합니다.
- 이렇게 마지막 observation까지의 전체 history를 기반으로 다음 time step을 나타내는 하나의 feature vector `lastFeatureRow`를 얻습니다.

따라서 `buildFeatures` function은 다음을 반환합니다:
```text
{
  X: number[][];        // feature matrix for all observed steps
  y: number[];          // target series values for those steps
  lastFeatureRow: number[]; // feature vector representing t + 1
}
```

---


## 🚀 시작하기

### 1. 사전 요구 사항
- [Docker Compose](https://docs.docker.com/compose/)

### 2. 모든 서비스를 build하고 시작:

```bash

# Build the image
docker compose build

# Run the container
docker compose up

```

### 3. 테스트:
```bash
docker compose \
-f docker-compose.test.yml up \
--build --exit-code-from \
frontend_test
```

---

## AirPassengers Benchmark

공정한 16-step protocol과 paper-comparison rules는 [`BENCHMARKS.md`](./BENCHMARKS.md)를 참조하세요.

repository에는 AirPassengers dataset과 고전적인 월별 time-series dataset에서 model behavior를 확인하기 위한 benchmark command가 포함되어 있습니다.

Docker Compose로 benchmark를 실행합니다:

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

다음 결과는 비교 가능한 모든 model에 대해 동일한 fixed-origin evaluation protocol을 사용합니다:

- train: 첫 128개 AirPassengers observations
- holdout: 다음 16개 observations
- forecasting 중 holdout target value를 다시 입력하지 않음
- 공통 point metrics: MAE, RMSE, MAPE, sMAPE, MASE

다음 명령으로 benchmark를 재현할 수 있습니다:

```bash
docker compose -f docker-compose.test.yml run --rm \
  air_passengers_fair_benchmark \
  sh -lc '
    npm --prefix frontend/app ci &&
    node scripts/benchmark-air-passengers-fair.mjs --markdown
  '
```

LightGBM 전용 AirPassengers evaluation:

```bash
docker compose -f docker-compose.test.yml run --rm \
  lightgbm_air_passengers_benchmark
```

이 명령은 `--algorithm lightgbm`으로 동일한 128/16 fixed-origin protocol을 실행하므로 결과를 다른 AirPassengers rows와 직접 비교할 수 있습니다.

# 라이선스
- Apache License 2.0
