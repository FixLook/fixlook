import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("landing page keeps authenticated visitors in their account", async () => {
  const page = await readFile("src/app/page.tsx", "utf8");
  const logo = await readFile("src/components/brand-logo.tsx", "utf8");
  const shell = await readFile("src/components/app-shell.tsx", "utf8");

  assert.match(logo, /href="\/"/, "Logo should still open the homepage");
  assert.match(page, /supabase\.auth\.getUser\(\)/, "Homepage must verify its session");
  assert.match(page, /dashboardPathForRole\(/, "Account link must respect the user's role");
  assert.match(page, /accountPath \?\? "\/login"/, "Signed-in visitors must not see a login-only destination");
  assert.match(page, /accountPath \? "Môj účet" : "Prihlásiť sa"/, "Header must reflect sign-in state");
  assert.match(page, /accountPath \?\? "\/register"/, "Primary signup CTA must handle signed-in users");
  assert.doesNotMatch(logo, /signOutAction|signOut\(/, "Logo must not log out");
  assert.match(shell, /action=\{signOutAction\}/, "Logout remains an explicit action");
});
