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


Un playground de pronóstico de series temporales del lado del cliente y basado en navegador, impulsado por XGBoost, LightGBM, un modelo experimental de estilo VARMA y Chronos-2.

La aplicación carga un archivo CSV o XLSX, detecta columnas datetime y numéricas, permite elegir un modelo de pronóstico y visualiza tanto los valores observados como un pronóstico de 16 pasos. Tus datos permanecen en el navegador.

---

## Descripción general

Esta es una herramienta de pronóstico de series temporales multivariantes que se ejecuta completamente en tu navegador web.
No requiere instalación, registro ni pago. 
Solo accede desde tu navegador y estará lista para usar.
Ayuda a pequeñas empresas a predecir los pedidos del día siguiente.

- Carga conjuntos de datos de series temporales CSV/XLSX en el navegador
- Selecciona cualquier columna numérica como objetivo del pronóstico
- Elige entre XGBoost, LightGBM, un modelo experimental de estilo VARMA y Chronos-2 preentrenado
- Entrena localmente en el navegador el modelo seleccionado
- Pronostica los siguientes 16 puntos y añádelos al gráfico

Todo ocurre **dentro de tu navegador**. No existe una API de backend y ningún dato sale de tu máquina.

---

## Demo

1. Abre la demo de GitHub Pages:  
   https://europanite.github.io/client-side-time-series-forecast-ai/

2. Sube un archivo de ejemplo como [`data/sample_data.csv`](./data/datsample_data.csv) o [`data/sample_data.xlsx`](./data/sample_data.xlsx).
3. La aplicación:
   - Detectará una **columna similar a datetime**
   - Mostrará las columnas numéricas disponibles
4. Elige una columna numérica como **target**.
5. Elige un **forecast model**. `XGBoost` es el predeterminado, `LightGBM` es una alternativa GBDT entrenada localmente, `VARMA experimental` es un baseline multivariante ligero y `Chronos-2 pretrained` es un zero-shot foundation model.
6. Para XGBoost, LightGBM o VARMA, haz clic primero en **Train**. Chronos-2 ya está preentrenado y no requiere entrenamiento local. Después haz clic en **Forecast +16** para predecir los siguientes 16 puntos.
7. Revisa el gráfico para comparar la serie observada con la línea de pronóstico.

---

## Estructura de los datos

<pre>
datetime,item_a,item_b,item_c,...
2025-01-01 00:00:00+09:00,10,20,31,...
2025-01-02 00:00:00+09:00,12,19,31,...
2025-01-03 00:00:00+09:00,14,18,33,...
 ...
</pre>

### Requisitos:

##### Una columna similar a datetime
El encabezado de la columna contiene "date" o "time" (sin distinguir mayúsculas y minúsculas).
Se usa como eje temporal, pero no se convierte directamente en características numéricas.

##### Una o más columnas numéricas
Estas columnas se usan como target y/o exogenous features.
La aplicación admite tres modos de pronóstico ajustados localmente:

- **XGBoost**: eliges una columna numérica como target y las demás columnas numéricas se usan como señales adicionales.
- **LightGBM**: usa el mismo target y las mismas características multivariantes diseñadas que XGBoost, pero ajusta un LightGBM regressor.
- **VARMA experimental**: todas las columnas numéricas se modelan conjuntamente y la columna target seleccionada se muestra como salida del pronóstico.

---

## Enfoque de pronóstico

El proyecto expone cuatro algoritmos de pronóstico con supuestos deliberadamente distintos:

| Modelo | Estilo de aprendizaje | ¿Usa varias series de entrada? | ¿Entrenamiento local? | Estilo de pronóstico |
| --- | --- | --- | --- | --- |
| XGBoost | Regresión mediante árboles de decisión con gradient boosting sobre características de series temporales diseñadas | Sí | Sí | Pronóstico recursivo de un paso |
| LightGBM | Regresión mediante árboles de decisión con gradient boosting basado en histogramas sobre las mismas características diseñadas que XGBoost | Sí | Sí | Pronóstico recursivo de un paso |
| VARMA experimental | Autorregresión lineal multi-output con ridge regularization, residual correction y seasonal stabilization | Sí, conjuntamente | Sí | Pronóstico recursivo multi-output |
| Chronos-2-small INT8 ONNX | Modelo fundacional de series temporales preentrenado y basado en patches | Solo el target seleccionado en la UI actual | No | Pronóstico probabilístico multi-step directo |

