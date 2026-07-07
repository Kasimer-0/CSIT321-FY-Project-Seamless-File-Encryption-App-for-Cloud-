package com.stealthsync.repository;

import com.stealthsync.model.entity.CloudProviderCredential;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/** Owner-scoped OAuth credential lookup for provider adapters that use the shared credential table. */
public interface CloudProviderCredentialRepository extends JpaRepository<CloudProviderCredential, Long> {
    Optional<CloudProviderCredential> findByProviderIgnoreCaseAndOwnerID(String provider, Long ownerID);

    void deleteByProviderIgnoreCaseAndOwnerID(String provider, Long ownerID);
}
