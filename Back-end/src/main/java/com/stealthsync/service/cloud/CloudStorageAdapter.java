package com.stealthsync.service.cloud;

import com.stealthsync.model.dto.CloudFileDTO;
import com.stealthsync.model.entity.CloudStorageLink;

import java.io.InputStream;
import java.util.List;

/** Provider-neutral contract for OAuth, encrypted object transfer, and owner-scoped cloud access. */
public interface CloudStorageAdapter {

    String providerKey();

    String providerPath();

    String providerLabel();

    boolean isConfigured();

    boolean isConnected(Long ownerID);

    String createAuthorizationUrl(Long ownerID, String deviceIdentifierHash) throws Exception;

    CloudStorageLink completeAuthorization(String code, String state) throws Exception;

    List<CloudFileDTO> listEncryptedFilesForProvider(Long ownerID) throws Exception;

    CloudFileDTO uploadEncryptedForProvider(Long ownerID, CloudUploadMetadata metadata, InputStream encryptedContent) throws Exception;

    DownloadedCloudFile downloadEncryptedForProvider(Long ownerID, String fileId) throws Exception;

    CloudFileDTO uploadCiphertextForProvider(Long ownerID, CiphertextUploadMetadata metadata, InputStream ciphertext)
            throws Exception;

    DownloadedCiphertext downloadCiphertextForProvider(Long ownerID, String fileId) throws Exception;

    void deleteEncryptedFileForProvider(Long ownerID, String fileId) throws Exception;

    void disconnect(Long ownerID);

    record CloudUploadMetadata(
            String originalName,
            String encMethod,
            Long keyID,
            String keyName,
            String keyFingerprint
    ) {
    }

    record DownloadedCloudFile(
            String originalName,
            String encMethod,
            Long keyID,
            String keyName,
            String keyFingerprint,
            byte[] encryptedContent
    ) {
    }

    record CiphertextUploadMetadata(
            String objectName,
            String algorithm,
            String keyFingerprint,
            String encryptedMetadata,
            long plaintextSize,
            int envelopeVersion
    ) {
    }

    record DownloadedCiphertext(
            String objectName,
            byte[] ciphertext
    ) {
    }
}
