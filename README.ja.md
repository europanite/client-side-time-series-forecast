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


XGBoost、LightGBM、実験的なVARMA風モデル、Chronos-2を使用した、クライアントサイドかつブラウザベースの時系列予測プレイグラウンドです。

このアプリはCSVまたはXLSXファイルを読み込み、datetime列と数値列を検出し、予測モデルを選択できるようにします。観測値と16ステップ先の予測を可視化し、データはブラウザ内に保持されます。

---

## 概要

これはWebブラウザだけで完全に動作する多変量時系列予測ツールです。
インストール、登録、支払いは不要です。 
ブラウザでアクセスするだけですぐに利用できます。
小規模事業者が翌日の注文数を予測する用途を想定しています。

- ブラウザでCSV/XLSX形式の時系列データセットを読み込む
- 任意の数値列を予測対象として選択する
- XGBoost、LightGBM、実験的なVARMA風モデル、事前学習済みChronos-2から選択する
- 選択したモデルをブラウザ内でローカルに学習する
- 次の16ポイントを予測し、チャートに追加する

すべての処理は**ブラウザ内**で行われます。バックエンドAPIはなく、データがマシンの外に送信されることもありません。

---

## デモ

1. GitHub Pagesのデモを開きます:  
   https://europanite.github.io/client-side-time-series-forecast-ai/

2. [`data/sample_data.csv`](./data/datsample_data.csv) または [`data/sample_data.xlsx`](./data/sample_data.xlsx) などのサンプルファイルをアップロードします。
3. アプリは次の処理を行います:
   - **datetimeらしい列**を検出する
   - 利用可能な数値列を一覧表示する
4. 1つの数値列を**target**として選択します。
5. **forecast model**を選択します。`XGBoost`がデフォルト、`LightGBM`はローカル学習する代替GBDT、`VARMA experimental`は軽量な多変量ベースライン、`Chronos-2 pretrained`はzero-shot foundation modelです。
6. XGBoost、LightGBM、VARMAでは、最初に**Train**をクリックします。Chronos-2は事前学習済みなのでローカル学習は不要です。その後、**Forecast +16**をクリックして次の16ポイントを予測します。
7. チャートを確認し、観測系列と予測線を比較します。

---

## データ構造

<pre>
datetime,item_a,item_b,item_c,...
2025-01-01 00:00:00+09:00,10,20,31,...
2025-01-02 00:00:00+09:00,12,19,31,...
2025-01-03 00:00:00+09:00,14,18,33,...
 ...
</pre>

### 要件:

##### datetimeらしい列が1つ
列ヘッダーに"date"または"time"を含めます（大文字・小文字は区別しません）。
時間軸として使用しますが、直接数値特徴量には変換しません。

##### 数値列が1つ以上
これらの列はtargetおよび／または外生特徴量として使用されます。
アプリは、ローカルでフィットする3つの予測モードをサポートしています:

- **XGBoost**: 1つの数値列をtargetとして選択し、その他の数値列を追加シグナルとして使用します。
- **LightGBM**: XGBoostと同じtargetおよび設計済み多変量特徴量を使用しますが、LightGBM regressorをフィットします。
- **VARMA experimental**: すべての数値列をまとめてモデル化し、選択したtarget列を予測出力として表示します。

---

## 予測アプローチ

このプロジェクトでは、意図的に異なる前提を持つ4つの予測アルゴリズムを提供しています:

| モデル | 学習方式 | 複数の入力系列を使用するか | ローカル学習 | 予測方式 |
| --- | --- | --- | --- | --- |
| XGBoost | 設計済み時系列特徴量に対する勾配ブースティング決定木回帰 | はい | はい | 再帰的な1ステップ予測 |
| LightGBM | XGBoostと同じ設計済み特徴量に対するヒストグラムベース勾配ブースティング決定木回帰 | はい | はい | 再帰的な1ステップ予測 |
| VARMA experimental | ridge正則化、残差補正、季節安定化を伴う線形multi-output自己回帰 | はい、同時に | はい | 再帰的multi-output予測 |
| Chronos-2-small INT8 ONNX | 事前学習済みpatch-based時系列foundation model | 現在のUIでは選択したtargetのみ | いいえ | 直接的な確率的multi-step予測 |

