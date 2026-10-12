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

!["web_ui"](./assets/images/web_ui.png)

[PlayGround](https://europanite.github.io/client_side_time_series_forecast/)

Un playground de prévision de séries temporelles côté client et basé sur le navigateur, propulsé par XGBoost, LightGBM, un modèle expérimental de style VARMA et Chronos-2.

L'application charge un fichier CSV ou XLSX, détecte les colonnes datetime et numériques, vous permet de choisir un modèle de prévision et visualise à la fois les valeurs observées et une prévision à 16 pas. Vos données restent dans votre navigateur.

---

## Vue d'ensemble

Il s'agit d'un outil de prévision de séries temporelles multivariées qui s'exécute entièrement dans votre navigateur Web.
Aucune installation, inscription ou paiement n'est nécessaire. 
Il suffit d'y accéder avec votre navigateur pour commencer.
Il aide les petites entreprises à prévoir les commandes du lendemain.

- Charger des jeux de données de séries temporelles CSV/XLSX dans le navigateur
- Sélectionner n'importe quelle colonne numérique comme cible de prévision
- Choisir entre XGBoost, LightGBM, un modèle expérimental de style VARMA et Chronos-2 préentraîné
- Entraîner localement dans le navigateur le modèle sélectionné
- Prévoir les 16 points suivants et les ajouter au graphique

Tout se passe **dans votre navigateur**. Il n'y a pas d'API backend et aucune donnée ne quitte votre machine.

---

## Démo

1. Ouvrez la démo GitHub Pages :  
   https://europanite.github.io/client_side_time_series_forecast/
2. Téléversez un fichier d'exemple comme [`data/sample_data.csv`](./data/datsample_data.csv) ou [`data/sample_data.xlsx`](./data/sample_data.xlsx).
3. L'application va :
   - Détecter une **colonne de type datetime**
   - Lister les colonnes numériques disponibles
4. Choisissez une colonne numérique comme **target**.
5. Choisissez un **forecast model**. `XGBoost` est le modèle par défaut, `LightGBM` est une alternative GBDT entraînée localement, `VARMA experimental` est un baseline multivarié léger et `Chronos-2 pretrained` est un zero-shot foundation model.
6. Pour XGBoost, LightGBM ou VARMA, cliquez d'abord sur **Train**. Chronos-2 est déjà préentraîné et ne nécessite pas d'entraînement local. Cliquez ensuite sur **Forecast +16** pour prévoir les 16 points suivants.
7. Examinez le graphique pour comparer la série observée et la ligne de prévision.

---

## Structure des données

<pre>
datetime,item_a,item_b,item_c,...
2025-01-01 00:00:00+09:00,10,20,31,...
2025-01-02 00:00:00+09:00,12,19,31,...
2025-01-03 00:00:00+09:00,14,18,33,...
 ...
</pre>

### Exigences :

##### Une colonne de type datetime
L'en-tête de colonne contient "date" ou "time" (sans distinction de casse).
Elle est utilisée comme axe temporel, mais n'est pas directement convertie en caractéristiques numériques.

##### Une ou plusieurs colonnes numériques
Ces colonnes sont utilisées comme target et/ou exogenous features.
L'application prend en charge trois modes de prévision ajustés localement :

- **XGBoost** : vous choisissez une colonne numérique comme target, et les autres colonnes numériques servent de signaux supplémentaires.
- **LightGBM** : utilise le même target et les mêmes caractéristiques multivariées conçues que XGBoost, mais ajuste un LightGBM regressor.
- **VARMA experimental** : toutes les colonnes numériques sont modélisées ensemble, et la colonne target sélectionnée est affichée comme sortie de prévision.

---

## Approche de prévision

Le projet propose quatre algorithmes de prévision reposant volontairement sur des hypothèses différentes :

| Modèle | Style d'apprentissage | Utilise plusieurs séries en entrée ? | Entraînement local ? | Style de prévision |
| --- | --- | --- | --- | --- |
| XGBoost | Régression par arbres de décision gradient-boosted sur des caractéristiques de séries temporelles conçues | Oui | Oui | Prévision récursive à un pas |
| LightGBM | Régression par arbres de décision gradient-boosted basée sur des histogrammes, utilisant les mêmes caractéristiques conçues que XGBoost | Oui | Oui | Prévision récursive à un pas |
| VARMA experimental | Autorégression linéaire multi-output avec ridge regularization, residual correction et seasonal stabilization | Oui, conjointement | Oui | Prévision récursive multi-output |
| Chronos-2-small INT8 ONNX | Modèle fondation de séries temporelles préentraîné et basé sur des patches | Uniquement le target sélectionné dans l'UI actuelle | Non | Prévision probabiliste multi-step directe |

Ces modèles ne doivent pas être interprétés comme quatre implémentations du même algorithme. XGBoost et LightGBM transforment la série temporelle en un même problème d'apprentissage supervisé tabulaire, VARMA modélise conjointement les vecteurs retardés de plusieurs séries, et Chronos-2 utilise un modèle neuronal de prévision préentraîné sans ajuster de nouveaux paramètres au jeu de données téléversé.

### Sélection du modèle

#### XGBoost

`XGBoost` est le modèle entraîné localement par défaut. XGBoost est un algorithme d'arbres de décision avec gradient boosting : de nombreux arbres de décision sont ajoutés séquentiellement, chaque nouvel arbre réduisant les erreurs laissées par l'ensemble précédent. Les séries temporelles ne sont pas transmises directement à XGBoost. Ce projet transforme d'abord chaque time step en feature vector, puis entraîne XGBoost comme modèle de régression.

L'implémentation dans le navigateur utilise :

- des lags du target et des variables exogènes jusqu'à `MAX_LAG = 3`
- des first differences
- une rolling mean avec `ROLLING_WINDOW = 7`
- des interactions spread, ratio et product entre séries numériques
- un time index
- des Fourier features de périodes 24 et 168
- `gbtree` avec depth 4, learning rate 0.1, subsample 0.8 et 200 boosting iterations

Pour une prévision à 16 pas, le modèle prédit un pas à la fois. Chaque prédiction est ajoutée à l'historique de travail et devient donc disponible pour le pas suivant. La prédiction brute de XGBoost est également mélangée avec une estimation de seasonal continuation. Le contexte numérique qui n'est pas target est avancé au lieu d'être maintenu constant.

**Points forts**

- capture les relations non linéaires et les interactions entre séries
- fonctionne naturellement avec les caractéristiques multivariées conçues manuellement dans le projet
- s'entraîne localement et relativement rapidement dans le navigateur
- ne nécessite pas le téléchargement d'un grand modèle préentraîné

**Limites**

- la qualité de la prévision dépend de la feature engineering choisie
- la prévision récursive peut accumuler des erreurs sur les pas les plus éloignés
- les périodes Fourier fixes et la seasonal continuation sont des hypothèses au niveau de l'application, et non une structure calendaire apprise automatiquement

Utilisez XGBoost lorsque vous souhaitez un modèle non linéaire léger, entraîné localement, capable d'exploiter les relations entre plusieurs colonnes numériques.

#### LightGBM

`LightGBM` est un deuxième modèle d'arbres de décision avec gradient boosting entraîné localement. L'implémentation dans le navigateur utilise `@wlearn/lightgbm`, une build WebAssembly de LightGBM, et réutilise volontairement la même sortie `buildFeatures()` et le même parcours de prévision récursive à 16 pas que XGBoost.

La configuration LightGBM par défaut utilise regression, learning rate 0.1, 31 leaves, max depth 4, subsample 0.8 et 200 boosting rounds. La prédiction brute de l'arbre est mélangée avec la même estimation de seasonal continuation que celle utilisée par XGBoost.

Utilisez LightGBM lorsque vous souhaitez une alternative GBDT basée sur des histogrammes directement comparable, tout en gardant fixes le feature pipeline et le protocole de prévision au niveau de l'application.

#### VARMA experimental

`VARMA experimental` est un baseline multivarié léger et natif du navigateur. Malgré son nom, cette implémentation **n'est pas un estimateur VARMA statistique complet par maximum likelihood**. Elle se rapproche davantage d'un regularized VAR-style model avec une petite residual correction et une seasonal stabilization explicite.

L'implémentation :

1. sélectionne jusqu'à 8 séries numériques et les standardise ;
2. concatène les 7 vecteurs multivariés précédents dans un lag feature vector ;
3. ajuste simultanément toutes les séries de sortie avec une multi-output ridge regression (`ridge = 1e-2`) ;
4. estime une petite correction à partir des résidus récents (`maLag = 1`) ;
5. pendant la prévision, mélange la sortie autorégressive avec le vecteur du seasonal lag (`seasonalLag = 7`, `seasonalBlend = 0.55`) ;
6. réinjecte récursivement le vecteur prédit dans le pas de prévision suivant.

Comme le vecteur numérique complet est prédit à chaque pas, VARMA fait avancer toutes les séries modélisées ensemble au lieu de prévoir uniquement le target sélectionné.

**Points forts**

- simple et peu coûteux en calcul
- modélise conjointement plusieurs séries numériques
- fournit un baseline utile de style linéaire/classique face à XGBoost et Chronos-2
- s'exécute entièrement en TypeScript sans téléchargement séparé de modèle

**Limites**

- nécessite au moins deux séries numériques et plus de 7 lignes exploitables
- suppose principalement des relations de lag linéaires
- la residual correction et le seasonal blending sont des stabilisateurs pragmatiques, pas une procédure complète de moving-average estimation
- ne doit pas être présenté comme une implémentation de référence du VARMA statistique

Utilisez `VARMA experimental` principalement comme baseline multivarié transparent lorsque plusieurs séries évoluent ensemble.

#### Chronos-2 pretrained

`Chronos-2 pretrained` est fondamentalement différent des modèles ajustés localement ci-dessus. Chronos-2 est un time-series foundation model préentraîné et basé sur des patches, qui produit directement des **quantile forecasts** multi-step. Ce repository exécute `Chronos-2-small INT8` comme modèle ONNX avec ONNX Runtime Web ; l'inference est donc effectuée localement après le téléchargement du modèle.

L'intégration actuelle dans le navigateur :

- **n'entraîne pas** le modèle sur le jeu de données téléversé ;
- utilise uniquement la target series sélectionnée comme contexte Chronos ;
- nécessite au moins 16 numeric target observations ;
- conserve au maximum 5 760 context observations ;
- regroupe l'entrée en patches de 16 points et complète à gauche avec `NaN` un premier patch incomplet ;
- exécute la sortie interne de 672 pas du graphe ONNX (`42 × 16`) et expose les 16 premiers pas à l'UI ;
- lit la quantile output du modèle et affiche la prévision médiane (`p50`) avec les bornes d'incertitude `p10` et `p90`.

Chronos-2 prend lui-même en charge des prévisions multivariées et covariate-informed plus riches, mais **l'UI actuelle n'utilise pas encore ces capacités**. L'implémentation actuelle de Chronos doit donc être comprise comme un forecaster target univarié préentraîné au sein d'une application par ailleurs multivariée.

**Points forts**

- zero-shot forecasting : aucun model fitting par jeu de données n'est requis
- prédit directement l'intégralité du forecast horizon au lieu d'ajuster récursivement des modèles à un pas
- fournit des informations probabilistes via les forecast quantiles
- peut transférer à une nouvelle série des patterns appris pendant un préentraînement à grande échelle

**Limites**

- le modèle doit être téléchargé avant la première utilisation
- le navigateur utilise un export INT8 ONNX, les résultats peuvent donc différer d'un full-precision official checkpoint
- l'UI actuelle ignore les colonnes numériques supplémentaires lors de l'appel à Chronos-2
- la mémoire du navigateur et l'exécution WASM imposent des limites pratiques à la taille du modèle et à la longueur du contexte

Dans le benchmark holdout AirPassengers 128/16 actuel du repository, `Chronos-2-small INT8 ONNX` a obtenu les plus faibles MAE, RMSE, MAPE, sMAPE et MASE parmi les modèles comparables. Consultez la section benchmark ci-dessous pour les valeurs mesurées et le protocole d'évaluation.

### Prévision à 16 pas

L'horizon par défaut au niveau de l'application est 16, car le modèle ONNX Chronos-2 intégré utilise des patches de 16 points, et les API XGBoost, LightGBM et VARMA sont alignées sur le même horizon pour la comparaison.

Les algorithmes atteignent ces 16 points de différentes manières :

- **XGBoost** prédit récursivement. Chaque valeur target prédite devient une partie de l'historique pour le pas suivant, tandis que le contexte non-target est lui aussi avancé.
- **LightGBM** utilise le même engineered feature pipeline et la même politique de prévision récursive au niveau de l'application que XGBoost.
- **VARMA experimental** prédit récursivement un vecteur multivarié complet et réinjecte ce vecteur prédit dans le pas suivant.
- **Chronos-2** effectue une direct multi-step probabilistic inference et renvoie les 16 premières positions futures de la sortie du modèle préentraîné.

Cette différence est importante pour comparer les modèles : XGBoost, LightGBM et VARMA peuvent accumuler une recursive forecast error, tandis que Chronos-2 génère directement la séquence future demandée.

---

## Feature Engineering (XGBoost / LightGBM)

Les caractéristiques conçues manuellement dans cette section s'appliquent aux pipelines XGBoost et LightGBM. VARMA utilise directement des normalized lag vectors, tandis que Chronos-2 opère sur la target sequence sélectionnée sans ces caractéristiques.

Les pipelines de tree boosting traitent l'entrée comme une petite série temporelle multivariée :

- Une colonne *datetime-like* (l'en-tête contient `date` ou `time`, quelle que soit la casse).
- Plusieurs colonnes numériques (par exemple `item_a`, `item_b`, `item_c`, ...).
- L'une des colonnes numériques est choisie comme **target** à prévoir.

En interne, le feature builder construit un **rich feature vector** pour chaque time step `t` et un **future feature vector** pour `t + 1`. Toutes les caractéristiques sont calculées **entièrement côté client**, en JavaScript/TypeScript.

### Séries utilisées pour les caractéristiques

- `datetimeKey`  
  - Détectée automatiquement à partir de l'en-tête contenant `"date"` ou `"time"`.
  - Utilisée uniquement pour localiser l'axe temporel ; elle n'est pas utilisée directement comme caractéristique numérique.
- `targetKey`  
  - Colonne numérique que l'utilisateur choisit de prévoir.
- `featureKeys`  
  - Toutes les autres colonnes numériques (non-datetime, non-target).
  - Traitées comme des **exogenous series**.

En interne, nous conservons un `seriesMap: Record<string, number[]>` avec un tableau numérique par série.

### Caractéristiques par série (exogenous series)

Pour chaque exogenous series `x(t)` (chaque key de `featureKeys`) et chaque time step `t`, nous calculons :

1. **Valeur contemporaine**
   - `x(t)` (la valeur à l'index temporel `t`).

2. **Lag features (history)**
   - Jusqu'à `MAX_LAG = 3` :
     - `x(t - 1)`
     - `x(t - 2)`
     - `x(t - 3)`
   - Cela permet au modèle d'apprendre la dynamique temporelle à court terme de chaque série.

3. **First difference**
   - `x(t) - x(t - 1)`
   - Capture les variations locales (trend / slope) plutôt que le seul niveau absolu.

4. **Rolling mean (local average)**
   - Rolling window de `ROLLING_WINDOW = 7` time steps :
     - `mean(x[t - 6 ... t])` (tronquée près du début de la série)
   - Représente la tendance locale / baseline level et lisse le bruit de court terme.

> Si la série est plus courte que la fenêtre, le code réduit automatiquement la fenêtre afin d'utiliser tous les points passés disponibles jusqu'à `t`.

### Historique de la target series

Pour la **target series** `y(t)` elle-même, nous **n'incluons pas** la valeur courante `y(t)` comme caractéristique (car il s'agit du label de ce pas), mais nous incluons son historique :

1. **Target lags**
   - `y(t - 1)`
   - `y(t - 2)`
   - `y(t - 3)`

2. **Target difference**
   - `y(t) - y(t - 1)`

3. **Target rolling mean**
   - La même rolling window que ci-dessus :
     - `mean(y[t - 6 ... t])`

Cela permet au modèle d'apprendre des patterns tels que « la prochaine valeur dépend des dernières valeurs et de leur tendance locale », ce qui est courant dans la prévision de séries temporelles.

### Cross-series interactions

Pour capturer les **relations entre différentes séries**, nous construisons des interaction features pour chaque **paire de séries numériques** (target compris) :

- Soient `v_i(t)` et `v_j(t)` les valeurs contemporaines de deux séries au temps `t`.
- Pour chaque paire ordonnée `(i, j)` avec `i < j`, nous calculons :

1. **Spread**
   - `v_i(t) - v_j(t)`
   - Encode les différences de niveau relatif entre les séries.

2. **Ratio**
   - `v_i(t) / v_j(t)`
   - Pour éviter une division par zéro, le dénominateur inclut un petit epsilon si nécessaire :
     - `denom = |v_j| < 1e-9 ? sign(v_j) * 1e-9 : v_j`
   - Encode l'échelle relative et la proportionnalité.

3. **Product**
   - `v_i(t) * v_j(t)`
   - Permet au modèle d'exprimer des « interaction effects » où le fait que les deux séries soient élevées ou faibles a de l'importance.

Ces cross-series features exposent explicitement la **multi-series structure** au booster au lieu de s'appuyer uniquement sur les valeurs individuelles des séries.

### Time index et Fourier features

Nous encodons également le temps lui-même comme caractéristiques numériques :

1. **Time index**
   - Integer index `t = 0, 1, 2, ...` (row index).
   - Offre au booster un moyen simple de modéliser les global trends.

2. **Fourier features** (cyclical patterns)
   - Deux périodes fixes (en unités de « nombre de lignes ») :
     - Period 24 (par exemple 24 hours pour des données horaires)
     - Period 168 (par exemple 7 days × 24 hours)
   - Pour chaque période `P`, nous calculons :
     - `sin(2πt / P)`
     - `cos(2πt / P)`
   - C'est une méthode standard pour intégrer seasonality/cycles sous une forme que les tree models peuvent encore exploiter.

Le feature vector final pour chaque time step `t` est :

```text
[ exogenous features (current, lags, diff, rolling mean for each series),
  target-series history (lags, diff, rolling mean),
  cross-series interactions (spread, ratio, product),
  time index, sin/cos(2πt/24), sin/cos(2πt/168) ]
```

### Future-step feature vector (lastFeatureRow)
La même logique de construction de caractéristiques est utilisée pour produire un feature vector pour `t + 1` (one-step-ahead prediction) :
- Conceptuellement, nous considérons le prochain time index comme `t_next = n`, où `n` est le nombre de lignes observées.
- Pour les valeurs « current » de chaque série à `t_next`, nous réutilisons la dernière valeur observée (index `n - 1`).
- Les lags et rolling means sont calculés à partir des derniers `MAX_LAG` / `ROLLING_WINDOW` pas des données observées.
- Les encodages temporels utilisent `t_next` comme time index.
- Cela produit un unique feature vector `lastFeatureRow` qui représente le prochain time step à partir de tout l'historique jusqu'à la dernière observation.

La fonction `buildFeatures` renvoie donc :
```text
{
  X: number[][];        // feature matrix for all observed steps
  y: number[];          // target series values for those steps
  lastFeatureRow: number[]; // feature vector representing t + 1
}
```

---


## 🚀 Bien démarrer

### 1. Prérequis
- [Docker Compose](https://docs.docker.com/compose/)

### 2. Construire et démarrer tous les services :

```bash

# Build the image
docker compose build

# Run the container
docker compose up

```

### 3. Test :
```bash
docker compose \
-f docker-compose.test.yml up \
--build --exit-code-from \
frontend_test
```

---

## AirPassengers Benchmark

Consultez [`BENCHMARKS.md`](./BENCHMARKS.md) pour le protocole équitable à 16 pas et les règles de comparaison avec les articles.

Le repository comprend un jeu de données AirPassengers et une benchmark command permettant de vérifier le comportement des modèles sur un jeu de données classique de séries temporelles mensuelles.

Exécutez le benchmark avec Docker Compose :

```bash
docker compose -f docker-compose.test.yml run --rm air_passengers_fair_benchmark
```

Sortie JSON :

```bash
docker compose -f docker-compose.test.yml run --rm air_passengers_fair_benchmark \
  sh -lc 'npm --prefix frontend/app ci && node scripts/benchmark-air-passengers-fair.mjs --algorithm xgboost --json'
```

Baseline seasonal naive :

```bash
docker compose -f docker-compose.test.yml run --rm air_passengers_fair_benchmark \
  sh -lc 'npm --prefix frontend/app ci && node scripts/benchmark-air-passengers-fair.mjs --algorithm seasonal-naive --json'
```


### Benchmark holdout à 16 pas

Les résultats suivants utilisent le même protocole d'évaluation fixed-origin pour chaque modèle comparable :

- train : les 128 premières observations AirPassengers
- holdout : les 16 observations suivantes
- aucune valeur target du holdout n'est réinjectée pendant la prévision
- métriques ponctuelles communes : MAE, RMSE, MAPE, sMAPE et MASE

Reproduisez le benchmark avec :

```bash
docker compose -f docker-compose.test.yml run --rm \
  air_passengers_fair_benchmark \
  sh -lc '
    npm --prefix frontend/app ci &&
    node scripts/benchmark-air-passengers-fair.mjs --markdown
  '
```

Évaluation AirPassengers avec LightGBM uniquement :

```bash
docker compose -f docker-compose.test.yml run --rm \
  lightgbm_air_passengers_benchmark
```

Cela exécute le même protocole fixed-origin 128/16 avec `--algorithm lightgbm`, de sorte que le résultat est directement comparable aux autres lignes AirPassengers.

# Licence
- Apache License 2.0
