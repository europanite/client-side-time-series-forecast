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


XGBoost, LightGBM, एक प्रायोगिक VARMA-शैली मॉडल और Chronos-2 द्वारा संचालित क्लाइंट-साइड, ब्राउज़र-आधारित टाइम-सीरीज़ फ़ोरकास्ट प्लेग्राउंड।

ऐप CSV या XLSX फ़ाइल लोड करता है, datetime और संख्यात्मक कॉलम का पता लगाता है, आपको फ़ोरकास्टिंग मॉडल चुनने देता है, और देखे गए मानों तथा 16-स्टेप फ़ोरकास्ट दोनों को विज़ुअलाइज़ करता है। आपका डेटा आपके ब्राउज़र में ही रहता है।

---

## अवलोकन

यह एक बहुवेरिएट टाइम-सीरीज़ फ़ोरकास्टिंग टूल है जो पूरी तरह आपके वेब ब्राउज़र में चलता है।
किसी इंस्टॉलेशन, रजिस्ट्रेशन या भुगतान की आवश्यकता नहीं है। 
बस इसे अपने ब्राउज़र में खोलें और उपयोग शुरू करें।
यह छोटे व्यवसायों को अगले दिन के ऑर्डर का अनुमान लगाने में मदद करता है।

- ब्राउज़र में CSV/XLSX टाइम-सीरीज़ डेटासेट लोड करें
- किसी भी संख्यात्मक कॉलम को फ़ोरकास्ट टार्गेट के रूप में चुनें
- XGBoost, LightGBM, एक प्रायोगिक VARMA-शैली मॉडल और pretrained Chronos-2 में से चुनें
- चुने गए मॉडल को ब्राउज़र में स्थानीय रूप से ट्रेन करें
- अगले 16 पॉइंट का फ़ोरकास्ट करें और उन्हें चार्ट में जोड़ें

सब कुछ **आपके ब्राउज़र के अंदर** होता है। कोई backend API नहीं है और कोई डेटा आपकी मशीन से बाहर नहीं जाता।

---

## डेमो

1. GitHub Pages डेमो खोलें:  
   https://europanite.github.io/client-side-time-series-forecast-ai/

2. [`data/sample_data.csv`](./data/datsample_data.csv) या [`data/sample_data.xlsx`](./data/sample_data.xlsx) जैसी सैंपल फ़ाइल अपलोड करें।
3. ऐप:
   - एक **datetime-जैसे कॉलम** का पता लगाएगा
   - उपलब्ध संख्यात्मक कॉलम सूचीबद्ध करेगा
4. एक संख्यात्मक कॉलम को **target** के रूप में चुनें।
5. एक **forecast model** चुनें। `XGBoost` डिफ़ॉल्ट है, `LightGBM` एक वैकल्पिक स्थानीय रूप से प्रशिक्षित GBDT है, `VARMA experimental` एक हल्का multivariate baseline है, और `Chronos-2 pretrained` एक zero-shot foundation model है।
6. XGBoost, LightGBM या VARMA के लिए पहले **Train** पर क्लिक करें। Chronos-2 पहले से pretrained है और इसे स्थानीय training की आवश्यकता नहीं है। फिर अगले 16 पॉइंट का अनुमान लगाने के लिए **Forecast +16** पर क्लिक करें।
7. observed series और forecast line की तुलना करने के लिए चार्ट देखें।

---

## डेटा संरचना

<pre>
datetime,item_a,item_b,item_c,...
2025-01-01 00:00:00+09:00,10,20,31,...
2025-01-02 00:00:00+09:00,12,19,31,...
2025-01-03 00:00:00+09:00,14,18,33,...
 ...
</pre>

### आवश्यकताएँ:

##### एक datetime-जैसा कॉलम
कॉलम हेडर में "date" या "time" होता है (case-insensitive)।
इसे time axis के रूप में उपयोग किया जाता है, लेकिन सीधे numeric features में नहीं बदला जाता।