これらのモデルを、同一アルゴリズムの4つの実装と解釈すべきではありません。XGBoostとLightGBMは時系列を同じ教師あり表形式学習問題に変換し、VARMAは複数系列のlagged vectorを同時にモデル化します。Chronos-2は、アップロードしたデータセットに新しいパラメータをフィットせず、事前学習済みのニューラル予測モデルを使用します。

### モデル選択

#### XGBoost

`XGBoost`はデフォルトのローカル学習モデルです。XGBoostはgradient-boosted decision-tree algorithmで、多数のdecision treeを順番に追加し、それぞれの新しいtreeが以前のensembleに残った誤差を減らします。時系列をXGBoostへ直接渡すわけではありません。このプロジェクトでは、まず各time stepをfeature vectorへ変換し、その後XGBoostを回帰モデルとして学習します。

ブラウザ実装では次を使用します:

- `MAX_LAG = 3`までのtargetおよび外生系列のlag
- first difference
- `ROLLING_WINDOW = 7`のrolling mean
- 数値系列間のspread、ratio、product interaction
- time index
- 周期24と168のFourier feature
- depth 4、learning rate 0.1、subsample 0.8、200 boosting iterationsの`gbtree`

16-step forecastでは、モデルは1ステップずつ予測します。各予測値は作業用historyに追加されるため、次のstepで利用できます。生のXGBoost予測値はseasonal continuation estimateともblendされます。target以外のnumeric contextも固定せずに先へ進めます。

**長所**

- 系列間の非線形関係とinteractionを捉えられる
- プロジェクトのhand-engineered multivariate featuresと自然に組み合わせられる
- ブラウザ内でローカルに、比較的高速に学習できる
- 大規模な事前学習済みモデルをダウンロードする必要がない

**制約**

- 予測品質は選択したfeature engineeringに依存する
- 再帰予測では後半のstepほど誤差が蓄積する可能性がある
- 固定Fourier周期とseasonal continuationは自動学習されたcalendar structureではなく、application-levelの仮定である

複数の数値列間の関係を利用できる、軽量でローカル学習型の非線形モデルが必要な場合はXGBoostを使用してください。

#### LightGBM

`LightGBM`は2つ目のローカル学習型gradient-boosted decision-tree modelです。ブラウザ実装ではLightGBMのWebAssembly buildである`@wlearn/lightgbm`を使用し、意図的にXGBoostと同じ`buildFeatures()` outputおよび16-step recursive forecasting pathを再利用します。

デフォルトのLightGBM設定では、regression、learning rate 0.1、31 leaves、max depth 4、subsample 0.8、200 boosting roundsを使用します。生のtree predictionは、XGBoostと同じseasonal continuation estimateとblendされます。

feature pipelineとapplication-level forecast protocolを固定したまま、直接比較可能なhistogram-based GBDT alternativeが必要な場合はLightGBMを使用してください。

#### VARMA experimental

`VARMA experimental`は、軽量でbrowser-nativeな多変量ベースラインです。名前とは異なり、この実装は**完全な統計的maximum-likelihood VARMA estimatorではありません**。小さなresidual correctionと明示的なseasonal stabilizationを備えた、regularized VAR-style modelに近いものです。

実装は次のとおりです:

1. 最大8個の数値系列を選択して標準化する;
2. 過去7個の多変量vectorを連結してlag feature vectorを作る;
3. multi-output ridge regression（`ridge = 1e-2`）で全出力系列を同時にフィットする;
4. 最近のresidualから小さな補正を推定する（`maLag = 1`）;
5. 予測時にautoregressive outputとseasonal lagのvectorをblendする（`seasonalLag = 7`, `seasonalBlend = 0.55`）;
6. 予測したvectorを再帰的に次のforecast stepへ入力する。