Estos modelos no deben interpretarse como cuatro implementaciones del mismo algoritmo. XGBoost y LightGBM convierten la serie temporal en el mismo problema de aprendizaje supervisado tabular, VARMA modela conjuntamente vectores rezagados de varias series y Chronos-2 usa un modelo neuronal de pronóstico preentrenado sin ajustar nuevos parámetros al conjunto de datos cargado.

### Selección del modelo

#### XGBoost

`XGBoost` es el modelo predeterminado entrenado localmente. XGBoost es un algoritmo de árboles de decisión con gradient boosting: se añaden muchos árboles de decisión de forma secuencial y cada nuevo árbol reduce los errores que dejó el ensemble anterior. Las series temporales no se pasan directamente a XGBoost. Este proyecto primero convierte cada time step en un feature vector y luego entrena XGBoost como modelo de regresión.

La implementación en el navegador utiliza:

- lags del target y de las variables exógenas hasta `MAX_LAG = 3`
- first differences
- una rolling mean con `ROLLING_WINDOW = 7`
- interacciones spread, ratio y product entre series numéricas
- un time index
- Fourier features con periodos 24 y 168
- `gbtree` con depth 4, learning rate 0.1, subsample 0.8 y 200 boosting iterations

Para un pronóstico de 16 pasos, el modelo predice un paso cada vez. Cada predicción se añade al historial de trabajo y, por tanto, queda disponible para el paso siguiente. La predicción bruta de XGBoost también se mezcla con una estimación de seasonal continuation. El contexto numérico que no es target avanza en lugar de mantenerse constante.

**Fortalezas**

- captura relaciones no lineales e interacciones entre series
- funciona de forma natural con las características multivariantes diseñadas manualmente del proyecto
- se entrena localmente y con relativa rapidez en el navegador
- no requiere descargar un gran modelo preentrenado

**Limitaciones**

- la calidad del pronóstico depende de la feature engineering elegida
- el pronóstico recursivo puede acumular errores en los pasos posteriores
- los periodos Fourier fijos y la seasonal continuation son supuestos a nivel de aplicación, no una estructura de calendario aprendida automáticamente

Usa XGBoost cuando quieras un modelo no lineal ligero, entrenado localmente, que pueda aprovechar las relaciones entre varias columnas numéricas.

#### LightGBM

`LightGBM` es un segundo modelo de árboles de decisión con gradient boosting entrenado localmente. La implementación del navegador usa `@wlearn/lightgbm`, una compilación WebAssembly de LightGBM, y reutiliza intencionadamente la misma salida de `buildFeatures()` y el mismo recorrido de pronóstico recursivo de 16 pasos que XGBoost.

La configuración predeterminada de LightGBM usa regression, learning rate 0.1, 31 leaves, max depth 4, subsample 0.8 y 200 boosting rounds. La predicción bruta del árbol se mezcla con la misma estimación de seasonal continuation que se usa con XGBoost.

Usa LightGBM cuando quieras una alternativa GBDT basada en histogramas directamente comparable, manteniendo fijos el feature pipeline y el protocolo de pronóstico a nivel de aplicación.

#### VARMA experimental

`VARMA experimental` es un baseline multivariante ligero y nativo del navegador. A pesar del nombre, esta implementación **no es un estimador VARMA estadístico completo de maximum likelihood**. Se aproxima más a un modelo estilo VAR regularizado, con una pequeña residual correction y seasonal stabilization explícita.

La implementación:

1. selecciona hasta 8 series numéricas y las estandariza;
2. concatena los 7 vectores multivariantes anteriores en un lag feature vector;
3. ajusta simultáneamente todas las series de salida con multi-output ridge regression (`ridge = 1e-2`);
4. estima una pequeña corrección a partir de residuos recientes (`maLag = 1`);
5. durante el pronóstico, mezcla la salida autorregresiva con el vector del seasonal lag (`seasonalLag = 7`, `seasonalBlend = 0.55`);
6. realimenta recursivamente el vector predicho en el siguiente paso del pronóstico.

Como se predice el vector numérico completo en cada paso, VARMA hace avanzar conjuntamente todas las series modeladas en lugar de pronosticar únicamente el target seleccionado.

**Fortalezas**