##### एक या अधिक संख्यात्मक कॉलम
इन कॉलमों का उपयोग target और/या exogenous features के रूप में किया जाता है।
ऐप तीन स्थानीय रूप से फिट किए जाने वाले forecasting modes का समर्थन करता है:

- **XGBoost**: आप एक संख्यात्मक कॉलम को target के रूप में चुनते हैं, और अन्य संख्यात्मक कॉलम अतिरिक्त signals के रूप में उपयोग होते हैं।
- **LightGBM**: XGBoost के समान target और engineered multivariate features का उपयोग करता है, लेकिन LightGBM regressor फिट करता है।
- **VARMA experimental**: सभी संख्यात्मक कॉलमों को साथ में मॉडल किया जाता है, और चुना गया target column forecast output के रूप में दिखाया जाता है।

---

## फ़ोरकास्टिंग दृष्टिकोण

यह प्रोजेक्ट जानबूझकर अलग-अलग मान्यताओं वाले चार forecasting algorithms उपलब्ध कराता है:

| मॉडल | Learning style | क्या कई input series उपयोग होती हैं? | Local training? | Forecast style |
| --- | --- | --- | --- | --- |
| XGBoost | engineered time-series features पर gradient-boosted decision-tree regression | हाँ | हाँ | Recursive one-step forecasting |
| LightGBM | XGBoost के समान engineered features पर histogram-based gradient-boosted decision-tree regression | हाँ | हाँ | Recursive one-step forecasting |
| VARMA experimental | ridge regularization, residual correction और seasonal stabilization के साथ linear multi-output autoregression | हाँ, संयुक्त रूप से | हाँ | Recursive multi-output forecasting |
| Chronos-2-small INT8 ONNX | Pretrained patch-based time-series foundation model | वर्तमान UI में केवल चुना गया target | नहीं | Direct probabilistic multi-step forecasting |

इन मॉडलों को एक ही algorithm के चार implementations के रूप में नहीं समझना चाहिए। XGBoost और LightGBM टाइम सीरीज़ को एक ही supervised tabular-learning problem में बदलते हैं, VARMA कई series के lagged vectors को संयुक्त रूप से मॉडल करता है, और Chronos-2 uploaded dataset पर नए parameters फिट किए बिना pretrained neural forecasting model का उपयोग करता है।

### मॉडल चयन

#### XGBoost

`XGBoost` डिफ़ॉल्ट स्थानीय रूप से प्रशिक्षित मॉडल है। XGBoost एक gradient-boosted decision-tree algorithm है: कई decision trees क्रमशः जोड़े जाते हैं, और प्रत्येक नया tree पिछले ensemble की बची हुई त्रुटियों को कम करता है। टाइम सीरीज़ को सीधे XGBoost में पास नहीं किया जाता। यह प्रोजेक्ट पहले प्रत्येक time step को feature vector में बदलता है और फिर XGBoost को regression model के रूप में train करता है।

ब्राउज़र implementation में उपयोग होता है:

- target और exogenous lags, `MAX_LAG = 3` तक
- first differences
- `ROLLING_WINDOW = 7` rolling mean
- numeric series के बीच spread, ratio और product interactions
- time index
- periods 24 और 168 वाले Fourier features
- depth 4, learning rate 0.1, subsample 0.8 और 200 boosting iterations के साथ `gbtree`

16-step forecast के लिए मॉडल एक बार में एक step predict करता है। हर prediction working history में जोड़ी जाती है और इसलिए अगले step के लिए उपलब्ध होती है। Raw XGBoost prediction को seasonal continuation estimate के साथ blend भी किया जाता है। Non-target numeric context को स्थिर रखने के बजाय आगे बढ़ाया जाता है।

**मजबूतियाँ**

