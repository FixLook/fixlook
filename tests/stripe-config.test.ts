import { test } from "node:test";
import assert from "node:assert/strict";
import { canRetryFailedCheckout, stripeKeyForMode } from "../src/lib/stripe-config";

test("test deployments refuse live keys, including restricted keys", () => {
  for (const type of ["sk", "rk"]) {
    assert.equal(stripeKeyForMode(`${type}_test_fixture`, "test"), `${type}_test_fixture`);
    assert.throws(() => stripeKeyForMode(`${type}_live_fixture`, "test"), /režimu/);
    assert.throws(() => stripeKeyForMode(`${type}_test_fixture`, "live"), /režimu/);
  }
  assert.throws(() => stripeKeyForMode("pk_test_fixture", "test"), /serverový/);
  assert.throws(() => stripeKeyForMode(undefined, "test"), /serverový/);
  assert.throws(() => stripeKeyForMode("rk_test_fixture", "invalid"), /STRIPE_EXPECTED_MODE/);
  assert.throws(() => stripeKeyForMode("sk_live_fixture", undefined), /STRIPE_EXPECTED_MODE/);
  assert.throws(() => stripeKeyForMode("sk_test_fixture", ""), /STRIPE_EXPECTED_MODE/);
});

test("processing, open or paid checkouts cannot be reset as failed", () => {
  assert.equal(canRetryFailedCheckout("complete", "unpaid", "requires_payment_method"), true);
  assert.equal(canRetryFailedCheckout("complete", "unpaid", "canceled"), true);
  for (const status of ["processing", "requires_action", "requires_capture", "succeeded"]) {
    assert.equal(canRetryFailedCheckout("complete", "unpaid", status), false);
  }
  assert.equal(canRetryFailedCheckout("open", "unpaid", "requires_payment_method"), false);
  assert.equal(canRetryFailedCheckout("complete", "paid", "requires_payment_method"), false);
});
