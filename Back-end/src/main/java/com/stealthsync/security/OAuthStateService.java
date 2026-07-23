package com.stealthsync.security;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
/** Issues one-time HMAC-signed OAuth state values without exposing an owner ID in the callback URL. */
public class OAuthStateService {

    private static final Base64.Encoder URL_ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder URL_DECODER = Base64.getUrlDecoder();
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final ObjectMapper objectMapper;
    private final byte[] signingKey;
    private final long lifetimeSeconds;
    private final Map<String, Long> consumedNonces = new ConcurrentHashMap<>();

    public OAuthStateService(
            ObjectMapper objectMapper,
            @Value("${stealthsync.oauth.state-secret}") String secret,
            @Value("${stealthsync.oauth.state-lifetime-seconds:600}") long lifetimeSeconds) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalArgumentException("OAUTH_STATE_SECRET or JWT_SECRET is required.");
        }
        this.objectMapper = objectMapper;
        this.signingKey = sha256(secret);
        this.lifetimeSeconds = lifetimeSeconds;
    }

    public String issue(Long ownerID, String provider, String deviceIdentifierHash) {
        if (ownerID == null || isBlank(provider) || isBlank(deviceIdentifierHash)) {
            throw new IllegalArgumentException("OAuth state requires a user, provider, and device.");
        }
        long issuedAt = Instant.now().getEpochSecond();
        Map<String, Object> claims = new LinkedHashMap<>();
        claims.put("sub", ownerID);
        claims.put("provider", provider);
        claims.put("device", deviceIdentifierHash);
        claims.put("iat", issuedAt);
        claims.put("exp", issuedAt + lifetimeSeconds);
        claims.put("nonce", randomNonce());
        try {
            String payload = URL_ENCODER.encodeToString(objectMapper.writeValueAsBytes(claims));
            return payload + "." + URL_ENCODER.encodeToString(sign(payload));
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to create OAuth state.", exception);
        }
    }

    public OAuthState consume(String state, String expectedProvider) {
        try {
            String[] parts = state == null ? new String[0] : state.split("\\.");
            if (parts.length != 2) {
                throw new IllegalArgumentException("OAuth state is missing or malformed.");
            }
            byte[] suppliedSignature = URL_DECODER.decode(parts[1]);
            if (!MessageDigest.isEqual(sign(parts[0]), suppliedSignature)) {
                throw new IllegalArgumentException("OAuth state signature is invalid.");
            }
            Map<String, Object> claims = objectMapper.readValue(
                    URL_DECODER.decode(parts[0]),
                    new TypeReference<Map<String, Object>>() { }
            );
            long now = Instant.now().getEpochSecond();
            long expiresAt = requiredLong(claims, "exp");
            String provider = requiredString(claims, "provider");
            String nonce = requiredString(claims, "nonce");
            if (expiresAt <= now) {
                throw new IllegalArgumentException("OAuth state has expired.");
            }
            if (!provider.equalsIgnoreCase(expectedProvider)) {
                throw new IllegalArgumentException("OAuth state does not match this provider.");
            }
            consumedNonces.entrySet().removeIf(entry -> entry.getValue() <= now);
            if (consumedNonces.putIfAbsent(nonce, expiresAt) != null) {
                throw new IllegalArgumentException("OAuth state has already been used.");
            }
            return new OAuthState(
                    requiredLong(claims, "sub"),
                    provider,
                    requiredString(claims, "device"),
                    expiresAt,
                    nonce
            );
        } catch (IllegalArgumentException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new IllegalArgumentException("OAuth state is invalid.", exception);
        }
    }

    private byte[] sign(String value) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(signingKey, "HmacSHA256"));
        return mac.doFinal(value.getBytes(StandardCharsets.UTF_8));
    }

    private byte[] sha256(String value) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to initialize OAuth signing key.", exception);
        }
    }

    private String randomNonce() {
        byte[] bytes = new byte[24];
        SECURE_RANDOM.nextBytes(bytes);
        return URL_ENCODER.encodeToString(bytes);
    }

    private long requiredLong(Map<String, Object> claims, String name) {
        Object value = claims.get(name);
        if (value instanceof Number number) return number.longValue();
        if (value != null) return Long.parseLong(String.valueOf(value));
        throw new IllegalArgumentException("OAuth state is missing " + name + ".");
    }

    private String requiredString(Map<String, Object> claims, String name) {
        String value = claims.get(name) == null ? null : String.valueOf(claims.get(name));
        if (isBlank(value)) throw new IllegalArgumentException("OAuth state is missing " + name + ".");
        return value;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    public record OAuthState(Long ownerID, String provider, String deviceIdentifierHash, long expiresAt, String nonce) { }
}
