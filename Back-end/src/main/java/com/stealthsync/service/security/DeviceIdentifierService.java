package com.stealthsync.service.security;

import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

@Service
/** Validates browser device identifiers and converts them to non-reversible database hashes. */
public class DeviceIdentifierService {

    public static final String HEADER_NAME = "X-StealthSync-Device-ID";

    public String requireHash(String rawIdentifier) {
        if (rawIdentifier == null || rawIdentifier.isBlank() || rawIdentifier.length() > 200) {
            throw new IllegalArgumentException("A valid StealthSync device identifier is required.");
        }
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(rawIdentifier.trim().getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception exception) {
            throw new IllegalStateException("SHA-256 device hashing is unavailable.", exception);
        }
    }
}
