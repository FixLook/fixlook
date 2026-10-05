import { test } from "node:test";
import assert from "node:assert/strict";
import { moneyToCents, bratislavaDateTime } from "../src/lib/pricing";
import { needsCheckoutReconciliation } from "../src/lib/checkout";
test("Slovak decimal prices preserve cents and reject malformed money", () => {
  assert.equal(moneyToCents("49,99"),4999); assert.equal(moneyToCents("0.29"),29); assert.equal(moneyToCents("100000"),10000000);
  for (const value of ["", "-1", "1.234", "1e3", "NaN", "100000.01", null]) assert.throws(()=>moneyToCents(value));
});
test("Bratislava scheduling is independent of server timezone and rejects DST ambiguity", () => {
  assert.equal(bratislavaDateTime("2027-01-10T10:30"),"2027-01-10T09:30:00.000Z");
  assert.equal(bratislavaDateTime("2027-07-10T10:30"),"2027-07-10T08:30:00.000Z");
  assert.throws(()=>bratislavaDateTime("2027-03-28T02:30")); assert.throws(()=>bratislavaDateTime("2027-10-31T02:30"));
  assert.throws(()=>bratislavaDateTime("2027-02-31T10:00")); assert.equal(bratislavaDateTime(""),null);
});

test("missing checkout responses must not cause a second charge after idempotency expires", () => {
  const started = "2026-10-05T00:00:00Z";
  assert.equal(needsCheckoutReconciliation(started, Date.parse("2026-10-05T22:59:59Z")), false);
  assert.equal(needsCheckoutReconciliation(started, Date.parse("2026-10-05T23:00:00Z")), true);
  assert.equal(needsCheckoutReconciliation(started, Date.parse("2026-10-07T00:00:00Z")), true);
  assert.equal(needsCheckoutReconciliation(null), true);
  assert.equal(needsCheckoutReconciliation("invalid"), true);
});
