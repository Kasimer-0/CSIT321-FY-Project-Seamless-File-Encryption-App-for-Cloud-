package com.stealthsync.repository;

import com.stealthsync.model.entity.UserVaultRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/** Database access for server-managed user vault records. */
public interface UserVaultRepository extends JpaRepository<UserVaultRecord, Long> {
    Optional<UserVaultRecord> findByOwnerID(Long ownerID);
}
