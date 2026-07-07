package com.stealthsync.service.cloud;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stealthsync.service.crypto.AesGcmService;
import com.stealthsync.service.crypto.UserVaultService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Base64;

@Service
@RequiredArgsConstructor
/** Adds encrypted StealthSync metadata to provider objects that do not support appProperties. */
public class CloudFileMetadataCodec {

    private static final String HEADER_PREFIX = "STLH-METADATA-V1:";
    private static final byte HEADER_DELIMITER = (byte) '\n';
    private static final String DEFAULT_ENC_METHOD = "AES-256-GCM";

    private final ObjectMapper objectMapper;
    private final AesGcmService aesGcmService;
    private final UserVaultService userVaultService;

    public byte[] packageEncryptedContent(
            Long ownerID,
            CloudStorageAdapter.CloudUploadMetadata metadata,
            byte[] encryptedContent) throws Exception {
        byte[] metadataBytes = objectMapper.writeValueAsBytes(metadata);
        byte[] encryptedMetadata = aesGcmService.encryptStream(
                new ByteArrayInputStream(metadataBytes),
                userVaultService.metadataPassphraseFor(ownerID),
                256
        ).readAllBytes();

        ByteArrayOutputStream output = new ByteArrayOutputStream();
        output.write((HEADER_PREFIX + Base64.getUrlEncoder().withoutPadding().encodeToString(encryptedMetadata))
                .getBytes(StandardCharsets.UTF_8));
        output.write(HEADER_DELIMITER);
        output.write(encryptedContent);
        return output.toByteArray();
    }

    public PackagedCloudFile unpack(Long ownerID, String fallbackFileName, byte[] remoteBytes) {
        int delimiter = firstDelimiter(remoteBytes);
        if (delimiter > HEADER_PREFIX.length()) {
            String header = new String(remoteBytes, 0, delimiter, StandardCharsets.UTF_8);
            if (header.startsWith(HEADER_PREFIX)) {
                try {
                    byte[] encryptedMetadata = Base64.getUrlDecoder().decode(header.substring(HEADER_PREFIX.length()));
                    byte[] metadataBytes = aesGcmService.decryptStream(
                            new ByteArrayInputStream(encryptedMetadata),
                            userVaultService.metadataPassphraseFor(ownerID),
                            256
                    ).readAllBytes();
                    JsonNode metadata = objectMapper.readTree(metadataBytes);
                    return new PackagedCloudFile(
                            new CloudStorageAdapter.CloudUploadMetadata(
                                    metadata.path("originalName").asText(stripEncryptedSuffix(fallbackFileName)),
                                    metadata.path("encMethod").asText(DEFAULT_ENC_METHOD),
                                    metadata.hasNonNull("keyID") ? metadata.path("keyID").asLong() : null,
                                    textOrNull(metadata, "keyName"),
                                    textOrNull(metadata, "keyFingerprint")
                            ),
                            Arrays.copyOfRange(remoteBytes, delimiter + 1, remoteBytes.length)
                    );
                } catch (Exception ignored) {
                    // Fall through to legacy metadata so one unreadable file does not break the list.
                }
            }
        }

        return new PackagedCloudFile(
                new CloudStorageAdapter.CloudUploadMetadata(
                        stripEncryptedSuffix(fallbackFileName),
                        DEFAULT_ENC_METHOD,
                        null,
                        null,
                        null
                ),
                remoteBytes
        );
    }

    private int firstDelimiter(byte[] remoteBytes) {
        int maxScan = Math.min(remoteBytes.length, 16 * 1024);
        for (int index = 0; index < maxScan; index++) {
            if (remoteBytes[index] == HEADER_DELIMITER) {
                return index;
            }
        }
        return -1;
    }

    private String textOrNull(JsonNode node, String field) {
        JsonNode value = node.path(field);
        return value.isMissingNode() || value.isNull() || value.asText().isBlank() ? null : value.asText();
    }

    private String stripEncryptedSuffix(String name) {
        String suffix = ".stealthsync.enc";
        return name != null && name.endsWith(suffix) ? name.substring(0, name.length() - suffix.length()) : name;
    }

    public record PackagedCloudFile(
            CloudStorageAdapter.CloudUploadMetadata metadata,
            byte[] encryptedContent
    ) {
    }
}
