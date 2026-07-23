package com.stealthsync.exception;

/** Hides whether a V2 remote file ID exists for another StealthSync owner. */
public class CloudCiphertextNotFoundException extends RuntimeException {
    public CloudCiphertextNotFoundException() {
        super("Encrypted cloud file was not found for this user.");
    }
}
