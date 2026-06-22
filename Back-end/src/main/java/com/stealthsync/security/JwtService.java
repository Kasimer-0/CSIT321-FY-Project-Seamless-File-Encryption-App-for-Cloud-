package com.stealthsync.security;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stealthsync.model.entity.UserAccount;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
/** Creates and validates compact HS256 tokens with sub, role, and exp claims. */
public class JwtService {

    private static final Base64.Encoder URL_ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder URL_DECODER = Base64.getUrlDecoder();

    private final ObjectMapper objectMapper;
    private final byte[] signingKey;
    private final long expirationSeconds;

    public JwtService(
            ObjectMapper objectMapper,
            @Value("${stealthsync.jwt.secret}") String secret,
            @Value("${stealthsync.jwt.expiration-seconds:3600}") long expirationSeconds) {
        this.objectMapper = objectMapper;
        this.signingKey = sha256(secret);
        this.expirationSeconds = expirationSeconds;
    }

    public String createToken(UserAccount user) {
        long issuedAt = Instant.now().getEpochSecond();
        Map<String, Object> claims = new LinkedHashMap<>();
        claims.put("sub", String.valueOf(user.getUserID()));
        claims.put("role", user.getRole());
        claims.put("iat", issuedAt);
        claims.put("exp", issuedAt + expirationSeconds);

        try {
            String header = encode(objectMapper.writeValueAsBytes(Map.of("alg", "HS256", "typ", "JWT")));
            String payload = encode(objectMapper.writeValueAsBytes(claims));
            String unsignedToken = header + "." + payload;
            return unsignedToken + "." + encode(sign(unsignedToken));
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to create authentication token.", exception);
        }
    }

    public JwtClaims parse(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 3) {
                throw new IllegalArgumentException("Malformed token.");
            }
            byte[] expectedSignature = sign(parts[0] + "." + parts[1]);
            byte[] suppliedSignature = URL_DECODER.decode(parts[2]);
            if (!MessageDigest.isEqual(expectedSignature, suppliedSignature)) {
                throw new IllegalArgumentException("Invalid token signature.");
            }

            Map<String, Object> claims = objectMapper.readValue(
                    URL_DECODER.decode(parts[1]),
                    new TypeReference<Map<String, Object>>() { }
            );
            long expiration = ((Number) claims.get("exp")).longValue();
            if (expiration <= Instant.now().getEpochSecond()) {
                throw new IllegalArgumentException("Token has expired.");
            }
            return new JwtClaims(
                    Long.parseLong(String.valueOf(claims.get("sub"))),
                    String.valueOf(claims.get("role")),
                    expiration
            );
        } catch (IllegalArgumentException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new IllegalArgumentException("Invalid authentication token.", exception);
        }
    }

    private byte[] sign(String value) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(signingKey, "HmacSHA256"));
        return mac.doFinal(value.getBytes(StandardCharsets.UTF_8));
    }

    private String encode(byte[] value) {
        return URL_ENCODER.encodeToString(value);
    }

    private byte[] sha256(String value) {
        try {
            return MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to initialize JWT signing key.", exception);
        }
    }

    public record JwtClaims(Long userID, String role, long expiresAt) { }
}