package com.stealthsync.model.dto;

import java.time.Instant;

public record GoogleDriveFileDTO(
        String fileId,
        String fileName,
        String originalName,
        long fileSize,
        Instant createdAt,
        Instant modifiedAt
) {
}
