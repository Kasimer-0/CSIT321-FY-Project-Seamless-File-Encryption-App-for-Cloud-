package com.stealthsync.model.dto;

import java.time.Instant;

/** Safe provider-neutral cloud file metadata returned without OAuth tokens or key material. */
public record CloudFileDTO(
        String provider,
        String fileId,
        String fileName,
        String originalName,
        long fileSize,
        Instant createdAt,
        Instant modifiedAt,
        String encMethod,
        Long keyID,
        String keyName,
        String keyFingerprint
) {
}
