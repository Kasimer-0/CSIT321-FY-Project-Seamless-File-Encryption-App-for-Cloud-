import assert from "node:assert/strict"
import test from "node:test"
import { isStrongPassword } from "../src/lib/passwordPolicy.ts"

test("password policy requires uppercase, lowercase, number, symbol, and valid length", () => {
    assert.equal(isStrongPassword("Strong@123"), true)
    assert.equal(isStrongPassword("123123123"), false)
    assert.equal(isStrongPassword("NoSymbol123"), false)
    assert.equal(isStrongPassword("NOLOWER@123"), false)
    assert.equal(isStrongPassword("noupper@123"), false)
})
