package com.stealthsync.model.dto;

import com.stealthsync.model.entity.EncryptionKeyRecord;

/** Reports whether a trusted-device package created a key or matched an existing one. */
public record TrustedKeyPackageImportResponse(String status, EncryptionKeyRecord key) {
}
