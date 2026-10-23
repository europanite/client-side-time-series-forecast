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

[![▶ Watch the 40-second demo](https://img.youtube.com/vi/1M-YLDqwYHw/hqdefault.jpg)](https://youtu.be/1M-YLDqwYHw)

## PlayGround

[▶ Open the browser-based forecasting app](https://europanite.github.io/client-side-time-series-forecast-ai/)

一个完全在客户端浏览器中运行的时间序列预测Playground，由XGBoost、LightGBM、实验性VARMA风格模型和Chronos-2提供支持。

该应用可加载CSV或XLSX文件，自动检测datetime列和数值列，让你选择预测模型，并同时可视化观测值和未来16步预测。你的数据始终保留在浏览器中。

---

## 概览

这是一个完全在Web浏览器中运行的多变量时间序列预测工具。
无需安装、注册或付费。 
只需用浏览器访问即可开始使用。
它可以帮助小型企业预测第二天的订单量。

- 在浏览器中加载CSV/XLSX时间序列数据集
- 选择任意数值列作为预测目标
- 在XGBoost、LightGBM、实验性VARMA风格模型和预训练Chronos-2之间选择
- 在浏览器本地训练所选模型
- 预测接下来的16个点，并将结果追加到图表中

所有操作都发生在**你的浏览器内部**。没有后端API，也不会有任何数据离开你的设备。

---

## 演示

1. 打开GitHub Pages演示：  
   https://europanite.github.io/client-side-time-series-forecast-ai/

2. 上传示例文件，例如[`data/sample_data.csv`](./data/datsample_data.csv)或[`data/sample_data.xlsx`](./data/sample_data.xlsx)。
3. 应用将：
   - 检测一个**类似datetime的列**
   - 列出可用的数值列
4. 选择一个数值列作为**target**。
5. 选择一个**forecast model**。`XGBoost`是默认模型，`LightGBM`是另一种本地训练的GBDT，`VARMA experimental`是轻量级多变量baseline，`Chronos-2 pretrained`是zero-shot foundation model。
6. 对于XGBoost、LightGBM或VARMA，先点击**Train**。Chronos-2已经预训练完成，不需要本地训练。然后点击**Forecast +16**，预测接下来的16个点。
7. 查看图表，对比观测序列和预测曲线。

---

## 数据结构

<pre>
datetime,item_a,item_b,item_c,...
2025-01-01 00:00:00+09:00,10,20,31,...
2025-01-02 00:00:00+09:00,12,19,31,...
2025-01-03 00:00:00+09:00,14,18,33,...
 ...
</pre>

### 要求：

##### 一个类似datetime的列
列标题中包含"date"或"time"（不区分大小写）。
该列用作时间轴，但不会直接转换为数值特征。

##### 一个或多个数值列
这些列可作为target和/或exogenous features。
应用支持三种在本地拟合的预测模式：

- **XGBoost**：选择一个数值列作为target，其他数值列用作额外信号。
- **LightGBM**：使用与XGBoost相同的target和工程化多变量特征，但拟合LightGBM regressor。
- **VARMA experimental**：联合建模所有数值列，并将所选target列显示为预测输出。

---

## 预测方法

本项目提供四种预测算法，并且有意让它们采用不同的假设：

| 模型 | 学习方式 | 是否使用多个输入序列？ | 本地训练？ | 预测方式 |
| --- | --- | --- | --- | --- |
| XGBoost | 基于工程化时间序列特征的梯度提升决策树回归 | 是 | 是 | 递归单步预测 |
| LightGBM | 基于与XGBoost相同工程化特征的直方图梯度提升决策树回归 | 是 | 是 | 递归单步预测 |
| VARMA experimental | 带ridge正则化、残差修正和季节稳定化的线性multi-output自回归 | 是，联合建模 | 是 | 递归multi-output预测 |
| Chronos-2-small INT8 ONNX | 预训练patch-based时间序列foundation model | 当前UI仅使用所选target | 否 | 直接概率multi-step预测 |

不应把这些模型理解为同一种算法的四种实现。XGBoost和LightGBM会把时间序列转换成相同的监督式表格学习问题；VARMA会联合建模多个序列的滞后向量；Chronos-2则使用预训练神经预测模型，而不会在上传的数据集上拟合新的参数。

### 模型选择

#### XGBoost

`XGBoost`是默认的本地训练模型。XGBoost是一种gradient-boosted decision-tree算法：多个decision tree按顺序加入，每棵新树都用于降低前一轮ensemble留下的误差。时间序列不会直接传入XGBoost。本项目先把每个time step转换为feature vector，然后将XGBoost作为回归模型进行训练。

浏览器实现使用：

- 最多到`MAX_LAG = 3`的target和exogenous lags
- first differences
- `ROLLING_WINDOW = 7` rolling mean
- 数值序列之间的spread、ratio和product interactions
- time index
- 周期为24和168的Fourier features
- `gbtree`，depth 4、learning rate 0.1、subsample 0.8、200 boosting iterations

对于16-step forecast，模型每次只预测一步。每次预测都会追加到工作history中，因此可以用于下一步预测。原始XGBoost prediction还会与seasonal continuation estimate进行blend。非target的numeric context也会继续向前推进，而不是保持不变。

**优势**

- 能捕捉序列之间的非线性关系和interaction
- 能自然利用项目手工设计的multivariate features
- 可在浏览器中本地、相对快速地训练
- 不需要下载大型预训练模型

**限制**

- 预测质量依赖所采用的feature engineering
- recursive forecasting可能在较远预测步上积累误差
- 固定Fourier周期和seasonal continuation属于application-level假设，而不是自动学习到的calendar structure

如果你需要一个轻量、本地训练、非线性的模型，并希望利用多个数值列之间的关系，可以使用XGBoost。

#### LightGBM

`LightGBM`是第二个本地训练的gradient-boosted decision-tree model。浏览器实现使用LightGBM的WebAssembly构建`@wlearn/lightgbm`，并且有意复用XGBoost相同的`buildFeatures()` output和16-step recursive forecasting path。

默认LightGBM配置使用regression、learning rate 0.1、31 leaves、max depth 4、subsample 0.8以及200 boosting rounds。原始tree prediction会与XGBoost所使用的同一个seasonal continuation estimate进行blend。

如果你希望在保持feature pipeline和application-level forecast protocol不变的前提下，获得一个可以直接比较的histogram-based GBDT alternative，可以使用LightGBM。

#### VARMA experimental

`VARMA experimental`是一个轻量级、browser-native的多变量baseline。尽管名称如此，这个实现**并不是完整的统计maximum-likelihood VARMA estimator**。它更接近一个regularized VAR-style model，并加入少量residual correction以及显式seasonal stabilization。

实现过程：

1. 选择最多8个数值序列并进行标准化；
2. 将前7个多变量vector拼接成一个lag feature vector；
3. 使用multi-output ridge regression（`ridge = 1e-2`）同时拟合所有输出序列；
4. 从近期residual中估计一个小的修正项（`maLag = 1`）；
5. 在预测期间，将autoregressive output与seasonal lag的vector进行blend（`seasonalLag = 7`, `seasonalBlend = 0.55`）；
6. 递归地把预测vector反馈到下一预测步。

由于每一步都会预测完整的numeric vector，因此VARMA会同时推进所有已建模序列，而不只是预测所选target。

**优势**

- 简单且计算成本低
- 能联合建模多个数值序列
- 可作为XGBoost和Chronos-2的实用linear/classical-style baseline
- 完全在TypeScript中运行，无需额外下载模型

**限制**

- 至少需要两个数值序列，并且需要超过7行可用数据
- 主要假设线性lag关系
- residual correction和seasonal blending是实用的稳定化方法，并非完整的moving-average estimation procedure
- 不应把它当作统计VARMA的reference implementation

当多个序列共同变化时，可主要将`VARMA experimental`作为透明的多变量baseline使用。

#### Chronos-2 pretrained

`Chronos-2 pretrained`与上面的本地拟合模型有本质区别。Chronos-2是一个预训练的patch-based time-series foundation model，可直接产生multi-step **quantile forecasts**。本repository通过ONNX Runtime Web运行`Chronos-2-small INT8` ONNX model，因此模型下载完成后，inference会在本地执行。

当前浏览器集成：

- **不会**在上传的数据集上训练；
- 仅使用所选target series作为Chronos context；
- 至少需要16个numeric target observations；
- 最多保留5,760个context observations；
- 将输入分组成16-point patches，并对不完整的第一个patch在左侧用`NaN`进行padding；
- 运行ONNX graph内部的672-step output（`42 × 16`），并向UI提供前16 steps；
- 读取模型的quantile output，并显示median（`p50`）forecast以及`p10`和`p90` uncertainty bounds。

Chronos-2本身支持更丰富的多变量和covariate-informed forecasting，但**当前UI尚未使用这些能力**。因此，当前Chronos实现应理解为：在一个整体上多变量的应用中使用的预训练单变量target forecaster。

**优势**

- zero-shot forecasting：无需针对每个数据集单独拟合模型
- 直接预测完整forecast horizon，而不是递归拟合one-step models
- 通过forecast quantiles提供概率信息
- 能将大规模预训练期间学到的pattern迁移到新series

**限制**

- 首次使用前必须下载模型
- 浏览器使用INT8 ONNX export，因此结果不一定与full-precision official checkpoint完全一致
- 当前UI调用Chronos-2时会忽略额外的数值列
- browser memory和WASM execution会对model size和context length施加实际限制

在repository当前的AirPassengers 128/16 holdout benchmark中，`Chronos-2-small INT8 ONNX`在可比较模型中取得了最低的MAE、RMSE、MAPE、sMAPE和MASE。具体测量值和evaluation protocol见下方benchmark章节。

### 16-step forecast

应用层默认horizon为16，因为集成的Chronos-2 ONNX model使用16-point patches，同时为了便于比较，XGBoost、LightGBM和VARMA API也统一到相同horizon。

这些算法以不同方式得到这16个预测点：

- **XGBoost**递归预测。每个预测的target value都会成为下一步history的一部分，同时非target context也会继续推进。
- **LightGBM**使用与XGBoost相同的engineered feature pipeline和recursive application-level forecast policy。
- **VARMA experimental**递归预测一个完整的multivariate vector，并把该预测vector输入下一步。
- **Chronos-2**执行direct multi-step probabilistic inference，并从预训练model output中返回前16个future positions。

在比较模型时，这一区别很重要：XGBoost、LightGBM和VARMA可能积累recursive forecast error，而Chronos-2会直接生成所请求的未来序列。

---

## 特征工程（XGBoost / LightGBM）

本节中的手工设计特征同时适用于XGBoost和LightGBM pipeline。VARMA直接使用标准化lag vectors，而Chronos-2不使用这些特征，只处理所选target sequence。

tree-boosting pipeline把输入视为一个小型multi-variate time series：

- 一个*datetime-like* column（header中以任意大小写包含`date`或`time`）。
- 多个numeric columns（例如`item_a`, `item_b`, `item_c`, ...）。
- 从numeric columns中选择一个作为要预测的**target**。

在内部，feature builder会为每个time step `t`构建一个**rich feature vector**，并为`t + 1`构建一个**future feature vector**。所有features都**完全在客户端**使用JavaScript/TypeScript计算。

### 用于特征的序列

- `datetimeKey`  
  - 自动从包含`"date"`或`"time"`的header中检测。
  - 仅用于定位时间轴，不直接作为numeric feature。
- `targetKey`  
  - 用户选择进行预测的numeric column。
- `featureKeys`  
  - 所有其他numeric columns（non-datetime、non-target）。
  - 作为**exogenous series**处理。

内部维护一个`seriesMap: Record<string, number[]>`，其中每个series对应一个numeric array。

### 每个序列的特征（exogenous series）

对于每个exogenous series `x(t)`（`featureKeys`中的每个key）以及每个time step `t`，计算：

1. **同时点值**
   - `x(t)`（time index `t`处的值）。

2. **Lag features（history）**
   - 最多到`MAX_LAG = 3`：
     - `x(t - 1)`
     - `x(t - 2)`
     - `x(t - 3)`
   - 让模型可以学习每个series的短期时间动态。

3. **First difference**
   - `x(t) - x(t - 1)`
   - 捕捉局部变化（trend / slope），而不仅仅是绝对水平。

4. **Rolling mean（local average）**
   - `ROLLING_WINDOW = 7`个time steps的rolling window：
     - `mean(x[t - 6 ... t])`（在series开头附近会缩短）
   - 表示局部trend / baseline level，并平滑短期noise。

> 如果series短于window，代码会自动缩短window，使`t`之前所有可用的过去点都被使用。

### Target-series history

对于**target series** `y(t)`本身，我们**不会**把当前值`y(t)`作为feature（因为它就是该step的label），但会包含其history：

1. **Target lags**
   - `y(t - 1)`
   - `y(t - 2)`
   - `y(t - 3)`

2. **Target difference**
   - `y(t) - y(t - 1)`

3. **Target rolling mean**
   - 使用与上面相同的rolling window：
     - `mean(y[t - 6 ... t])`

这让模型可以学习类似“下一个值取决于最近几个值以及它们的局部trend”的pattern，这在time-series forecasting中很常见。

### Cross-series interactions

为了捕捉**不同series之间的关系**，我们会为每一对**numeric series**（包括target）构建interaction features：

- 设`v_i(t)`和`v_j(t)`为time `t`时两个series的同时点值。
- 对每个满足`i < j`的ordered pair `(i, j)`，计算：

1. **Spread**
   - `v_i(t) - v_j(t)`
   - 编码series之间的相对level差异。

2. **Ratio**
   - `v_i(t) / v_j(t)`
   - 为避免除零，如有需要会在denominator中加入一个很小的epsilon：
     - `denom = |v_j| < 1e-9 ? sign(v_j) * 1e-9 : v_j`
   - 编码相对scale和比例关系。

3. **Product**
   - `v_i(t) * v_j(t)`
   - 让模型能够表达“interaction effects”，即两个series同时较大或较小时本身具有意义。

这些cross-series features会显式地把**multi-series structure**提供给booster，而不是只依赖单个series的值。

### Time index和Fourier features

我们也把时间本身编码为numeric features：

1. **Time index**
   - Integer index `t = 0, 1, 2, ...`（row index）。
   - 为booster提供一种简单方式来建模global trends。

2. **Fourier features**（cyclical patterns）
   - 两个固定周期（单位为“行数”）：
     - Period 24（例如hourly data中的24 hours）
     - Period 168（例如7 days × 24 hours）
   - 对每个period `P`计算：
     - `sin(2πt / P)`
     - `cos(2πt / P)`
   - 这是把seasonality/cycles嵌入到tree models仍可利用的形式中的标准方法。

每个time step `t`的最终feature vector为：

```text
[ exogenous features (current, lags, diff, rolling mean for each series),
  target-series history (lags, diff, rolling mean),
  cross-series interactions (spread, ratio, product),
  time index, sin/cos(2πt/24), sin/cos(2πt/168) ]
```

### Future-step feature vector (lastFeatureRow)
同样的feature-building logic也用于为`t + 1`（one-step-ahead prediction）生成feature vector：
- 从概念上讲，将下一个time index视为`t_next = n`，其中`n`是observed rows的数量。
- 对`t_next`处每个series的“current”值，重复使用最后一个observed value（index `n - 1`）。
- lag和rolling mean使用observed data最后的`MAX_LAG` / `ROLLING_WINDOW` steps计算。
- time encoding使用`t_next`作为time index。
- 这样得到单个feature vector `lastFeatureRow`，它基于直到最后一个observation为止的全部history来表示下一个time step。

因此，`buildFeatures` function返回：
```text
{
  X: number[][];        // feature matrix for all observed steps
  y: number[];          // target series values for those steps
  lastFeatureRow: number[]; // feature vector representing t + 1
}
```

---


## 🚀 开始使用

### 1. 前置条件
- [Docker Compose](https://docs.docker.com/compose/)

### 2. 构建并启动所有服务：

```bash

# Build the image
docker compose build

# Run the container
docker compose up

```

### 3. 测试：
```bash
docker compose \
-f docker-compose.test.yml up \
--build --exit-code-from \
frontend_test
```

---

## AirPassengers Benchmark

有关公平的16-step protocol和paper-comparison rules，请参阅[`BENCHMARKS.md`](./BENCHMARKS.md)。

repository包含AirPassengers dataset，以及一个用于在经典月度time-series dataset上检查model behavior的benchmark command。

使用Docker Compose运行benchmark：

```bash
docker compose -f docker-compose.test.yml run --rm air_passengers_fair_benchmark
```

JSON output：

```bash
docker compose -f docker-compose.test.yml run --rm air_passengers_fair_benchmark \
  sh -lc 'npm --prefix frontend/app ci && node scripts/benchmark-air-passengers-fair.mjs --algorithm xgboost --json'
```

Seasonal naive baseline：

```bash
docker compose -f docker-compose.test.yml run --rm air_passengers_fair_benchmark \
  sh -lc 'npm --prefix frontend/app ci && node scripts/benchmark-air-passengers-fair.mjs --algorithm seasonal-naive --json'
```


### 16-step holdout benchmark

以下结果对每个可比较model使用完全相同的fixed-origin evaluation protocol：

- train：前128个AirPassengers observations
- holdout：接下来的16个observations
- forecasting过程中不会把任何holdout target value反馈进去
- 通用point metrics：MAE、RMSE、MAPE、sMAPE和MASE

使用以下命令复现benchmark：

```bash
docker compose -f docker-compose.test.yml run --rm \
  air_passengers_fair_benchmark \
  sh -lc '
    npm --prefix frontend/app ci &&
    node scripts/benchmark-air-passengers-fair.mjs --markdown
  '
```

仅LightGBM的AirPassengers evaluation：

```bash
docker compose -f docker-compose.test.yml run --rm \
  lightgbm_air_passengers_benchmark
```

这会使用`--algorithm lightgbm`运行同一个128/16 fixed-origin protocol，因此结果可以与其他AirPassengers rows直接比较。

# 许可证
- Apache License 2.0
