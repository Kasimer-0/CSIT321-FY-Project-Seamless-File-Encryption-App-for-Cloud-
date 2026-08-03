package com.stealthsync.service.security;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class PasswordPolicyTest {

    @Test
    void acceptsPasswordWithAllRequiredCharacterClasses() {
        assertDoesNotThrow(() -> PasswordPolicy.requireStrong("Strong@123"));
    }

    @Test
    void rejectsPasswordsMissingRequiredCharacterClasses() {
        assertThrows(IllegalArgumentException.class, () -> PasswordPolicy.requireStrong("123123123"));
        assertThrows(IllegalArgumentException.class, () -> PasswordPolicy.requireStrong("NoSymbol123"));
        assertThrows(IllegalArgumentException.class, () -> PasswordPolicy.requireStrong("NOLOWER@123"));
        assertThrows(IllegalArgumentException.class, () -> PasswordPolicy.requireStrong("noupper@123"));
    }
}
