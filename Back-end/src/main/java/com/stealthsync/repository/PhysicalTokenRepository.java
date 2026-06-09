package com.stealthsync.repository;

import com.stealthsync.model.entity.PhysicalTokenRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PhysicalTokenRepository extends JpaRepository<PhysicalTokenRecord, Long> {
    List<PhysicalTokenRecord> findByOwnerIDOrderByRegisteredAtDesc(Long ownerID);

    Optional<PhysicalTokenRecord> findByTokenIDAndOwnerID(Long tokenID, Long ownerID);

    void deleteByOwnerID(Long ownerID);
}
