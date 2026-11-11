import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const root = new URL("../", import.meta.url);
const lock = readFileSync(new URL("pnpm-lock.yaml", root), "utf8");
const packages = lock.split("\npackages:\n")[1]?.split("\nsnapshots:\n")[0];
assert.ok(packages, "Expected a pnpm lockfile with a packages section");
const versions = new Map();
for (const match of packages.matchAll(/^  '?(@?[^'\n]+)@(\d+\.\d+\.\d+)'?:$/gm)) {
  const [, name, version] = match;
  versions.set(name, [...(versions.get(name) ?? []), version]);
}

// Security floors stay within upstream-compatible major lines. The UUID
// consumer uses v4() only. Metro's checked-in patches adapt image-size v2.
const floors = {
  "@babel/core": { 7: "7.29.6" },
  "body-parser": { 2: "2.4.0" },
  "brace-expansion": { 1: "1.1.21", 2: "2.1.7", 5: "5.0.12" },
  esbuild: { 0: "0.28.1" },
  "fast-uri": { 3: "3.1.9" },
  "image-size": { 2: "2.0.3" },
  "js-yaml": { 3: "3.15.2", 4: "4.3.2" },
  "linkify-it": { 5: "5.0.2" },
  "markdown-it": { 14: "14.3.3" },
  nanoid: { 3: "3.3.18" },
  postcss: { 8: "8.5.23" },
  qs: { 6: "6.15.2" },
  "shell-quote": { 1: "1.11.0" },
  tar: { 7: "7.5.21" },
  undici: { 6: "6.29.1" },
  uuid: { 11: "11.1.1" },
  vite: { 7: "7.3.7" },
};

function atLeast(actual, minimum) {
  const a = actual.split(".").map(Number);
  const b = minimum.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return true;
}

for (const [name, majors] of Object.entries(floors)) {
  test(`${name} has only patched, compatible versions`, () => {
    // Parent upgrades may remove these dependencies completely.
    for (const version of versions.get(name) ?? []) {
      const major = Number(version.split(".")[0]);
      const minimum = majors[major];
      if (!minimum && major > Math.max(...Object.keys(majors).map(Number))) continue;
      assert.ok(minimum, `Review unexpected major version: ${name}@${version}`);
      assert.ok(atLeast(version, minimum), `${name}@${version} is below ${minimum}`);
    }
  });
}

test("vulnerable image-size v1 is absent", () => {
  assert.ok(versions.has("image-size"));
  assert.ok(versions.get("image-size").every(version => !version.startsWith("1.")));
});

const mobileRequire = createRequire(new URL("artifacts/ai-wellness-stone/package.json", root));
const cliRequire = createRequire(mobileRequire.resolve("@expo/cli/package.json"));
const configRequire = createRequire(cliRequire.resolve("@expo/config-plugins/package.json"));
const ngrokRequire = createRequire(mobileRequire.resolve("@expo/ngrok/package.json"));
const expoMetroRequire = createRequire(cliRequire.resolve("@expo/metro/package.json"));
const metroRequire = createRequire(expoMetroRequire.resolve("metro/package.json"));

test("xcode generates project IDs and ngrok retains its CommonJS UUID v4 API", () => {
  const xcode = configRequire("xcode");
  const project = xcode.project("unused.pbxproj");
  project.hash = { project: { objects: {} } };
  assert.match(project.generateUuid(), /^[A-F0-9]{24}$/);
  assert.equal(ngrokRequire("uuid/package.json").version, "11.1.1");
  assert.equal(ngrokRequire("uuid").validate(ngrokRequire("uuid").v4()), true);
  // Importing ngrok must not launch a tunnel.
  assert.equal(typeof mobileRequire("@expo/ngrok").connect, "function");
});

test("both Metro consumers read PNG buffers and file-path assets", async () => {
  const nativeRequire = createRequire(mobileRequire.resolve("react-native/package.json"));
  const communityCliRequire = createRequire(nativeRequire.resolve("@react-native/community-cli-plugin/package.json"));
  const nativeMetroRequire = createRequire(communityCliRequire.resolve("metro/package.json"));
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==",
    "base64",
  );
  const directory = mkdtempSync(join(tmpdir(), "metro-asset-security-"));
  try {
    const path = join(directory, "smoke.png");
    writeFileSync(path, png);
    writeFileSync(join(directory, "text.txt"), "not an image");
    for (const require of [metroRequire, nativeMetroRequire]) {
      const { getAssetSize, getAssetData } = require("./src/Assets.js");
      const dimensions = getAssetSize("png", png, path);
      assert.equal(dimensions.width, 1);
      assert.equal(dimensions.height, 1);
      const asset = await getAssetData(path, "smoke.png", [], null, "/assets");
      assert.equal(asset.width, 1);
      assert.equal(asset.height, 1);
      const text = await getAssetData(join(directory, "text.txt"), "text.txt", [], null, "/assets");
      assert.equal(text.width, undefined);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
