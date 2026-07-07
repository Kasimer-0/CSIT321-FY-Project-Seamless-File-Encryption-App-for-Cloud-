package com.stealthsync.model.dto;

/** Selects the current user's key to export as a trusted-device package. */
public record TrustedKeyPackageExportRequest(Long keyID) {
}
