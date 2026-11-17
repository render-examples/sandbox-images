# Playwright browser sandbox

Pinned Playwright 1.65.1, its matching Chromium build, Node 24 and TypeScript. Browser binaries and Linux libraries are installed during the image build. No browser service, model key or runtime download is required.

The two filesystem recipes use a synthetic order application served on loopback. They submit a form, check independently recorded server state, extract table values, reject a deliberately wrong total, decode the PNG screenshot and inspect the trace archive. The `app-tests` recipe is the regression-test starting point; `artifact-capture` exposes the same checked app for screenshot/trace customization. Neither recipe calls a model.

```sh
python3 scripts/check-image.py playwright
```

Use `/workspace/node_modules` from a script in `/workspace`, or execute the installed fixture at `/opt/render/fixtures/playwright`. Results are under `/workspace/output`. A filesystem snapshot captures prepared files, not the running browser or app; both restart after restore. Native recipe checks also reject changed inputs and outputs and restore prepared state into a separate offline container.

Current local evidence is recorded in `docs/browser-data-assets-validation-2026-11-16.md`, including the final source checkpoint. Internal publication, exact published-digest hosted checks, and real Render snapshot capture/restore remain pending; this asset stays draft/unverified.

[Playwright browser installation](https://playwright.dev/docs/browsers) · [Trace viewer](https://playwright.dev/docs/trace-viewer)
