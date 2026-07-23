package com.stealthsync.service.cloud;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Base64;
import java.util.Set;

@Component
@RequiredArgsConstructor
/** Validates the public V2 envelope header without decrypting file content or metadata. */
public class EncryptedEnvelopeV2Inspector {
    public static final int VERSION = 2;
    private static final byte[] MAGIC = new byte[]{0x53, 0x53, 0x45, 0x4e, 0x43, 0x56, 0x32, 0x00};
    private static final int MAX_HEADER_BYTES = 64 * 1024;
    private static final Set<String> ALGORITHMS = Set.of("AES-128", "AES-256-GCM");

    private final ObjectMapper objectMapper;

    public EnvelopeHeader inspect(byte[] envelope) {
        if (envelope == null || envelope.length <= MAGIC.length + Integer.BYTES) {
            throw new IllegalArgumentException("Encrypted envelope is truncated.");
        }
        if (!Arrays.equals(MAGIC, Arrays.copyOfRange(envelope, 0, MAGIC.length))) {
            throw new IllegalArgumentException("This is not a StealthSync V2 encrypted file.");
        }
        int headerLength = ByteBuffer.wrap(envelope, MAGIC.length, Integer.BYTES).getInt();
        int headerStart = MAGIC.length + Integer.BYTES;
        int ciphertextStart = headerStart + headerLength;
        if (headerLength < 2 || headerLength > MAX_HEADER_BYTES || ciphertextStart > envelope.length - 16) {
            throw new IllegalArgumentException("Encrypted envelope header is invalid.");
        }
        try {
            JsonNode header = objectMapper.readTree(new String(
                    envelope, headerStart, headerLength, StandardCharsets.UTF_8));
            int version = header.path("version").asInt(-1);
            String algorithm = requiredText(header, "algorithm");
            String fingerprint = requiredText(header, "keyFingerprint");
            String iv = requiredText(header, "iv");
            String metadataIv = requiredText(header, "metadataIv");
            String encryptedMetadata = requiredText(header, "encryptedMetadata");
            if (version != VERSION) {
                throw new IllegalArgumentException("Unsupported encrypted envelope version.");
            }
            if (!ALGORITHMS.contains(algorithm)) {
                throw new IllegalArgumentException("Unsupported encrypted envelope algorithm.");
            }
            if (!fingerprint.matches("[A-Za-z0-9_-]{16}")) {
                throw new IllegalArgumentException("Encrypted envelope key fingerprint is invalid.");
            }
            requireDecodedLength(iv, "Content IV", 12);
            requireDecodedLength(metadataIv, "Metadata IV", 12);
            byte[] encryptedMetadataBytes = decode(encryptedMetadata, "Encrypted metadata");
            if (encryptedMetadataBytes.length < 17 || encryptedMetadataBytes.length > MAX_HEADER_BYTES) {
                throw new IllegalArgumentException("Encrypted metadata length is invalid.");
            }
            return new EnvelopeHeader(version, algorithm, fingerprint, encryptedMetadata, ciphertextStart);
        } catch (IllegalArgumentException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new IllegalArgumentException("Encrypted envelope header is not valid JSON.");
        }
    }

    private String requiredText(JsonNode node, String field) {
        String value = node.path(field).asText("");
        if (value.isBlank()) {
            throw new IllegalArgumentException("Encrypted envelope " + field + " is required.");
        }
        return value;
    }

    private void requireDecodedLength(String value, String field, int expected) {
        if (decode(value, field).length != expected) {
            throw new IllegalArgumentException(field + " must be " + expected + " bytes.");
        }
    }

    private byte[] decode(String value, String field) {
        try {
            return Base64.getUrlDecoder().decode(value);
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException(field + " is not valid base64url.");
        }
    }

    public record EnvelopeHeader(
            int version,
            String algorithm,
            String keyFingerprint,
            String encryptedMetadata,
            int ciphertextOffset) {
    }
}
