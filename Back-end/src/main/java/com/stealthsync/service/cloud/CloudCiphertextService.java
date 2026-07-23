package com.stealthsync.service.cloud;

import com.stealthsync.model.entity.CloudFileRecord;
import com.stealthsync.exception.CloudCiphertextNotFoundException;
import com.stealthsync.repository.CloudFileRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
/** Persists the owner/provider boundary for V2 cloud object IDs. */
public class CloudCiphertextService {
    private final CloudFileRecordRepository repository;

    @Transactional
    public CloudFileRecord register(
            Long ownerID,
            String provider,
            String remoteFileID,
            String objectName,
            EncryptedEnvelopeV2Inspector.EnvelopeHeader header,
            long plaintextSize,
            long ciphertextSize) {
        Instant now = Instant.now();
        return repository.save(new CloudFileRecord(
                null, ownerID, provider, remoteFileID, objectName, header.algorithm(), header.keyFingerprint(),
                header.encryptedMetadata(), header.version(), plaintextSize, ciphertextSize, now, now));
    }

    public CloudFileRecord requireOwned(Long ownerID, String provider, String remoteFileID) {
        return repository.findByOwnerIDAndProviderIgnoreCaseAndRemoteFileID(ownerID, provider, remoteFileID)
                .orElseThrow(CloudCiphertextNotFoundException::new);
    }

    public List<CloudFileRecord> listOwned(Long ownerID, String provider) {
        return repository.findByOwnerIDAndProviderIgnoreCaseOrderByCreatedAtDesc(ownerID, provider);
    }

    @Transactional
    public void deleteOwned(Long ownerID, String provider, String remoteFileID) {
        repository.delete(requireOwned(ownerID, provider, remoteFileID));
    }
}