各stepで完全なnumeric vectorを予測するため、VARMAは選択したtargetだけを予測するのではなく、モデル化したすべての系列をまとめて進めます。

**長所**

- 単純で計算コストが低い
- 複数の数値系列を同時にモデル化できる
- XGBoostやChronos-2に対する有用なlinear/classical-style baselineになる
- 別のモデルダウンロードなしにTypeScriptだけで動作する

**制約**

- 少なくとも2つの数値系列と、7行を超える利用可能なデータが必要
- 主に線形なlag関係を仮定する
- residual correctionとseasonal blendingは実用的なstabilizerであり、完全なmoving-average estimation procedureではない
- 統計的VARMAのreference implementationとして提示すべきではない

複数系列が連動して動く場合の透明性の高い多変量ベースラインとして、主に`VARMA experimental`を使用してください。

#### Chronos-2 pretrained

`Chronos-2 pretrained`は、上記のローカルフィット型モデルとは根本的に異なります。Chronos-2は事前学習済みのpatch-based time-series foundation modelで、直接multi-stepの**quantile forecasts**を生成します。このrepositoryでは`Chronos-2-small INT8`をONNX Runtime Web上のONNX modelとして実行するため、モデルのダウンロード後はローカルでinferenceが行われます。

現在のブラウザ統合では:

- アップロードしたデータセットでは**学習しない**;
- Chronos contextとして選択したtarget seriesのみを使用する;
- 16個以上のnumeric target observationsが必要;
- 最大5,760個のcontext observationsを保持する;
- 入力を16-point patchesへ分割し、不完全な先頭patchの左側を`NaN`でpaddingする;
- ONNX graph内部の672-step output（`42 × 16`）を実行し、その先頭16 stepsをUIに公開する;
- モデルのquantile outputを読み取り、median（`p50`）forecastと`p10`、`p90`のuncertainty boundsを表示する。

Chronos-2自体は、より高度なmultivariate forecastingやcovariate-informed forecastingをサポートしていますが、**現在のUIではまだそれらの機能を使用していません**。したがって、現状のChronos実装は、多変量アプリケーション内に組み込まれた事前学習済み単変量target forecasterとして理解するのが適切です。

**長所**

- zero-shot forecasting: データセットごとのmodel fittingが不要
- 1-step modelを再帰的にフィットするのではなく、forecast horizon全体を直接予測する
- forecast quantileを通じて確率的情報を提供する
- 大規模事前学習で獲得したpatternを新しいseriesへ転移できる

**制約**

- 初回利用前にモデルをダウンロードする必要がある
- ブラウザではINT8 ONNX exportを使用するため、結果がfull-precision official checkpointと完全に一致するとは限らない
- 現在のUIではChronos-2呼び出し時に追加の数値列を無視する
- browser memoryとWASM executionにより、model sizeとcontext lengthに実用上の制限がある

repositoryの現在のAirPassengers 128/16 holdout benchmarkでは、`Chronos-2-small INT8 ONNX`が比較可能なモデルの中でMAE、RMSE、MAPE、sMAPE、MASEのすべてで最小値を達成しました。測定値とevaluation protocolは下のbenchmark sectionを参照してください。

### 16-step forecast

application-levelのデフォルトhorizonが16なのは、統合済みChronos-2 ONNX modelが16-point patchesを使用しており、比較のためXGBoost、LightGBM、VARMA APIも同じhorizonに揃えているためです。

各アルゴリズムが16ポイントに到達する方法は異なります:

- **XGBoost**は再帰的に予測します。予測された各target valueは次のstepのhistoryの一部になり、target以外のcontextも同時に進みます。
- **LightGBM**はXGBoostと同じengineered feature pipelineおよびrecursive application-level forecast policyを使用します。
- **VARMA experimental**は完全なmultivariate vectorを再帰的に予測し、その予測vectorを次のstepに入力します。
- **Chronos-2**はdirect multi-step probabilistic inferenceを行い、事前学習済みmodel outputから最初の16 future positionsを返します。

