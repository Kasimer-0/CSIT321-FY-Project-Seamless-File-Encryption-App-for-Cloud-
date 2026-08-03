package com.stealthsync.service.security;

import java.util.regex.Pattern;

/** Applies the same password requirements to registration and authenticated password changes. */
public final class PasswordPolicy {

    public static final String ERROR_MESSAGE =
            "Password must be 8-128 characters and include uppercase, lowercase, number, and symbol.";

    private static final Pattern STRONG_PASSWORD = Pattern.compile(
            "^(?=.{8,128}$)(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9\\s]).*$");

    private PasswordPolicy() {
    }

    public static boolean isStrong(String password) {
        return password != null && STRONG_PASSWORD.matcher(password).matches();
    }

    public static void requireStrong(String password) {
        if (!isStrong(password)) {
            throw new IllegalArgumentException(ERROR_MESSAGE);
        }
    }
}
