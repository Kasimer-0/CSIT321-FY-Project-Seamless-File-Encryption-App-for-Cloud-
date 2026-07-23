package com.stealthsync.repository;

import com.stealthsync.model.entity.UserDevice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/** Owner-scoped persistence for Premium Multi-device registrations. */
public interface UserDeviceRepository extends JpaRepository<UserDevice, Long> {
    List<UserDevice> findByOwnerIDOrderByFirstSeenAtAsc(Long ownerID);

    Optional<UserDevice> findByOwnerIDAndDeviceIdentifierHash(Long ownerID, String deviceIdentifierHash);

    Optional<UserDevice> findByDeviceIDAndOwnerID(Long deviceID, Long ownerID);

    long countByOwnerIDAndActiveTrueAndRevokedAtIsNull(Long ownerID);
}