- simple y computacionalmente económico
- modela conjuntamente varias series numéricas
- proporciona un baseline útil de estilo lineal/clásico frente a XGBoost y Chronos-2
- se ejecuta completamente en TypeScript sin descargar un modelo aparte

**Limitaciones**

- requiere al menos dos series numéricas y más de 7 filas utilizables
- supone relaciones de lag principalmente lineales
- la residual correction y el seasonal blending son estabilizadores pragmáticos, no un procedimiento completo de moving-average estimation
- no debe presentarse como una implementación de referencia de VARMA estadístico

Usa `VARMA experimental` principalmente como un baseline multivariante transparente cuando varias series se muevan conjuntamente.

#### Chronos-2 pretrained

`Chronos-2 pretrained` es fundamentalmente distinto de los modelos ajustados localmente anteriores. Chronos-2 es un time-series foundation model preentrenado y basado en patches que produce directamente **quantile forecasts** multi-step. Este repository ejecuta `Chronos-2-small INT8` como modelo ONNX con ONNX Runtime Web, de modo que la inference se realiza localmente una vez descargado el modelo.

La integración actual en el navegador:

- **no** entrena con el conjunto de datos cargado;
- usa únicamente la serie target seleccionada como contexto de Chronos;
- requiere al menos 16 observaciones numéricas del target;
- conserva como máximo 5.760 observaciones de contexto;
- agrupa la entrada en patches de 16 puntos y rellena por la izquierda con `NaN` el primer patch incompleto;
- ejecuta la salida interna de 672 pasos del grafo ONNX (`42 × 16`) y expone a la UI los primeros 16 pasos;
- lee la salida por cuantiles del modelo y muestra el pronóstico mediano (`p50`) junto con los límites de incertidumbre `p10` y `p90`.

Chronos-2 admite por sí mismo pronósticos multivariantes y basados en covariables más ricos, pero **la UI actual todavía no utiliza esas capacidades**. Por ello, la implementación actual de Chronos debe entenderse como un pronosticador target univariante preentrenado dentro de una aplicación que, en el resto, es multivariante.

**Fortalezas**

- zero-shot forecasting: no requiere ajustar un modelo para cada conjunto de datos
- predice directamente todo el horizonte de pronóstico en lugar de ajustar recursivamente modelos de un paso
- proporciona información probabilística mediante quantiles de pronóstico
- puede transferir a una serie nueva patrones aprendidos durante un preentrenamiento a gran escala

**Limitaciones**

- el modelo debe descargarse antes del primer uso
- el navegador usa una exportación INT8 ONNX, por lo que los resultados no tienen por qué coincidir exactamente con un checkpoint oficial de precisión completa
- la UI actual ignora las columnas numéricas adicionales al llamar a Chronos-2
- la memoria del navegador y la ejecución WASM imponen límites prácticos al tamaño del modelo y a la longitud del contexto

En el benchmark holdout actual de AirPassengers 128/16 del repository, `Chronos-2-small INT8 ONNX` obtuvo los menores MAE, RMSE, MAPE, sMAPE y MASE entre los modelos comparables. Consulta la sección de benchmark más abajo para ver los valores medidos y el protocolo de evaluación.

### Pronóstico de 16 pasos

El horizonte predeterminado a nivel de aplicación es 16 porque el modelo ONNX integrado de Chronos-2 usa patches de 16 puntos, y las API de XGBoost, LightGBM y VARMA se alinean con el mismo horizonte para facilitar la comparación.

Los algoritmos alcanzan esos 16 puntos de forma distinta:

- **XGBoost** predice de forma recursiva. Cada valor target predicho pasa a formar parte del historial del siguiente paso, mientras que el contexto no target también avanza.
- **LightGBM** usa el mismo engineered feature pipeline y la misma política de pronóstico recursivo a nivel de aplicación que XGBoost.
- **VARMA experimental** predice recursivamente un vector multivariante completo y realimenta ese vector predicho en el siguiente paso.
- **Chronos-2** realiza inference probabilística multi-step directa y devuelve las primeras 16 posiciones futuras de la salida del modelo preentrenado.

Esta diferencia importa al comparar los modelos: XGBoost, LightGBM y VARMA pueden acumular recursive forecast error, mientras que Chronos-2 genera directamente la secuencia futura solicitada.

---

## Feature Engineering (XGBoost / LightGBM)

