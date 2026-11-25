import assert from "node:assert/strict"
import { isPastIuranDeadline, shouldBlockIuranStatus } from "../lib/iuran-rules.mjs"

assert.equal(isPastIuranDeadline(4), false)
assert.equal(isPastIuranDeadline(5), true)
assert.equal(isPastIuranDeadline(31), true)
assert.equal(shouldBlockIuranStatus({ dayOfMonth: 5, role: "user", status: "pending" }), true)
assert.equal(shouldBlockIuranStatus({ dayOfMonth: 5, role: "user", status: null }), true)
assert.equal(shouldBlockIuranStatus({ dayOfMonth: 5, role: "user", status: "paid" }), false)
assert.equal(shouldBlockIuranStatus({ dayOfMonth: 5, role: "coach", status: "pending" }), false)

console.log("iuran deadline rules: pass")
