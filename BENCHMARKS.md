# Benchmarking

This repository keeps application-level benchmarks separate from paper-level
comparisons. The application benchmarks reproduce the browser forecasting
policy as closely as practical and use fixed-origin holdouts with no target
feedback from the holdout.

## 1. AirPassengers fair benchmark

Dataset: `data/air_passengers.csv`

Default protocol:

- first 128 observations are training/context;
- the next 16 observations are a fixed holdout;
- no holdout target value is fed back during forecasting;
- Seasonal Naive, XGBoost, LightGBM, and Chronos-2-small INT8 ONNX are scored
  on the same 16 targets;
- common point metrics are MAE, RMSE, MAPE, sMAPE, and MASE;
- VARMA is N/A because AirPassengers is univariate.

Run all comparable models:

```bash
docker compose -f docker-compose.test.yml run --rm \
  air_passengers_fair_benchmark
```

Run LightGBM only:

```bash
docker compose -f docker-compose.test.yml run --rm \
  lightgbm_air_passengers_benchmark
```

Direct JSON:

```bash
docker compose -f docker-compose.test.yml run --rm \
  lightgbm_air_passengers_benchmark \
  sh -lc '
    npm --prefix frontend/app ci &&
    node scripts/benchmark-air-passengers-fair.mjs \
      --algorithm lightgbm --json
  '
```

## 2. Interpreting the application benchmarks

These are application-level comparisons. They are useful for checking the
behavior of the implementations in this repository under a common local
protocol, but they should not be compared directly with published benchmark
tables unless the dataset, split, lookback/context, prediction horizon,
normalization, metric definitions, and fitting/zero-shot conditions all match.

For paper-oriented multivariate comparisons, use public datasets such as ETT,
Exchange, Weather, or Electricity and reproduce the protocol used by the paper
being compared.
