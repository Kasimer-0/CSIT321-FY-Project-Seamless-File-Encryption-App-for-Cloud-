package com.stealthsync.model.dto;

import java.time.Instant;

/** Portable non-secret encryption key metadata used for manual trusted-device onboarding. */
public record TrustedKeyPackage(
        String version,
        Instant exportedAt,
        Long keyID,
        String keyName,
        String algorithm,
        String fingerprint,
        String salt,
        String keyScheme
) {
}
