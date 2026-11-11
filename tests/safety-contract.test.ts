import assert from "node:assert/strict";
import test from "node:test";
import { assessRisk } from "../artifacts/ai-wellness-stone/src/services/safety.ts";
import { STATE_COMMANDS, validateStoneCommand } from "../artifacts/ai-wellness-stone/src/types/stoneCommand.ts";

test("known crisis phrases remain high risk", () => {
  for (const phrase of ["I am ending my life", "I want to hurt myself", "I am suicidal"]) {
    assert.equal(assessRisk(phrase).level, "high");
  }
  assert.notEqual(assessRisk("I feel stressed about school").level, "high");
});

test("all frozen device states remain deterministic and bounded", () => {
  assert.equal(Object.keys(STATE_COMMANDS).length, 8);
  for (const [state, command] of Object.entries(STATE_COMMANDS)) {
    const safe = validateStoneCommand({ version: 1, state: state as never, ...command });
    assert.ok(safe.intensity >= 0 && safe.intensity <= 1);
    if (state === "CRISIS") {
      assert.equal(safe.cmd, "safety_mode");
      assert.equal(safe.haptic, "none");
      assert.equal(safe.intensity, 0);
    } else {
      assert.ok(safe.duration_s >= 10 && safe.duration_s <= 180);
    }
  }
});
