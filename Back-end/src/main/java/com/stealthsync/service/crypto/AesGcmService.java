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
import java.security.SecureRandom;

@Service
@RequiredArgsConstructor
public class AesGcmService {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int TAG_LENGTH_BIT = 128; // GCM certification label length (16 bytes)
    private static final int IV_LENGTH_BYTE = 12;  // GCM standard IV length (12 bytes)

    private final KeyManagementService keyManagementService;

    /**
     * Streaming encryption: Reads the raw stream in chunks, generates a random IV along with it, and returns the ciphertext input stream (FR1.1).
     */
    public InputStream encryptStream(InputStream plaintextStream, String passphrase) throws Exception {
        SecretKey secretKey = keyManagementService.deriveAesKey(passphrase);

        // 1. Randomly generate a 12-byte IV
        byte[] iv = new byte[IV_LENGTH_BYTE];
        SecureRandom random = new SecureRandom();
        random.nextBytes(iv);

        // 2. Initialize Cipher
        Cipher cipher = Cipher.getInstance(ALGORITHM);
        GCMParameterSpec parameterSpec = new GCMParameterSpec(TAG_LENGTH_BIT, iv);
        cipher.init(Cipher.ENCRYPT_MODE, secretKey, parameterSpec);

        // 3. Adheres to zero-knowledge architecture:
        // The IV is appended to the very beginning of the ciphertext and transmitted back together, leaving no key trace locally.
        ByteArrayInputStream ivStream = new ByteArrayInputStream(iv);
        CipherInputStream cipherStream = new CipherInputStream(plaintextStream, cipher);

        return new SequenceInputStream(ivStream, cipherStream);
    }

    /**
     * Streaming decryption: Reads the IV from the beginning of the encrypted stream,
     *  then decrypts the rest of the data. If the data is tampered with, an error will be thrown (FR1.1).
     */
    public InputStream decryptStream(InputStream encryptedStream, String passphrase) throws Exception {
        SecretKey secretKey = keyManagementService.deriveAesKey(passphrase);

        // 1. Read the 12-byte IV from the beginning of the encrypted stream
        byte[] iv = new byte[IV_LENGTH_BYTE];
        int totalRead = 0;
        while (totalRead < IV_LENGTH_BYTE) {
            int bytesRead = encryptedStream.read(iv, totalRead, IV_LENGTH_BYTE - totalRead);
            if (bytesRead == -1) {
                throw new EOFException("Invalid encrypted file format: missing IV header.");
            }
            totalRead += bytesRead;
        }

        // 2. Initialize Cipher to decryption mode using the extracted IV.
        Cipher cipher = Cipher.getInstance(ALGORITHM);
        GCMParameterSpec parameterSpec = new GCMParameterSpec(TAG_LENGTH_BIT, iv);
        cipher.init(Cipher.DECRYPT_MODE, secretKey, parameterSpec);

        // GCM verifies data integrity when the stream reaches the end.
        return new CipherInputStream(encryptedStream, cipher);
    }
}