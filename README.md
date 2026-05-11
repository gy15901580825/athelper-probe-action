# athelper-probe-action

GitHub Action wrapping the [ATHelper](https://www.at-helper.com) red-team CLI for AI agents.

## Quick start

```yaml
- uses: gy15901580825/athelper-probe-action@v2
  with:
    api-token: ${{ secrets.ATHELPER_API_TOKEN }}
    target-config: |
      {
        "kind": "openai_compat",
        "endpoint_url": "https://api.openai.com/v1/chat/completions",
        "model": "gpt-4o-mini",
        "api_key": "${{ secrets.MY_AGENT_API_KEY }}"
      }
    threshold: warn
```

## Inputs

| Name | Required | Default | Description |
|---|---|---|---|
| `api-token` | yes | — | ATHelper API token (`secrets.ATHELPER_API_TOKEN`) |
| `target-config` | yes | — | Path to `target.json` or inline JSON describing the target agent |
| `probes` | no | `all` | Comma-separated probe IDs, or `all` for the full library |
| `threshold` | no | `warn` | `warn` / `block-on-critical` / `block-on-high` |
| `per-run-cap` | no | `0.50` | Per-run USD cost cap |
| `cli-version` | no | `v0.1.1` | athelper-probe CLI release tag |

## Target schema

The `target-config` accepts 5 kinds:

- `openai_compat` — OpenAI Chat Completions compatible endpoint
- `anthropic_native` — Anthropic Messages API
- `custom_http` — any HTTP endpoint with Jinja2-templated request body + JSONPath response extraction
- `grpc` — gRPC server with reflection enabled
- `browser_use` — browser-using agent (DOM injection / UI phishing / visual prompt injection / OS-cmd scenarios)

Full field reference per kind: [ATHelper docs](https://www.at-helper.com/docs/redteam/target-spec).

## What it does

1. Downloads the `athelper-probe` binary from `gy15901580825/at_helper_cli` releases
2. Runs probes against your target; emits SARIF
3. Uploads SARIF to GitHub code-scanning (Security tab)
4. Posts PR check summary with finding counts
5. Adds PR check annotations (capped at 50 per check)
6. Exits non-zero if `threshold` is `block-on-critical` or `block-on-high` and the run breaches

## Threshold modes

- `warn` (default) — never fails the PR; surfaces counts in summary
- `block-on-critical` — fails PR if any finding has severity `critical`
- `block-on-high` — fails PR if any finding has severity `high` or `critical`

## Migrating from v1

`v1` shipped against CLI `v0.1.0` and was broken by the `v0.1.1` CLI flag rename. `v2` is the working release.

Breaking changes vs `v1`:

- `probe-ids` input renamed to `probes`. Default is now `all` (CLI v0.1.1 requires the flag).
- `cli-version` default bumped to `v0.1.1`.
- The CLI binary installs to `$RUNNER_TEMP/athelper-bin` instead of `/usr/local/bin` (no `sudo` needed).

Upgrade by changing `@v1` → `@v2` and renaming the input.

## License

MIT.