- series के बीच nonlinear relationships और interactions को पकड़ता है
- प्रोजेक्ट के hand-engineered multivariate features के साथ स्वाभाविक रूप से काम करता है
- ब्राउज़र में स्थानीय रूप से और अपेक्षाकृत तेज़ी से train होता है
- बड़े pretrained model download की आवश्यकता नहीं है

**सीमाएँ**

- forecasting quality चुनी गई feature engineering पर निर्भर करती है
- recursive forecasting में बाद के steps पर errors जमा हो सकती हैं
- fixed Fourier periods और seasonal continuation application-level assumptions हैं, अपने-आप सीखी गई calendar structure नहीं

XGBoost का उपयोग तब करें जब आपको एक हल्का, स्थानीय रूप से प्रशिक्षित nonlinear model चाहिए जो कई numeric columns के बीच संबंधों का लाभ उठा सके।

#### LightGBM

`LightGBM` दूसरा स्थानीय रूप से प्रशिक्षित gradient-boosted decision-tree model है। ब्राउज़र implementation `@wlearn/lightgbm`, यानी LightGBM का WebAssembly build, उपयोग करता है और जानबूझकर XGBoost के समान `buildFeatures()` output तथा 16-step recursive forecasting path को पुनः उपयोग करता है।

डिफ़ॉल्ट LightGBM configuration regression, learning rate 0.1, 31 leaves, max depth 4, subsample 0.8 और 200 boosting rounds का उपयोग करती है। Raw tree prediction को XGBoost में उपयोग होने वाले उसी seasonal continuation estimate के साथ blend किया जाता है।

LightGBM का उपयोग तब करें जब आप feature pipeline और application-level forecast protocol को स्थिर रखते हुए सीधे तुलना योग्य histogram-based GBDT alternative चाहते हों।

#### VARMA experimental

`VARMA experimental` एक हल्का browser-native multivariate baseline है। नाम के बावजूद यह implementation **पूर्ण statistical maximum-likelihood VARMA estimator नहीं है**। यह एक regularized VAR-style model के अधिक निकट है, जिसमें छोटी residual correction और explicit seasonal stabilization है।

Implementation:

1. अधिकतम 8 numeric series चुनता है और उन्हें standardize करता है;
2. पिछले 7 multivariate vectors को जोड़कर एक lag feature vector बनाता है;
3. multi-output ridge regression (`ridge = 1e-2`) के साथ सभी output series को एक साथ फिट करता है;
4. हाल के residuals से एक छोटी correction estimate करता है (`maLag = 1`);
5. forecasting के दौरान autoregressive output को seasonal lag के vector के साथ blend करता है (`seasonalLag = 7`, `seasonalBlend = 0.55`);
6. predicted vector को recursively अगले forecast step में वापस feed करता है।

क्योंकि हर step पर पूरा numeric vector predict किया जाता है, VARMA केवल चुने गए target को forecast करने के बजाय सभी modeled series को साथ में आगे बढ़ाता है।

**मजबूतियाँ**

- सरल और computationally inexpensive
- कई numeric series को संयुक्त रूप से model करता है
- XGBoost और Chronos-2 के मुकाबले उपयोगी linear/classical-style baseline देता है
- अलग model download के बिना पूरी तरह TypeScript में चलता है

**सीमाएँ**

- कम से कम दो numeric series और 7 से अधिक usable rows की आवश्यकता होती है
- मुख्यतः linear lag relationships मानता है
- residual correction और seasonal blending व्यावहारिक stabilizers हैं, पूर्ण moving-average estimation procedure नहीं
- इसे statistical VARMA के reference implementation के रूप में प्रस्तुत नहीं किया जाना चाहिए

`VARMA experimental` का उपयोग मुख्यतः transparent multivariate baseline के रूप में करें, जब कई series साथ में चलती हों।

#### Chronos-2 pretrained