この違いはモデル比較で重要です。XGBoost、LightGBM、VARMAはrecursive forecast errorが蓄積する可能性がありますが、Chronos-2は要求された未来系列を直接生成します。

---

## Feature Engineering (XGBoost / LightGBM)

このsectionのhand-engineered featuresは、XGBoostとLightGBMの両方のpipelineに適用されます。VARMAはnormalized lag vectorsを直接使用し、Chronos-2はこれらのfeaturesを使わずに選択したtarget sequenceを処理します。

tree-boosting pipelineは、入力を小規模なmulti-variate time seriesとして扱います:

- *datetime-like* columnが1つ（headerに大文字・小文字を問わず`date`または`time`を含む）。
- 複数のnumeric columns（例: `item_a`, `item_b`, `item_c`, ...）。
- numeric columnsの1つを、予測する**target**として選択する。

内部では、feature builderが各time step `t`について**rich feature vector**を構築し、`t + 1`について**future feature vector**を構築します。すべてのfeaturesはJavaScript/TypeScriptにより**完全にクライアント側**で計算されます。

### 特徴量に使用する系列

- `datetimeKey`  
  - `"date"`または`"time"`を含むheaderから自動検出されます。
  - 時間軸を特定するためだけに使用し、直接numeric featureとしては使いません。
- `targetKey`  
  - ユーザーが予測対象として選択するnumeric columnです。
- `featureKeys`  
  - その他すべてのnumeric columns（non-datetime、non-target）です。
  - **exogenous series**として扱います。

内部では、各seriesにつき1つのnumeric arrayを持つ`seriesMap: Record<string, number[]>`を保持します。

### 系列ごとの特徴量（exogenous series）

各exogenous series `x(t)`（`featureKeys`の各key）と各time step `t`について、次を計算します:

1. **同時点の値**
   - `x(t)`（time index `t`における値）。

2. **Lag features（history）**
   - `MAX_LAG = 3`まで:
     - `x(t - 1)`
     - `x(t - 2)`
     - `x(t - 3)`
   - これによりmodelは各seriesの短期的な時間ダイナミクスを学習できます。

3. **First difference**
   - `x(t) - x(t - 1)`
   - 絶対レベルだけではなく、局所的な変化（trend / slope）を捉えます。

4. **Rolling mean（local average）**
   - `ROLLING_WINDOW = 7` time stepsのrolling window:
     - `mean(x[t - 6 ... t])`（series先頭付近では短縮）
   - 局所trend / baseline levelを表し、短期noiseを平滑化します。

> seriesがwindowより短い場合、codeはwindowを自動的に縮小し、`t`までに利用可能なすべての過去ポイントを使用します。

### Target-series history

**target series** `y(t)`自体については、現在値`y(t)`をfeatureには**含めません**（そのstepのlabelだからです）が、historyは含めます:

1. **Target lags**
   - `y(t - 1)`
   - `y(t - 2)`
   - `y(t - 3)`

2. **Target difference**
   - `y(t) - y(t - 1)`

3. **Target rolling mean**
   - 上と同じrolling window:
     - `mean(y[t - 6 ... t])`

これにより、「次の値は直近いくつかの値とその局所trendに依存する」といった、time-series forecastingで典型的なpatternをmodelが学習できます。

### Cross-series interactions

**異なるseries間の関係**を捉えるため、targetを含む**すべてのnumeric seriesの組み合わせ**についてinteraction featuresを構築します:

- `v_i(t)`と`v_j(t)`をtime `t`における2系列の同時点の値とします。
- `i < j`を満たす各ordered pair `(i, j)`について、次を計算します:

1. **Spread**
   - `v_i(t) - v_j(t)`
   - series間の相対的なlevel差をencodeします。

2. **Ratio**
   - `v_i(t) / v_j(t)`
   - zero divisionを避けるため、必要であればdenominatorに小さなepsilonを入れます:
     - `denom = |v_j| < 1e-9 ? sign(v_j) * 1e-9 : v_j`
   - 相対scaleと比例関係をencodeします。

