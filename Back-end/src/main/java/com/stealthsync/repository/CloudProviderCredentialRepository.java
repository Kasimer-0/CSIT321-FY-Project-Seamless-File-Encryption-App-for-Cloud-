package com.stealthsync.repository;

import com.stealthsync.model.entity.CloudProviderCredential;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/** Owner-scoped OAuth lookup for Dropbox and OneDrive credentials stored in the shared provider table. */
public interface CloudProviderCredentialRepository extends JpaRepository<CloudProviderCredential, Long> {
    Optional<CloudProviderCredential> findByProviderIgnoreCaseAndOwnerID(String provider, Long ownerID);

    void deleteByProviderIgnoreCaseAndOwnerID(String provider, Long ownerID);
}