Las características diseñadas manualmente de esta sección se aplican a los pipelines de XGBoost y LightGBM. VARMA usa directamente vectores lag normalizados, mientras que Chronos-2 opera sobre la secuencia target seleccionada sin estas características.

Los pipelines de tree boosting tratan la entrada como una pequeña serie temporal multivariante:

- Una columna *datetime-like* (el encabezado contiene `date` o `time`, sin importar mayúsculas y minúsculas).
- Varias columnas numéricas (por ejemplo, `item_a`, `item_b`, `item_c`, ...).
- Una de las columnas numéricas se elige como **target** para pronosticar.

Internamente, el feature builder construye un **rich feature vector** para cada time step `t` y un **future feature vector** para `t + 1`. Todas las características se calculan **exclusivamente en el cliente**, con JavaScript/TypeScript.

### Series utilizadas para las características

- `datetimeKey`  
  - Se detecta automáticamente a partir del encabezado que contiene `"date"` o `"time"`.
  - Solo se usa para ubicar el eje temporal; no se usa directamente como característica numérica.
- `targetKey`  
  - Columna numérica que el usuario elige pronosticar.
- `featureKeys`  
  - Todas las demás columnas numéricas (non-datetime, non-target).
  - Se tratan como **exogenous series**.

Internamente mantenemos un `seriesMap: Record<string, number[]>` con un array numérico por cada serie.

### Características por serie (exogenous series)

Para cada exogenous series `x(t)` (cada key de `featureKeys`) y cada time step `t`, calculamos:

1. **Valor contemporáneo**
   - `x(t)` (el valor en el time index `t`).

2. **Lag features (history)**
   - Hasta `MAX_LAG = 3`:
     - `x(t - 1)`
     - `x(t - 2)`
     - `x(t - 3)`
   - Esto permite al modelo aprender la dinámica temporal de corto plazo de cada serie.

3. **First difference**
   - `x(t) - x(t - 1)`
   - Captura cambios locales (trend / slope) en lugar de únicamente el nivel absoluto.

4. **Rolling mean (local average)**
   - Rolling window de `ROLLING_WINDOW = 7` time steps:
     - `mean(x[t - 6 ... t])` (truncada cerca del inicio de la serie)
   - Representa la tendencia local / nivel base y suaviza el ruido de corto plazo.

> Si la serie es más corta que la ventana, el código reduce automáticamente la ventana para usar todos los puntos pasados disponibles hasta `t`.

### Historial de la serie target

Para la propia **target series** `y(t)`, **no** incluimos el valor actual `y(t)` como característica (porque es la etiqueta de ese paso), pero sí incluimos su historial:

1. **Target lags**
   - `y(t - 1)`
   - `y(t - 2)`
   - `y(t - 3)`

2. **Target difference**
   - `y(t) - y(t - 1)`

3. **Target rolling mean**
   - La misma rolling window anterior:
     - `mean(y[t - 6 ... t])`

Esto permite al modelo aprender patrones como «el siguiente valor depende de los últimos valores y de su tendencia local», algo habitual en el pronóstico de series temporales.

### Cross-series interactions

Para capturar **relaciones entre distintas series**, construimos interaction features para cada **par de series numéricas** (incluido el target):

- Sean `v_i(t)` y `v_j(t)` los valores contemporáneos de dos series en el tiempo `t`.
- Para cada par ordenado `(i, j)` con `i < j`, calculamos:

1. **Spread**
   - `v_i(t) - v_j(t)`
   - Codifica diferencias relativas de nivel entre series.

2. **Ratio**
   - `v_i(t) / v_j(t)`
   - Para evitar la división por cero, el denominador incluye un pequeño epsilon cuando sea necesario:
     - `denom = |v_j| < 1e-9 ? sign(v_j) * 1e-9 : v_j`
   - Codifica escala relativa y proporcionalidad.

3. **Product**
   - `v_i(t) * v_j(t)`
   - Permite al modelo expresar «interaction effects» donde importa que ambas series sean grandes o pequeñas.

Estas cross-series features exponen explícitamente la **multi-series structure** al booster en lugar de depender únicamente de los valores individuales de cada serie.

### Time index y Fourier features

También codificamos el propio tiempo como características numéricas:

1. **Time index**
   - Integer index `t = 0, 1, 2, ...` (row index).
   - Proporciona al booster una forma sencilla de modelar global trends.

