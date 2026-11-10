# Dependency security maintenance

## Scope

The 48 reported findings across 17 dependency names are addressed by patched
dependencies or by removing the vulnerable dependency through an upstream update.
Expo remains on SDK 54, React on 19.1.0, and React Native on 0.81.5.
The one-day package release-age protection remains enabled.

## Compatibility decisions

- Upgrade Expo and its CLI within SDK 54; upgrade Express, Orval, Babel, Vite,
  and esbuild to patched releases. Orval no longer brings in the vulnerable
  Markdown/linkification packages.
- Use major-specific overrides for vulnerable transitive dependencies that
  upstream packages still pin. Keep js-yaml 3 and 4 and brace-expansion 1, 2,
  and 5 separate rather than forcing incompatible APIs onto older consumers.
- Align both consumers on Expo's Metro 0.83.3 suite. Metro 0.83.8 changes watcher-event
  payloads and crashes the SDK 54 CLI on file changes. Instead, update image-size
  to 2.1.0 with a checked-in pnpm patch shared by both Metro consumers. The patch
  adapt its named export and read image files into buffers for the new API.
- Updated Expo config plugins use xcode 4, removing uuid 7. ngrok still needs
  an override to uuid 11.1.1, which preserves its CommonJS `uuid.v4()` usage.
  Later ESM-only UUID majors are not a compatible substitute.
- Align React type definitions on the Expo-compatible 19.1 line so shared
  components do not receive conflicting React ref types.

## Verification

```sh
pnpm install --frozen-lockfile
node --test scripts/verify-security-dependencies.mjs
pnpm run typecheck
pnpm --filter @workspace/api-server run build
cd artifacts/ai-wellness-stone && CI=1 pnpm exec expo install --check
```

The dependency smoke tests guard the security floors, verify ngrok's UUID API,
generate an Xcode project identifier, and exercise both Metro consumers with
PNG buffers, image file paths, and non-image assets.
Run a fresh dependency audit as well: the smoke tests cover these remediation
floors, not every advisory published later.

The browser consent screen renders after the updates. Its Supabase anonymous
sign-in still reports a DNS/network failure in this environment; authenticated
check-in flows were not verified as part of this dependency-only change.

Other findings discovered in the current audit (decode-uri-component,
source-map-js, fast-copy, zod, deepmerge, glob, and minimatch) are outside the
reported list. Their presence means the project must not be described as
entirely vulnerability-free.