`Chronos-2 pretrained` ऊपर के locally fitted models से मूल रूप से अलग है। Chronos-2 एक pretrained, patch-based time-series foundation model है जो सीधे multi-step **quantile forecasts** उत्पन्न करता है। यह repository `Chronos-2-small INT8` को ONNX Runtime Web के साथ ONNX model के रूप में चलाती है, इसलिए model download होने के बाद inference स्थानीय रूप से किया जाता है।

वर्तमान browser integration:

- uploaded dataset पर **train नहीं** करता;
- Chronos context के रूप में केवल चुनी गई target series का उपयोग करता है;
- कम से कम 16 numeric target observations की आवश्यकता होती है;
- अधिकतम 5,760 context observations रखता है;
- input को 16-point patches में समूहित करता है और अपूर्ण first patch को बाईं ओर `NaN` से pad करता है;
- ONNX graph का internal 672-step output (`42 × 16`) चलाता है और UI में पहले 16 steps दिखाता है;
- model का quantile output पढ़ता है और median (`p50`) forecast के साथ `p10` और `p90` uncertainty bounds दिखाता है।

Chronos-2 स्वयं अधिक समृद्ध multivariate और covariate-informed forecasting का समर्थन करता है, लेकिन **वर्तमान UI अभी उन क्षमताओं का उपयोग नहीं करता**। इसलिए वर्तमान Chronos implementation को अन्यथा multivariate application के भीतर pretrained univariate target forecaster के रूप में समझना चाहिए।

**मजबूतियाँ**

- zero-shot forecasting: प्रत्येक dataset के लिए model fitting की आवश्यकता नहीं
- one-step models को recursively फिट करने के बजाय पूरा forecast horizon सीधे predict करता है
- forecast quantiles के माध्यम से probabilistic information देता है
- बड़े पैमाने की pretraining के दौरान सीखे गए patterns को नई series में transfer कर सकता है

**सीमाएँ**

- पहले उपयोग से पहले model download करना आवश्यक है
- ब्राउज़र INT8 ONNX export उपयोग करता है, इसलिए results पूर्ण-precision official checkpoint से बिल्कुल मेल खाना आवश्यक नहीं
- वर्तमान UI Chronos-2 को कॉल करते समय अतिरिक्त numeric columns को ignore करता है
- browser memory और WASM execution model size और context length पर व्यावहारिक सीमाएँ लगाते हैं

Repository के वर्तमान AirPassengers 128/16 holdout benchmark में `Chronos-2-small INT8 ONNX` ने comparable models में सबसे कम MAE, RMSE, MAPE, sMAPE और MASE हासिल किए। मापे गए values और evaluation protocol के लिए नीचे benchmark section देखें।

### 16-step forecast

Application-level default horizon 16 है क्योंकि integrated Chronos-2 ONNX model 16-point patches उपयोग करता है, और तुलना के लिए XGBoost, LightGBM तथा VARMA APIs को उसी horizon पर align किया गया है।

Algorithms उन 16 points तक अलग-अलग तरीकों से पहुँचते हैं:

- **XGBoost** recursively predict करता है। हर predicted target value अगले step के history का हिस्सा बनती है, जबकि non-target context भी आगे बढ़ता है।
- **LightGBM** XGBoost के समान engineered feature pipeline और recursive application-level forecast policy का उपयोग करता है।
- **VARMA experimental** पूरा multivariate vector recursively predict करता है और उस predicted vector को अगले step में feed करता है।
- **Chronos-2** direct multi-step probabilistic inference करता है और pretrained model output से पहले 16 future positions लौटाता है।

Models की तुलना करते समय यह अंतर महत्वपूर्ण है: XGBoost, LightGBM और VARMA recursive forecast error जमा कर सकते हैं, जबकि Chronos-2 requested future sequence सीधे generate करता है।

---

## Feature Engineering (XGBoost / LightGBM)

इस section के hand-engineered features XGBoost और LightGBM दोनों pipelines पर लागू होते हैं। VARMA normalized lag vectors का सीधे उपयोग करता है, जबकि Chronos-2 इन features के बिना चुनी गई target sequence पर काम करता है।

