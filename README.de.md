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

[![▶ Watch the 40-second demo](https://img.youtube.com/vi/WOp5e3M96Ww/hqdefault.jpg)](https://youtu.be/WOp5e3M96Ww)

## PlayGround

[▶ Open the browser-based forecasting app](https://europanite.github.io/client-side-time-series-forecast-ai/)

Ein clientseitiger, browserbasierter Playground für Zeitreihenprognosen mit XGBoost, LightGBM, einem experimentellen VARMA-ähnlichen Modell und Chronos-2.

Die Anwendung lädt eine CSV- oder XLSX-Datei, erkennt datetime- und numerische Spalten, lässt dich ein Prognosemodell auswählen und visualisiert sowohl beobachtete Werte als auch eine 16-Schritte-Prognose. Deine Daten bleiben im Browser.

---

## Überblick

Dies ist ein multivariates Werkzeug zur Zeitreihenprognose, das vollständig in deinem Webbrowser läuft.
Keine Installation, Registrierung oder Zahlung erforderlich. 
Einfach im Browser aufrufen und loslegen.
Es hilft kleinen Unternehmen dabei, die Bestellungen für den nächsten Tag vorherzusagen.

- CSV/XLSX-Zeitreihendatensätze im Browser laden
- Eine beliebige numerische Spalte als Prognoseziel auswählen
- Zwischen XGBoost, LightGBM, einem experimentellen VARMA-ähnlichen Modell und dem vortrainierten Chronos-2 wählen
- Das ausgewählte Modell lokal im Browser trainieren
- Die nächsten 16 Punkte prognostizieren und an das Diagramm anhängen

Alles geschieht **in deinem Browser**. Es gibt keine Backend-API und keine Daten verlassen deinen Rechner.

---

## Demo

1. Öffne die GitHub-Pages-Demo:  
   https://europanite.github.io/client-side-time-series-forecast-ai/
2. Lade eine Beispieldatei wie [`data/sample_data.csv`](./data/datsample_data.csv) oder [`data/sample_data.xlsx`](./data/sample_data.xlsx) hoch.
3. Die Anwendung:
   - erkennt eine **datetime-ähnliche Spalte**
   - listet verfügbare numerische Spalten auf
4. Wähle eine numerische Spalte als **target** aus.
5. Wähle ein **forecast model**. `XGBoost` ist die Standardeinstellung, `LightGBM` eine alternativ lokal trainierte GBDT-Variante, `VARMA experimental` ein leichtgewichtiger multivariater Baseline-Ansatz und `Chronos-2 pretrained` ein zero-shot foundation model.
6. Klicke bei XGBoost, LightGBM oder VARMA zuerst auf **Train**. Chronos-2 ist bereits vortrainiert und benötigt kein lokales Training. Klicke anschließend auf **Forecast +16**, um die nächsten 16 Punkte vorherzusagen.
7. Prüfe das Diagramm, um die beobachtete Serie mit der Prognoselinie zu vergleichen.

---

## Datenstruktur

<pre>
datetime,item_a,item_b,item_c,...
2025-01-01 00:00:00+09:00,10,20,31,...
2025-01-02 00:00:00+09:00,12,19,31,...
2025-01-03 00:00:00+09:00,14,18,33,...
 ...
</pre>

### Anforderungen:

##### Eine datetime-ähnliche Spalte
Der Spaltenkopf enthält "date" oder "time" (Groß-/Kleinschreibung wird ignoriert).
Sie wird als Zeitachse verwendet, aber nicht direkt in numerische Features umgewandelt.

##### Eine oder mehrere numerische Spalten
Diese Spalten werden als target und/oder exogenous features verwendet.
Die Anwendung unterstützt drei lokal angepasste Prognosemodi:

- **XGBoost**: Du wählst eine numerische Spalte als target; die übrigen numerischen Spalten dienen als zusätzliche Signale.
- **LightGBM**: Verwendet dasselbe target und dieselben konstruierten multivariaten Features wie XGBoost, passt jedoch einen LightGBM regressor an.
- **VARMA experimental**: Alle numerischen Spalten werden gemeinsam modelliert, und die ausgewählte target-Spalte wird als Prognoseausgabe angezeigt.

---

## Prognoseansatz

Das Projekt stellt vier Prognosealgorithmen mit bewusst unterschiedlichen Annahmen bereit:

| Modell | Lernstil | Verwendet mehrere Eingabeserien? | Lokales Training? | Prognosestil |
| --- | --- | --- | --- | --- |
| XGBoost | Gradient-Boosting-Entscheidungsbaumregression über konstruierte Zeitreihen-Features | Ja | Ja | Rekursive Ein-Schritt-Prognose |
| LightGBM | Histogrammbasierte Gradient-Boosting-Entscheidungsbaumregression über dieselben konstruierten Features wie XGBoost | Ja | Ja | Rekursive Ein-Schritt-Prognose |
| VARMA experimental | Lineare multi-output Autoregression mit ridge regularization, residual correction und seasonal stabilization | Ja, gemeinsam | Ja | Rekursive multi-output Prognose |
| Chronos-2-small INT8 ONNX | Vortrainiertes patch-based time-series foundation model | In der aktuellen UI nur das ausgewählte target | Nein | Direkte probabilistische multi-step Prognose |

Diese Modelle sollten nicht als vier Implementierungen desselben Algorithmus verstanden werden. XGBoost und LightGBM wandeln die Zeitreihe in dasselbe überwachte tabellarische Lernproblem um, VARMA modelliert verzögerte Vektoren mehrerer Serien gemeinsam und Chronos-2 verwendet ein vortrainiertes neuronales Prognosemodell, ohne neue Parameter an den hochgeladenen Datensatz anzupassen.

### Modellauswahl

#### XGBoost

`XGBoost` ist das standardmäßige lokal trainierte Modell. XGBoost ist ein gradient-boosted decision-tree algorithm: Viele Entscheidungsbäume werden nacheinander hinzugefügt, wobei jeder neue Baum Fehler reduziert, die das vorherige Ensemble übrig gelassen hat. Zeitreihen werden nicht direkt an XGBoost übergeben. Dieses Projekt wandelt zunächst jeden time step in einen feature vector um und trainiert XGBoost anschließend als Regressionsmodell.

Die Browserimplementierung verwendet:

- target- und exogenous lags bis `MAX_LAG = 3`
- first differences
- einen rolling mean mit `ROLLING_WINDOW = 7`
- spread-, ratio- und product-interactions zwischen numerischen Serien
- einen time index
- Fourier features mit den Perioden 24 und 168
- `gbtree` mit depth 4, learning rate 0.1, subsample 0.8 und 200 boosting iterations

Für eine 16-Schritte-Prognose sagt das Modell jeweils einen Schritt voraus. Jede Vorhersage wird an den Arbeitshistorienverlauf angehängt und steht dadurch für den nächsten Schritt zur Verfügung. Die rohe XGBoost prediction wird außerdem mit einer seasonal continuation estimate gemischt. Nicht zum target gehörender numeric context wird fortgeschrieben, statt konstant gehalten zu werden.

**Stärken**

- erfasst nichtlineare Beziehungen und Interaktionen zwischen Serien
- arbeitet natürlich mit den hand-engineered multivariate features des Projekts
- trainiert lokal und relativ schnell im Browser
- erfordert keinen Download eines großen vortrainierten Modells

**Einschränkungen**

- die Prognosequalität hängt von der gewählten feature engineering ab
- rekursive Prognosen können bei späteren Schritten Fehler aufsummieren
- die festen Fourier-Perioden und die seasonal continuation sind Annahmen auf Anwendungsebene und keine automatisch gelernte Kalenderstruktur

Verwende XGBoost, wenn du ein leichtgewichtiges, lokal trainiertes nichtlineares Modell möchtest, das Beziehungen zwischen mehreren numerischen Spalten ausnutzen kann.

#### LightGBM

`LightGBM` ist ein zweites lokal trainiertes gradient-boosted decision-tree model. Die Browserimplementierung verwendet `@wlearn/lightgbm`, einen WebAssembly-Build von LightGBM, und nutzt absichtlich dieselbe `buildFeatures()`-Ausgabe sowie denselben rekursiven 16-Schritte-Prognosepfad wie XGBoost.

Die Standardkonfiguration von LightGBM verwendet regression, learning rate 0.1, 31 leaves, max depth 4, subsample 0.8 und 200 boosting rounds. Die rohe tree prediction wird mit derselben seasonal continuation estimate gemischt, die auch bei XGBoost verwendet wird.

Verwende LightGBM, wenn du eine direkt vergleichbare histogram-based GBDT alternative möchtest und dabei feature pipeline sowie application-level forecast protocol unverändert lassen willst.

#### VARMA experimental

`VARMA experimental` ist ein leichtgewichtiger browser-native multivariater Baseline-Ansatz. Trotz des Namens ist diese Implementierung **kein vollständiger statistischer maximum-likelihood VARMA estimator**. Sie ähnelt eher einem regularized VAR-style model mit einer kleinen residual correction und expliziter seasonal stabilization.

Die Implementierung:

1. wählt bis zu 8 numerische Serien aus und standardisiert sie;
2. verkettet die vorherigen 7 multivariaten Vektoren zu einem lag feature vector;
3. passt alle Ausgabeserien gleichzeitig mit multi-output ridge regression (`ridge = 1e-2`) an;
4. schätzt eine kleine Korrektur aus jüngsten Residuen (`maLag = 1`);
5. mischt während der Prognose die autoregressive Ausgabe mit dem Vektor des seasonal lag (`seasonalLag = 7`, `seasonalBlend = 0.55`);
6. speist den vorhergesagten Vektor rekursiv in den nächsten Prognoseschritt zurück.

Da in jedem Schritt der vollständige numerische Vektor vorhergesagt wird, schreibt VARMA alle modellierten Serien gemeinsam fort, anstatt nur das ausgewählte target zu prognostizieren.

**Stärken**

- einfach und rechnerisch günstig
- modelliert mehrere numerische Serien gemeinsam
- bietet einen nützlichen linear/classical-style baseline gegenüber XGBoost und Chronos-2
- läuft vollständig in TypeScript ohne separaten Modelldownload

**Einschränkungen**

- benötigt mindestens zwei numerische Serien und mehr als 7 nutzbare Zeilen
- nimmt überwiegend lineare lag-Beziehungen an
- residual correction und seasonal blending sind pragmatische Stabilisatoren, kein vollständiges moving-average estimation procedure
- sollte nicht als Referenzimplementierung eines statistischen VARMA dargestellt werden

Verwende `VARMA experimental` hauptsächlich als transparenten multivariaten Baseline-Ansatz, wenn sich mehrere Serien gemeinsam bewegen.

#### Chronos-2 pretrained

`Chronos-2 pretrained` unterscheidet sich grundlegend von den oben lokal angepassten Modellen. Chronos-2 ist ein vortrainiertes patch-based time-series foundation model, das direkte multi-step **quantile forecasts** erzeugt. Dieses repository führt `Chronos-2-small INT8` als ONNX model mit ONNX Runtime Web aus, sodass die inference lokal erfolgt, nachdem das Modell heruntergeladen wurde.

Die aktuelle Browserintegration:

- trainiert **nicht** auf dem hochgeladenen Datensatz;
- verwendet nur die ausgewählte target series als Chronos-Kontext;
- benötigt mindestens 16 numerische target observations;
- behält höchstens 5.760 context observations;
- gruppiert die Eingabe in 16-point patches und füllt einen unvollständigen ersten patch links mit `NaN` auf;
- führt die interne 672-step output des ONNX graph (`42 × 16`) aus und stellt der UI die ersten 16 steps bereit;
- liest die quantile output des Modells und zeigt den median (`p50`) forecast zusammen mit den Unsicherheitsgrenzen `p10` und `p90` an.

Chronos-2 selbst unterstützt umfassendere multivariate und covariate-informed forecasting, aber **die aktuelle UI nutzt diese Fähigkeiten noch nicht**. Daher sollte die derzeitige Chronos-Implementierung als vortrainierter univariater target forecaster innerhalb einer ansonsten multivariaten Anwendung verstanden werden.

**Stärken**

- zero-shot forecasting: keine modellspezifische Anpassung pro Datensatz erforderlich
- sagt den gesamten Prognosehorizont direkt voraus, statt rekursiv one-step models anzupassen
- liefert probabilistische Informationen über forecast quantiles
- kann bei groß angelegtem Pretraining gelernte Muster auf eine neue Serie übertragen

**Einschränkungen**

- das Modell muss vor der ersten Nutzung heruntergeladen werden
- der Browser verwendet einen INT8 ONNX export, daher müssen die Ergebnisse nicht exakt mit einem full-precision official checkpoint übereinstimmen
- die aktuelle UI ignoriert zusätzliche numerische Spalten beim Aufruf von Chronos-2
- browser memory und WASM execution setzen praktische Grenzen für model size und context length

Im aktuellen AirPassengers 128/16 holdout benchmark des repository erzielte `Chronos-2-small INT8 ONNX` unter den vergleichbaren Modellen die niedrigsten Werte für MAE, RMSE, MAPE, sMAPE und MASE. Die gemessenen Werte und das evaluation protocol findest du im Benchmark-Abschnitt weiter unten.

### 16-Schritte-Prognose

Der application-level Standardhorizont beträgt 16, weil das integrierte Chronos-2 ONNX model 16-point patches verwendet und die XGBoost-, LightGBM- und VARMA-APIs für den Vergleich auf denselben Horizont ausgerichtet sind.

Die Algorithmen gelangen auf unterschiedliche Weise zu diesen 16 Punkten:

- **XGBoost** prognostiziert rekursiv. Jeder vorhergesagte target value wird Teil der Historie für den nächsten Schritt, während auch der non-target context fortgeschrieben wird.
- **LightGBM** verwendet dieselbe engineered feature pipeline und dieselbe recursive application-level forecast policy wie XGBoost.
- **VARMA experimental** prognostiziert rekursiv einen vollständigen multivariaten Vektor und speist diesen vorhergesagten Vektor in den nächsten Schritt ein.
- **Chronos-2** führt direkte multi-step probabilistic inference aus und gibt die ersten 16 zukünftigen Positionen aus der Ausgabe des vortrainierten Modells zurück.

Dieser Unterschied ist beim Modellvergleich wichtig: XGBoost, LightGBM und VARMA können recursive forecast error aufsummieren, während Chronos-2 die angeforderte zukünftige Sequenz direkt erzeugt.

---

## Feature Engineering (XGBoost / LightGBM)

Die hand-engineered features in diesem Abschnitt gelten sowohl für die XGBoost- als auch für die LightGBM-Pipeline. VARMA verwendet normalisierte lag vectors direkt, während Chronos-2 ohne diese Features auf der ausgewählten target sequence arbeitet.

Die tree-boosting pipelines behandeln die Eingabe als kleine multi-variate time series:

- Eine *datetime-like* column (der header enthält `date` oder `time`, unabhängig von Groß-/Kleinschreibung).
- Mehrere numeric columns (z. B. `item_a`, `item_b`, `item_c`, ...).
- Eine der numerischen Spalten wird als **target** für die Prognose ausgewählt.

Intern erstellt der feature builder für jeden time step `t` einen **rich feature vector** und für `t + 1` einen **future feature vector**. Alle features werden **vollständig clientseitig** in JavaScript/TypeScript berechnet.

### Für Features verwendete Serien

- `datetimeKey`  
  - Wird automatisch aus dem header erkannt, der `"date"` oder `"time"` enthält.
  - Wird nur zur Bestimmung der Zeitachse verwendet und nicht direkt als numerisches Feature.
- `targetKey`  
  - Die numerische Spalte, die der Benutzer prognostizieren möchte.
- `featureKeys`  
  - Alle anderen numerischen Spalten (non-datetime, non-target).
  - Werden als **exogenous series** behandelt.

Intern halten wir ein `seriesMap: Record<string, number[]>` mit einem numerischen Array pro Serie.

### Features pro Serie (exogenous series)

Für jede exogenous series `x(t)` (jeden key in `featureKeys`) und jeden time step `t` berechnen wir:

1. **Zeitgleicher Wert**
   - `x(t)` (der Wert am time index `t`).

2. **Lag features (history)**
   - Bis `MAX_LAG = 3`:
     - `x(t - 1)`
     - `x(t - 2)`
     - `x(t - 3)`
   - Dadurch kann das Modell kurzfristige zeitliche Dynamiken pro Serie lernen.

3. **First difference**
   - `x(t) - x(t - 1)`
   - Erfasst lokale Veränderungen (trend / slope) statt nur das absolute Niveau.

4. **Rolling mean (local average)**
   - Rolling window von `ROLLING_WINDOW = 7` time steps:
     - `mean(x[t - 6 ... t])` (nahe dem Serienanfang verkürzt)
   - Repräsentiert lokalen Trend / baseline level und glättet kurzfristiges Rauschen.

> Ist die Serie kürzer als das Fenster, verkleinert der Code das Fenster automatisch, sodass alle verfügbaren vergangenen Punkte bis `t` verwendet werden.

### Historie der target series

Für die **target series** `y(t)` selbst nehmen wir den aktuellen Wert `y(t)` **nicht** als Feature auf (da er das Label dieses Schritts ist), wohl aber ihre Historie:

1. **Target lags**
   - `y(t - 1)`
   - `y(t - 2)`
   - `y(t - 3)`

2. **Target difference**
   - `y(t) - y(t - 1)`

3. **Target rolling mean**
   - Dasselbe rolling window wie oben:
     - `mean(y[t - 6 ... t])`

So kann das Modell Muster wie „der nächste Wert hängt von den letzten Werten und ihrem lokalen Trend ab“ lernen, was für Zeitreihenprognosen typisch ist.

### Cross-series interactions

Um **Beziehungen zwischen verschiedenen Serien** zu erfassen, erstellen wir interaction features für jedes **Paar numerischer Serien** (einschließlich target):

- Seien `v_i(t)` und `v_j(t)` die zeitgleichen Werte zweier Serien zum Zeitpunkt `t`.
- Für jedes geordnete Paar `(i, j)` mit `i < j` berechnen wir:

1. **Spread**
   - `v_i(t) - v_j(t)`
   - Kodiert relative Niveauunterschiede zwischen Serien.

2. **Ratio**
   - `v_i(t) / v_j(t)`
   - Um Division durch null zu vermeiden, enthält der Nenner bei Bedarf ein kleines epsilon:
     - `denom = |v_j| < 1e-9 ? sign(v_j) * 1e-9 : v_j`
   - Kodiert relative Skalierung und Proportionalität.

3. **Product**
   - `v_i(t) * v_j(t)`
   - Ermöglicht dem Modell, „interaction effects“ auszudrücken, bei denen es relevant ist, ob beide Serien groß oder klein sind.

Diese cross-series features legen dem Booster die **multi-series structure** explizit offen, statt nur auf individuelle Serienwerte zu vertrauen.

### Time index und Fourier features

Wir kodieren auch die Zeit selbst als numerische Features:

1. **Time index**
   - Integer index `t = 0, 1, 2, ...` (row index).
   - Gibt dem Booster eine einfache Möglichkeit, global trends zu modellieren.

2. **Fourier features** (cyclical patterns)
   - Zwei feste Perioden (in Einheiten der „Anzahl der Zeilen“):
     - Period 24 (z. B. 24 hours bei stündlichen Daten)
     - Period 168 (z. B. 7 days × 24 hours)
   - Für jede Periode `P` berechnen wir:
     - `sin(2πt / P)`
     - `cos(2πt / P)`
   - Dies ist eine Standardmethode, seasonality/cycles in einer Form einzubetten, die tree models weiterhin nutzen können.

Der endgültige feature vector für jeden time step `t` lautet:

```text
[ exogenous features (current, lags, diff, rolling mean for each series),
  target-series history (lags, diff, rolling mean),
  cross-series interactions (spread, ratio, product),
  time index, sin/cos(2πt/24), sin/cos(2πt/168) ]
```

### Future-step feature vector (lastFeatureRow)
Dieselbe feature-building logic wird verwendet, um einen feature vector für `t + 1` (one-step-ahead prediction) zu erzeugen:
- Konzeptionell behandeln wir den nächsten time index als `t_next = n`, wobei `n` die Anzahl der beobachteten Zeilen ist.
- Für die „current“-Werte jeder Serie bei `t_next` verwenden wir den zuletzt beobachteten Wert (Index `n - 1`) erneut.
- Lags und rolling means werden anhand der letzten `MAX_LAG` / `ROLLING_WINDOW` Schritte der beobachteten Daten berechnet.
- Die Zeitkodierungen verwenden `t_next` als time index.
- Dadurch entsteht ein einzelner feature vector `lastFeatureRow`, der den nächsten time step auf Basis der gesamten Historie bis zur letzten Beobachtung repräsentiert.

Die Funktion `buildFeatures` gibt daher zurück:
```text
{
  X: number[][];        // feature matrix for all observed steps
  y: number[];          // target series values for those steps
  lastFeatureRow: number[]; // feature vector representing t + 1
}
```

---


## 🚀 Erste Schritte

### 1. Voraussetzungen
- [Docker Compose](https://docs.docker.com/compose/)

### 2. Alle Dienste bauen und starten:

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

## AirPassengers Benchmark

Siehe [`BENCHMARKS.md`](./BENCHMARKS.md) für das faire 16-step protocol und die paper-comparison rules.

Das repository enthält einen AirPassengers-Datensatz und einen benchmark command, mit dem sich das Modellverhalten an einem klassischen monatlichen Zeitreihendatensatz prüfen lässt.

Führe den Benchmark mit Docker Compose aus:

```bash
docker compose -f docker-compose.test.yml run --rm air_passengers_fair_benchmark
```

JSON-Ausgabe:

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

Die folgenden Ergebnisse verwenden für jedes vergleichbare Modell dasselbe fixed-origin evaluation protocol:

- train: die ersten 128 AirPassengers observations
- holdout: die nächsten 16 observations
- während der Prognose wird kein holdout target value zurückgeführt
- gemeinsame point metrics: MAE, RMSE, MAPE, sMAPE und MASE

Reproduziere den Benchmark mit:

```bash
docker compose -f docker-compose.test.yml run --rm \
  air_passengers_fair_benchmark \
  sh -lc '
    npm --prefix frontend/app ci &&
    node scripts/benchmark-air-passengers-fair.mjs --markdown
  '
```

AirPassengers-Auswertung nur mit LightGBM:

```bash
docker compose -f docker-compose.test.yml run --rm \
  lightgbm_air_passengers_benchmark
```

Dies führt dasselbe 128/16 fixed-origin protocol mit `--algorithm lightgbm` aus, sodass das Ergebnis direkt mit den anderen AirPassengers-Zeilen vergleichbar ist.

# Lizenz
- Apache License 2.0
