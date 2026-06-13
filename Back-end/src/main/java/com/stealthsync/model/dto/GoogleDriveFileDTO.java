package com.stealthsync.model.dto;

import java.time.Instant;

/** Safe Google Drive file metadata returned to the frontend without OAuth credentials. */
public record GoogleDriveFileDTO(
        String fileId,
        String fileName,
        String originalName,
        long fileSize,
        Instant createdAt,
        Instant modifiedAt
) {
}