Tree-boosting pipelines input को छोटी multi-variate time series के रूप में मानती हैं:

- एक *datetime-like* column (header में किसी भी case में `date` या `time` शामिल हो)।
- कई numeric columns (जैसे `item_a`, `item_b`, `item_c`, ...)।
- numeric columns में से एक को forecast करने के लिए **target** चुना जाता है।

अंदरूनी रूप से feature builder हर time step `t` के लिए एक **rich feature vector** और `t + 1` के लिए एक **future feature vector** बनाता है। सभी features **पूरी तरह client पर**, JavaScript/TypeScript में compute होते हैं।

### Features के लिए उपयोग होने वाली series

- `datetimeKey`  
  - `"date"` या `"time"` वाले header से स्वतः detect होता है।
  - केवल time axis पता करने के लिए उपयोग होता है; सीधे numeric feature के रूप में उपयोग नहीं होता।
- `targetKey`  
  - वह numeric column जिसे user forecast करने के लिए चुनता है।
- `featureKeys`  
  - अन्य सभी numeric columns (non-datetime, non-target)।
  - इन्हें **exogenous series** माना जाता है।

अंदरूनी रूप से हम `seriesMap: Record<string, number[]>` रखते हैं, जिसमें प्रत्येक series के लिए एक numeric array होता है।

### Per-series features (exogenous series)

हर exogenous series `x(t)` (`featureKeys` की हर key) और हर time step `t` के लिए हम compute करते हैं:

1. **समकालीन मान**
   - `x(t)` (time index `t` पर value)।

2. **Lag features (history)**
   - `MAX_LAG = 3` तक:
     - `x(t - 1)`
     - `x(t - 2)`
     - `x(t - 3)`
   - इससे model हर series की short-term temporal dynamics सीख सकता है।

3. **First difference**
   - `x(t) - x(t - 1)`
   - केवल absolute level के बजाय local changes (trend / slope) को capture करता है।

4. **Rolling mean (local average)**
   - `ROLLING_WINDOW = 7` time steps की rolling window:
     - `mean(x[t - 6 ... t])` (series की शुरुआत के पास truncated)
   - local trend / baseline level दर्शाता है और short-term noise को smooth करता है।

> यदि series window से छोटी है, तो code window को स्वतः छोटा कर देता है ताकि `t` तक उपलब्ध सभी past points उपयोग किए जाएँ।

### Target-series history

**target series** `y(t)` के लिए हम current value `y(t)` को feature के रूप में शामिल **नहीं** करते (क्योंकि वही उस step का label है), लेकिन उसका history शामिल करते हैं:

1. **Target lags**
   - `y(t - 1)`
   - `y(t - 2)`
   - `y(t - 3)`

2. **Target difference**
   - `y(t) - y(t - 1)`

3. **Target rolling mean**
   - ऊपर वाली same rolling window:
     - `mean(y[t - 6 ... t])`

इससे model “अगला value पिछले कुछ values और उनके local trend पर निर्भर करता है” जैसे patterns सीख सकता है, जो time-series forecasting में सामान्य है।

### Cross-series interactions

**अलग-अलग series के बीच relationships** पकड़ने के लिए, हम प्रत्येक **numeric series के pair** (target सहित) के लिए interaction features बनाते हैं:

- मान लें `v_i(t)` और `v_j(t)` time `t` पर दो series के contemporaneous values हैं।
- हर ordered pair `(i, j)` जहाँ `i < j`, के लिए हम compute करते हैं:

1. **Spread**
   - `v_i(t) - v_j(t)`
   - series के बीच relative level differences encode करता है।

2. **Ratio**
   - `v_i(t) / v_j(t)`
   - division by zero से बचने के लिए आवश्यकता होने पर denominator में छोटा epsilon शामिल किया जाता है:
     - `denom = |v_j| < 1e-9 ? sign(v_j) * 1e-9 : v_j`
   - relative scale और proportionality encode करता है।

