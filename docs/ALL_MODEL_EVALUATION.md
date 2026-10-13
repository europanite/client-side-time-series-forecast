# Matched six-algorithm browser benchmark (daily update check + manual)

The README's `ALL_MODEL_EVALUATION` section is generated **only from completed
real Chromium inference**. Do not hand-edit or copy results between protocols.

## Protocol

- Input: the existing `data/stocks/multivariate.csv` snapshot (five pre-registered
  sectors in `config/stock-evaluation-groups.json`). Each target is evaluated
  separately; its domestic sector peers are passed in the same input CSV.
- For each sector, train/context = exactly 256 observations preceding the
  most recent 16 completed sessions; holdout = those 16 next observations.
  No holdout truth is passed to the browser until scoring outside Chromium.
- `xgboost`, `lightgbm`, `ridge`: the real frontend `trainDirectForecast(...,
  16, ..., 'price')` plus `forecastDirectNextN`. The UI defaults to Direct.
  These models use available peer history as well as the target.
- `varma`: the actual `trainVarmaModel` / `forecastVarmaNextN` (joint recursive).
  It uses all available historical series.
- `chronos`: actual `forecastChronosNext16` (pretrained, target only).
- `timesfm`: actual `forecastTimesFMNext16` (pretrained, target only; Transformers
  TimesFM 2.5 ONNX, potentially ~1 GB). It is loaded only on demand and reused
  across sectors within the same browser page. Because this ONNX export fixes
  the batch dimension at 2, the same **history-only** input is duplicated into
  both rows and the first forecast row is scored; holdout values are never fed.
- All six methods predict the **same future target values**, but their input
  capabilities and training strategy differ. The last-close baseline uses only
  the last value observed at each forecast origin.
- README reports the per-sector MAPE and the equally weighted sector means of
  MAPE/sMAPE. The JSON also includes per-origin raw prediction vectors,
  MAE, RMSE, direction accuracy and elapsed time for each run. Cold model
  initialization is included in the first elapsed measurement; use elapsedMs
  for diagnostics, **not** as an apples-to-apples warmed inference speed ranking.
- This is retrospective holdout evaluation on historical Yahoo-derived bars.
  Later retrieval may revise prices, and these are not real-time forward
  predictions. The results do not establish profitable trading performance.

## Reproduce with Docker Compose

From the repository root, first obtain/refresh the input panel (optional if you
want to reproduce the existing snapshot):

```sh
docker compose run --rm --build --entrypoint python backend \
  fetch_stock_groups.py --period 3y
```

For manual reproduction, run the **six-model** benchmark. This runs the real Vite
frontend in Chromium through the same Playwright image as the existing stock
browser benchmark. The frontend container must have its npm dependencies
installed via its Dockerfile, and the host needs sufficient memory for TimesFM.

```sh
LOCAL_UID="$(id -u)" LOCAL_GID="$(id -g)" \
  docker compose -f docker-compose.yml -f docker-compose.all-model-evaluation.yml \
    up --build --abort-on-container-exit --exit-code-from all_model_eval

# Optional: stop just this evaluation's containers afterwards
LOCAL_UID="$(id -u)" LOCAL_GID="$(id -g)" \
  docker compose -f docker-compose.yml -f docker-compose.all-model-evaluation.yml \
    down
```

On complete success, the run writes:

- `reports/stocks/all-models.json` (full result and provenance)
- `README.md` between `<!-- ALL_MODEL_EVALUATION:START -->` and
  `<!-- ALL_MODEL_EVALUATION:END -->`

On any failed inference or incomplete matrix, the README is **not** replaced.
No fabricated numbers, no silent algorithm drop, no comparison against results
from an earlier or incompatible benchmark. The only scheduled workflow now refreshes this section. Historical benchmark
sections remain available for manually triggered runs and should not be
mistaken for the daily matched-six comparison.

Run lightweight correctness tests (no model downloads required). In the stock-evaluation image instead of `frontend`, the repository is mounted
at `/repo`, so the actual test command is:

```sh
LOCAL_UID="$(id -u)" LOCAL_GID="$(id -g)" \
  docker compose -f docker-compose.yml -f docker-compose.all-model-evaluation.yml \
    run --rm --no-deps all_model_eval \
    node --test scripts/all-model-evaluation-core.test.mjs
```

## Consolidated GitHub Actions schedule

`.github/workflows/daily-all-model-evaluation.yml` is the **only** scheduled
stock forecast evaluation. It is triggered **daily at 18:37 JST** (09:37 UTC),
after the Tokyo cash market close. There is **no exchange holiday calendar**.
It fetches the latest Yahoo/yfinance stock panel first, verifies the CSV and
metadata agree, and compares the latest trading date plus a stable SHA256
fingerprint of the **272 sessions and domestic stock columns actually used**
by the benchmark with the previously published report. If there is no new
trading session and no relevant price correction, inference is skipped.

The `evaluationWindowSha256` field is intentionally independent of older 3-year
history rows and unrelated macro series; these may change on non-trading days
without affecting any prediction. An existing report without this fingerprint
skips same-date evaluation; the next newly dated session creates the field.
The first-ever run evaluates the available snapshot. Use `workflow_dispatch`
with `force=true` to rerun unchanged data after code/model changes.

Missing same-day stock prices are **not considered a workflow error** on a
weekend, holiday, or data-delay day; the last published table remains intact.
A collector failure, CSV/metadata mismatch or newer previously published date
is an error. A delayed new session can be picked up on the next daily run.

CI runs the real six frontend methods in Chromium through Docker Compose.
The ~1 GB TimesFM ONNX is cached with `actions/cache` and mounted read-only
into the Vite public directory; it is **never committed to Git**. CI uses a
separate compose override (`docker-compose.all-model-ci.yml`) to set
`VITE_TIMESFM_MODEL_URL`, leaving manual browser runs unchanged.

When all **30 predictions** and the matching input fingerprint validate,
`README.md`, `reports/stocks/all-models.json` and the three corresponding
`data/stocks/multivariate*` snapshot files are committed together and pushed.
The workflow explicitly dispatches `pages.yml` after a successful bot push
(GITHUB_TOKEN pushes do not trigger further workflows automatically).
Failed inference never publishes
a partial README update. GitHub's scheduled jobs can be delayed or skipped;
monitor Actions and use `workflow_dispatch` to retry if needed. Memory limits
on hosted runners may require a larger or self-hosted runner.

The older `evaluation.yml` and `frontend-stock-evaluation.yml` workflows have
**no schedule**; their manual triggers remain for reproducing historical,
different experimental protocols. Do not compare their scores directly against
this six-model holdout. This evaluation is retrospective; the 16 held-out
sessions end on the latest fetched market date, not necessarily the current
calendar day and not a forward-looking forecast quality guarantee.
