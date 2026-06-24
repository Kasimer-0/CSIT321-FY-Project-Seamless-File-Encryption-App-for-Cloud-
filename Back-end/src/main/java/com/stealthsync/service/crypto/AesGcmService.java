package com.stealthsync.service.crypto;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import javax.crypto.Cipher;
import javax.crypto.CipherInputStream;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import java.io.ByteArrayInputStream;
import java.io.EOFException;
import java.io.InputStream;
import java.io.SequenceInputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.security.SecureRandom;

@Service
@RequiredArgsConstructor
/** Performs authenticated AES-GCM streaming with a passphrase-derived key and per-file salt/IV. */
public class AesGcmService {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final byte[] MAGIC = "STLH".getBytes(StandardCharsets.US_ASCII);
    private static final byte VERSION = 1;
    private static final int TAG_LENGTH_BIT = 128; // GCM authentication tag length (16 bytes)
    private static final int IV_LENGTH_BYTE = 12;  // GCM standard IV length (12 bytes)
    private static final int SALT_LENGTH_BYTE = 16;
    private static final int HEADER_LENGTH_BYTE = MAGIC.length + 1 + SALT_LENGTH_BYTE + IV_LENGTH_BYTE;

    private final KeyManagementService keyManagementService;
    private final SecureRandom secureRandom = new SecureRandom();

    /**
     * Streaming encryption: reads the raw stream in chunks and prefixes the ciphertext with
     * a small versioned header: STLH + version + salt + IV.
     */
    public InputStream encryptStream(InputStream plaintextStream, String passphrase) throws Exception {
        return encryptStream(plaintextStream, passphrase, 256);
    }

    public InputStream encryptStream(InputStream plaintextStream, String passphrase, int keyLengthBits) throws Exception {
        byte[] salt = randomBytes(SALT_LENGTH_BYTE);
        byte[] iv = randomBytes(IV_LENGTH_BYTE);
        SecretKey secretKey = keyManagementService.deriveAesKey(passphrase, salt, keyLengthBits);

        Cipher cipher = Cipher.getInstance(ALGORITHM);
        GCMParameterSpec parameterSpec = new GCMParameterSpec(TAG_LENGTH_BIT, iv);
        cipher.init(Cipher.ENCRYPT_MODE, secretKey, parameterSpec);

        ByteArrayInputStream headerStream = new ByteArrayInputStream(buildHeader(salt, iv));
        CipherInputStream cipherStream = new CipherInputStream(plaintextStream, cipher);

        return new SequenceInputStream(headerStream, cipherStream);
    }

    /**
     * Streaming decryption for both the current STLH format and the earlier IV-only format.
     */
    public InputStream decryptStream(InputStream encryptedStream, String passphrase) throws Exception {
        return decryptStream(encryptedStream, passphrase, 256);
    }

    public InputStream decryptStream(InputStream encryptedStream, String passphrase, int keyLengthBits) throws Exception {
        byte[] header = new byte[HEADER_LENGTH_BYTE];
        int headerBytesRead = readUpTo(encryptedStream, header);

        if (startsWithMagic(header, headerBytesRead)) {
            if (headerBytesRead < HEADER_LENGTH_BYTE) {
                throw new EOFException("Invalid encrypted file format: incomplete STLH header.");
            }
            if (header[MAGIC.length] != VERSION) {
                throw new IllegalArgumentException("Unsupported encrypted file version: " + header[MAGIC.length]);
            }

            byte[] salt = Arrays.copyOfRange(header, MAGIC.length + 1, MAGIC.length + 1 + SALT_LENGTH_BYTE);
            byte[] iv = Arrays.copyOfRange(header, MAGIC.length + 1 + SALT_LENGTH_BYTE, HEADER_LENGTH_BYTE);
            SecretKey secretKey = keyManagementService.deriveAesKey(passphrase, salt, keyLengthBits);
            return decryptPayload(encryptedStream, secretKey, iv);
        }

        if (headerBytesRead < IV_LENGTH_BYTE) {
            throw new EOFException("Invalid encrypted file format: missing IV header.");
        }

        byte[] iv = Arrays.copyOf(header, IV_LENGTH_BYTE);
        SecretKey secretKey = keyManagementService.deriveLegacyAesKey(passphrase);
        InputStream ciphertextStream = new SequenceInputStream(
                new ByteArrayInputStream(header, IV_LENGTH_BYTE, headerBytesRead - IV_LENGTH_BYTE),
                encryptedStream
        );
        return decryptPayload(ciphertextStream, secretKey, iv);
    }

    private InputStream decryptPayload(InputStream ciphertextStream, SecretKey secretKey, byte[] iv) throws Exception {
        Cipher cipher = Cipher.getInstance(ALGORITHM);
        GCMParameterSpec parameterSpec = new GCMParameterSpec(TAG_LENGTH_BIT, iv);
        cipher.init(Cipher.DECRYPT_MODE, secretKey, parameterSpec);

        // GCM verifies data integrity when the stream reaches the end.
        return new CipherInputStream(ciphertextStream, cipher);
    }

    private byte[] randomBytes(int length) {
        byte[] bytes = new byte[length];
        secureRandom.nextBytes(bytes);
        return bytes;
    }

    private byte[] buildHeader(byte[] salt, byte[] iv) {
        byte[] header = new byte[HEADER_LENGTH_BYTE];
        System.arraycopy(MAGIC, 0, header, 0, MAGIC.length);
        header[MAGIC.length] = VERSION;
        System.arraycopy(salt, 0, header, MAGIC.length + 1, SALT_LENGTH_BYTE);
        System.arraycopy(iv, 0, header, MAGIC.length + 1 + SALT_LENGTH_BYTE, IV_LENGTH_BYTE);
        return header;
    }

    private int readUpTo(InputStream encryptedStream, byte[] destination) throws Exception {
        int totalRead = 0;
        while (totalRead < destination.length) {
            int bytesRead = encryptedStream.read(destination, totalRead, destination.length - totalRead);
            if (bytesRead == -1) {
                break;
            }
            totalRead += bytesRead;
        }
        return totalRead;
    }

    private boolean startsWithMagic(byte[] header, int bytesRead) {
        if (bytesRead < MAGIC.length) {
            return false;
        }
        for (int index = 0; index < MAGIC.length; index++) {
            if (header[index] != MAGIC[index]) {
                return false;
            }
        }
        return true;
    }
}