2. **Fourier features** (cyclical patterns)
   - Dos periodos fijos (en unidades de «número de filas»):
     - Period 24 (por ejemplo, 24 hours en datos horarios)
     - Period 168 (por ejemplo, 7 days × 24 hours)
   - Para cada periodo `P` calculamos:
     - `sin(2πt / P)`
     - `cos(2πt / P)`
   - Es una forma estándar de representar seasonality/cycles en un formato que los tree models aún pueden aprovechar.

El feature vector final para cada time step `t` es:

```text
[ exogenous features (current, lags, diff, rolling mean for each series),
  target-series history (lags, diff, rolling mean),
  cross-series interactions (spread, ratio, product),
  time index, sin/cos(2πt/24), sin/cos(2πt/168) ]
```

### Future-step feature vector (lastFeatureRow)
La misma lógica de construcción de características se usa para generar un feature vector para `t + 1` (one-step-ahead prediction):
- Conceptualmente, tratamos el siguiente time index como `t_next = n`, donde `n` es el número de filas observadas.
- Para los valores «current» de cada serie en `t_next`, reutilizamos el último valor observado (índice `n - 1`).
- Los lags y las rolling means se calculan usando los últimos `MAX_LAG` / `ROLLING_WINDOW` pasos de los datos observados.
- Las codificaciones temporales usan `t_next` como time index.
- Esto produce un único feature vector `lastFeatureRow` que representa el siguiente time step basándose en todo el historial hasta la última observación.

Por tanto, la función `buildFeatures` devuelve:
```text
{
  X: number[][];        // feature matrix for all observed steps
  y: number[];          // target series values for those steps
  lastFeatureRow: number[]; // feature vector representing t + 1
}
```

---


## 🚀 Primeros pasos

### 1. Requisitos previos
- [Docker Compose](https://docs.docker.com/compose/)

### 2. Compilar e iniciar todos los servicios:

```bash

# Build the image
docker compose build

# Run the container
docker compose up

```

### 3. Pruebas:
```bash
docker compose \
-f docker-compose.test.yml up \
--build --exit-code-from \
frontend_test
```

---

## AirPassengers Benchmark

Consulta [`BENCHMARKS.md`](./BENCHMARKS.md) para conocer el protocolo justo de 16 pasos y las reglas de comparación con papers.

El repository incluye un conjunto de datos AirPassengers y un benchmark command para comprobar el comportamiento de los modelos frente a un conjunto de datos clásico de series temporales mensuales.

Ejecuta el benchmark con Docker Compose:

```bash
docker compose -f docker-compose.test.yml run --rm air_passengers_fair_benchmark
```

Salida JSON:

```bash
docker compose -f docker-compose.test.yml run --rm air_passengers_fair_benchmark \
  sh -lc 'npm --prefix frontend/app ci && node scripts/benchmark-air-passengers-fair.mjs --algorithm xgboost --json'
```

Baseline seasonal naive:

```bash
docker compose -f docker-compose.test.yml run --rm air_passengers_fair_benchmark \
  sh -lc 'npm --prefix frontend/app ci && node scripts/benchmark-air-passengers-fair.mjs --algorithm seasonal-naive --json'
```


### Benchmark holdout de 16 pasos

Los siguientes resultados usan el mismo protocolo de evaluación fixed-origin para todos los modelos comparables:

- train: primeras 128 observaciones de AirPassengers
- holdout: siguientes 16 observaciones
- durante el pronóstico no se realimenta ningún valor target del holdout
- métricas puntuales comunes: MAE, RMSE, MAPE, sMAPE y MASE

Reproduce el benchmark con:

```bash
docker compose -f docker-compose.test.yml run --rm \
  air_passengers_fair_benchmark \
  sh -lc '
    npm --prefix frontend/app ci &&
    node scripts/benchmark-air-passengers-fair.mjs --markdown
  '
```

Evaluación de AirPassengers solo con LightGBM:

```bash
docker compose -f docker-compose.test.yml run --rm \
  lightgbm_air_passengers_benchmark
```

Esto ejecuta el mismo protocolo fixed-origin 128/16 con `--algorithm lightgbm`, por lo que el resultado es directamente comparable con las demás filas de AirPassengers.

# Licencia
- Apache License 2.0
