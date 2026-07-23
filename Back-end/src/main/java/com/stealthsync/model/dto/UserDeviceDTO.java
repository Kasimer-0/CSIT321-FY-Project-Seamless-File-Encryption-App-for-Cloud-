package com.stealthsync.model.dto;

import java.time.Instant;

/** Safe device response that omits the stored identifier hash. */
public record UserDeviceDTO(
        Long deviceID,
        Long ownerID,
        String deviceName,
        String platform,
        Instant firstSeenAt,
        Instant lastSeenAt,
        boolean primaryDevice,
        boolean active,
        Instant revokedAt,
        boolean currentDevice) {
}
