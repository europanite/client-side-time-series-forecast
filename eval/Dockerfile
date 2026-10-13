# Use Chromium in a pinned, supported Playwright image; no alternative ML implementation.
FROM mcr.microsoft.com/playwright:v1.55.1-noble
WORKDIR /runner
RUN npm init -y >/dev/null && npm install --no-audit --no-fund playwright@1.55.1
COPY scripts/frontend-stock-evaluation-core.mjs scripts/benchmark-frontend-stock.mjs scripts/benchmark-frontend-stock-direct.mjs ./
# Run the on-demand benchmark beside /runner/node_modules so ESM can resolve playwright.
COPY scripts/all-model-evaluation-core.mjs scripts/benchmark-all-models-browser.mjs ./
CMD ["node", "/runner/benchmark-frontend-stock.mjs"]