3. **Product**
   - `v_i(t) * v_j(t)`
   - 両系列が大きい／小さいこと自体が重要になる「interaction effects」をmodelが表現できるようにします。

これらのcross-series featuresにより、個々のseries valueだけに依存するのではなく、**multi-series structure**をboosterへ明示的に与えます。

### Time indexとFourier features

時間そのものもnumeric featuresとしてencodeします:

1. **Time index**
   - Integer index `t = 0, 1, 2, ...`（row index）。
   - boosterがglobal trendsをモデル化するための単純な手段になります。

2. **Fourier features**（cyclical patterns）
   - 「行数」を単位とする2つの固定period:
     - Period 24（例: hourly dataなら24 hours）
     - Period 168（例: 7 days × 24 hours）
   - 各period `P`について次を計算します:
     - `sin(2πt / P)`
     - `cos(2πt / P)`
   - tree modelでも利用できる形式でseasonality/cyclesを埋め込む標準的な方法です。

各time step `t`の最終feature vectorは次のとおりです:

```text
[ exogenous features (current, lags, diff, rolling mean for each series),
  target-series history (lags, diff, rolling mean),
  cross-series interactions (spread, ratio, product),
  time index, sin/cos(2πt/24), sin/cos(2πt/168) ]
```

### Future-step feature vector (lastFeatureRow)
`t + 1`（one-step-ahead prediction）用のfeature vectorにも同じfeature-building logicを使用します:
- 概念的には、次のtime indexを`t_next = n`とします。ここで`n`はobserved rowsの数です。
- `t_next`での各seriesの「current」値には、最後に観測された値（index `n - 1`）を再利用します。
- lagとrolling meanはobserved dataの最後の`MAX_LAG` / `ROLLING_WINDOW` stepsを使って計算します。
- time encodingでは`t_next`をtime indexとして使用します。
- これにより、最後のobservationまでの全historyに基づいて次のtime stepを表す単一のfeature vector `lastFeatureRow`が得られます。

したがって`buildFeatures` functionは次を返します:
```text
{
  X: number[][];        // feature matrix for all observed steps
  y: number[];          // target series values for those steps
  lastFeatureRow: number[]; // feature vector representing t + 1
}
```

---


## 🚀 はじめに

### 1. 前提条件
- [Docker Compose](https://docs.docker.com/compose/)

### 2. すべてのサービスをbuildして起動:

```bash

# Build the image
docker compose build

# Run the container
docker compose up

```

### 3. テスト:
```bash
docker compose \
-f docker-compose.test.yml up \
--build --exit-code-from \
frontend_test
```

---

## AirPassengers Benchmark

公平な16-step protocolとpaper-comparison rulesについては[`BENCHMARKS.md`](./BENCHMARKS.md)を参照してください。

repositoryにはAirPassengers datasetと、古典的な月次time-series datasetに対してmodel behaviorを確認するbenchmark commandが含まれています。

Docker Composeでbenchmarkを実行します:

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

以下の結果では、比較可能なすべてのmodelについて同じfixed-origin evaluation protocolを使用しています:

- train: AirPassengersの最初の128 observations
- holdout: 次の16 observations
- forecasting中にholdout target valueをフィードバックしない
- 共通のpoint metrics: MAE、RMSE、MAPE、sMAPE、MASE

benchmarkを再現するには:

```bash
docker compose -f docker-compose.test.yml run --rm \
  air_passengers_fair_benchmark \
  sh -lc '
    npm --prefix frontend/app ci &&
    node scripts/benchmark-air-passengers-fair.mjs --markdown
  '
```

LightGBMのみのAirPassengers evaluation:

```bash
docker compose -f docker-compose.test.yml run --rm \
  lightgbm_air_passengers_benchmark
```

これは同じ128/16 fixed-origin protocolを`--algorithm lightgbm`で実行するため、結果を他のAirPassengers rowと直接比較できます。

# ライセンス
- Apache License 2.0
