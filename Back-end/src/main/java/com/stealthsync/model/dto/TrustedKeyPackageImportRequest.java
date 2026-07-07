package com.stealthsync.model.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/** Carries a previously exported trusted-device package into the signed-in account. */
public record TrustedKeyPackageImportRequest(@JsonProperty("package") TrustedKeyPackage keyPackage) {
}
