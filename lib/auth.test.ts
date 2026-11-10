import test from "node:test";
import assert from "node:assert/strict";
import {
  authenticateUser,
  registerUserAccount,
  formatNameFromEmail,
} from "./auth";

test("default accounts can log in with 12345", () => {
  const res = authenticateUser("dewi@gmail.com", "12345", []);
  assert.equal(res.success, true);
  assert.equal(res.user?.name, "Dewi");
});

test("unregistered email returns NOT_FOUND", () => {
  const res = authenticateUser("baru@gmail.com", "12345", []);
  assert.equal(res.success, false);
  assert.equal(res.code, "NOT_FOUND");
});

test("wrong password returns WRONG_PASSWORD", () => {
  const res = authenticateUser("dewi@gmail.com", "wrong", []);
  assert.equal(res.success, false);
  assert.equal(res.code, "WRONG_PASSWORD");
});

test("registering a new account allows logging in with new credentials", () => {
  const reg = registerUserAccount("peneliti@lab.com", "rahasia123", [], "Dr. Sari");
  assert.equal(reg.success, true);
  assert.equal(reg.account?.email, "peneliti@lab.com");
  assert.equal(reg.account?.name, "Dr. Sari");

  const loginRes = authenticateUser(
    "peneliti@lab.com",
    "rahasia123",
    reg.updatedCustomAccounts
  );
  assert.equal(loginRes.success, true);
  assert.equal(loginRes.user?.name, "Dr. Sari");
});

test("duplicate registration is rejected", () => {
  const reg = registerUserAccount("dewi@gmail.com", "newpass", []);
  assert.equal(reg.success, false);
});

test("formatNameFromEmail capitalizes username prefix", () => {
  assert.equal(formatNameFromEmail("naufalrizki@gmail.com"), "Naufalrizki");
});
