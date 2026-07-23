package com.stealthsync.exception;

/** Explicit authorization failure for missing, revoked, or over-limit customer devices. */
public class DeviceAccessDeniedException extends RuntimeException {
    public DeviceAccessDeniedException(String message) {
        super(message);
    }
}