3. **Product**
   - `v_i(t) * v_j(t)`
   - model को ऐसे “interaction effects” व्यक्त करने देता है जहाँ दोनों series का बड़ा या छोटा होना मायने रखता है।

ये cross-series features केवल individual series values पर निर्भर रहने के बजाय booster के सामने **multi-series structure** स्पष्ट रूप से रखते हैं।

### Time index और Fourier features

हम time को भी numeric features के रूप में encode करते हैं:

1. **Time index**
   - Integer index `t = 0, 1, 2, ...` (row index)।
   - booster को global trends model करने का सरल तरीका देता है।

2. **Fourier features** (cyclical patterns)
   - दो fixed periods (“rows की संख्या” की units में):
     - Period 24 (उदाहरण: hourly data में 24 hours)
     - Period 168 (उदाहरण: 7 days × 24 hours)
   - प्रत्येक period `P` के लिए हम compute करते हैं:
     - `sin(2πt / P)`
     - `cos(2πt / P)`
   - यह seasonality/cycles को ऐसे रूप में embed करने का standard तरीका है जिसका tree models भी लाभ उठा सकते हैं।

हर time step `t` के लिए final feature vector है:

```text
[ exogenous features (current, lags, diff, rolling mean for each series),
  target-series history (lags, diff, rolling mean),
  cross-series interactions (spread, ratio, product),
  time index, sin/cos(2πt/24), sin/cos(2πt/168) ]
```

### Future-step feature vector (lastFeatureRow)
`t + 1` (one-step-ahead prediction) के लिए feature vector बनाने में वही feature-building logic उपयोग होती है:
- Conceptually, next time index को `t_next = n` माना जाता है, जहाँ `n` observed rows की संख्या है।
- `t_next` पर हर series के “current” values के लिए last observed value (index `n - 1`) फिर से उपयोग किया जाता है।
- Lags और rolling means observed data के अंतिम `MAX_LAG` / `ROLLING_WINDOW` steps से compute होते हैं।
- Time encodings में `t_next` time index के रूप में उपयोग होता है।
- इससे एक single feature vector `lastFeatureRow` मिलता है जो अंतिम observation तक के पूरे history के आधार पर next time step को represent करता है।

इसलिए `buildFeatures` function लौटाता है:
```text
{
  X: number[][];        // feature matrix for all observed steps
  y: number[];          // target series values for those steps
  lastFeatureRow: number[]; // feature vector representing t + 1
}
```

---


## 🚀 शुरुआत कैसे करें

### 1. पूर्वापेक्षाएँ
- [Docker Compose](https://docs.docker.com/compose/)

### 2. सभी services build और start करें:

```bash

# Build the image
docker compose build

# Run the container
docker compose up

```

### 3. टेस्ट:
```bash
docker compose \
-f docker-compose.test.yml up \
--build --exit-code-from \
frontend_test
```

---

## AirPassengers Benchmark

Fair 16-step protocol और paper-comparison rules के लिए [`BENCHMARKS.md`](./BENCHMARKS.md) देखें।

Repository में AirPassengers dataset और classic monthly time-series dataset पर model behavior जाँचने के लिए benchmark command शामिल है।

Docker Compose के साथ benchmark चलाएँ:

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

नीचे दिए गए results हर comparable model के लिए समान fixed-origin evaluation protocol उपयोग करते हैं:

- train: पहले 128 AirPassengers observations
- holdout: अगले 16 observations
- forecasting के दौरान कोई holdout target value वापस feed नहीं की जाती
- common point metrics: MAE, RMSE, MAPE, sMAPE और MASE

Benchmark reproduce करें:

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

यह समान 128/16 fixed-origin protocol को `--algorithm lightgbm` के साथ चलाता है, इसलिए result अन्य AirPassengers rows से सीधे comparable है।

# लाइसेंस
- Apache License 2.0
