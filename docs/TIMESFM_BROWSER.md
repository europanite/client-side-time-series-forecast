# TimesFM 2.5 (experimental; browser-only)

The browser runs the Hugging Face **Transformers TimesFM 2.5 ONNX** export with
`onnxruntime-web` (WASM). This is a third-party export of Google's TimesFM 2.5
checkpoint, **not** Google's official browser distribution.

Important: The previous integration relied on `@agentix-e/timesfm-core` and
`@agentix-e/timesfm-web` v1.0.0. Those npm packages can install while still
lacking the `dist` runtime paths required by Vite. They are removed here.
The ONNX export from the `AgentiX-E/timesfm-ts` GitHub release is **not**
interchangeable with the Transformers ONNX graph and must not be selected.

## Model file

Default source (downloaded only after choosing TimesFM and pressing Forecast):

https://huggingface.co/pdufour/timesfm-2.5-200m-transformers-onnx/resolve/main/onnx/model.onnx

- Approximately 1 GB; large RAM and WASM memory required. No server computes forecasts.
- Alternatively download **this exact model** to a `.onnx` file and select it in
  the TimesFM model file control. Do not select a ZIP, .safetensors, or a
  `timesfm-ts` release ONNX file.
- You may override the default remote source at Vite build time with
  `VITE_TIMESFM_MODEL_URL`, provided CORS allows cross-origin fetch.
- The app performs single-target forecasting. Other CSV columns and company
  fundamentals are not supplied to TimesFM.
- This specific ONNX export may require a **fixed batch size of 2** despite
  the published dynamic-batch description. To avoid `past_values` dimension
  errors, the browser submits **two copies of the same target history** as
  `[2,context_length]`, then reads only the first output row. No extra series
  or future target data is introduced.
- TimesFM internally produces 128 or more positions; only the first 16 are
  displayed. From `full_predictions` [batch,horizon,10], channels 1/5/9 are
  p10/p50/p90. No statistics-based fallback silently substitutes for the model.
- Missing observations are interpolated in time without removing any rows.
- Model bytes are not stored in Git and do not belong in the GitHub Pages build.

## Docker Compose workflow

At the repository root (after applying patch):

```sh
docker compose run --rm -T --no-deps --entrypoint sh frontend -lc '
  npm install &&
  npx tsc --noEmit &&
  npm test -- --ci --runInBand &&
  npm run build
'

docker compose up -d --build frontend
```

Keep the updated `frontend/app/package-lock.json` produced by `npm install`.
The image build uses `npm ci`, which requires a synchronized lockfile.

## Validation status

Unit tests verify temporal interpolation and strict ONNX output shape mapping.
An actual ~1 GB TimesFM 2.5 ONNX inference on a real browser is **not tested**
by the unit suite; benchmark performance and compatibility must be confirmed
before advertising TimesFM accuracy or production support.

For a fair comparison to Chronos-2, evaluate the same chronological holdout
windows and metrics (MAE/RMSE/sMAPE), then log model download, init and inference
latency separately. TimesFM remains opt-in and is not part of the scheduled stock
benchmark jobs.
