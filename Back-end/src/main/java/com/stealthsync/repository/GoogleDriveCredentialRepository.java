package com.stealthsync.repository;

import com.stealthsync.model.entity.GoogleDriveCredential;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface GoogleDriveCredentialRepository extends JpaRepository<GoogleDriveCredential, Long> {
    Optional<GoogleDriveCredential> findByOwnerID(Long ownerID);

    void deleteByOwnerID(Long ownerID);
}
