package com.stealthsync.service.crypto;

import org.springframework.stereotype.Service;
import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.secret.SecretKeySpec;
import javax.crypto.spec.GCMParameterSpec;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.SequenceInputStream;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Arrays;

@Service
public class AesGcmService {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int TAG_LENGTH_BIT = 128; // GCM certification label length (16 bytes)
    private static final int IV_LENGTH_BYTE = 12;  // GCM standard IV length (12 bytes)
    private static final int BUFFER_SIZE = 8192;   // 8KB stream processing buffer

    /**
     * A 256-bit security key (SHA-256) is derived from the user-input passphrase.
     */
    private SecretKey deriveKey(String passphrase) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] keyBytes = digest.digest(passphrase.getBytes("UTF-8"));
        return new SecretKeySpec(keyBytes, "AES");
    }

    /**
     * Streaming encryption: Reads the raw stream in chunks, generates a random IV along with it, and returns the ciphertext input stream (FR1.1).
     */
    public InputStream encryptStream(InputStream plaintextStream, String passphrase) throws Exception {
        SecretKey secretKey = deriveKey(passphrase);

        // 1. Randomly generate a 12-byte IV
        byte[] iv = new byte[IV_LENGTH_BYTE];
        SecureRandom random = new SecureRandom();
        random.nextBytes(iv);

        // 2. Initialize Cipher
        Cipher cipher = Cipher.getInstance(ALGORITHM);
        GCMParameterSpec parameterSpec = new GCMParameterSpec(TAG_LENGTH_BIT, iv);
        cipher.init(Cipher.ENCRYPT_MODE, secretKey, parameterSpec);

        // 3. Execute chunked streaming encryption
        ByteArrayOutputStream encryptedBuffer = new ByteArrayOutputStream();
        byte[] buffer = new byte[BUFFER_SIZE];
        int numBytesRead;
        while ((numBytesRead = plaintextStream.read(buffer)) != -1) {
            byte[] output = cipher.update(buffer, 0, numBytesRead);
            if (output != null) {
                encryptedBuffer.write(output);
            }
        }
        byte[] finalOutput = cipher.doFinal();
        if (finalOutput != null) {
            encryptedBuffer.write(finalOutput);
        }

        // 4. Adheres to zero-knowledge architecture: 
        // The IV is appended to the very beginning of the ciphertext and transmitted back together, leaving no key trace locally.
        ByteArrayInputStream ivStream = new ByteArrayInputStream(iv);
        ByteArrayInputStream cipherStream = new ByteArrayInputStream(encryptedBuffer.toByteArray());

        return new SequenceInputStream(ivStream, cipherStream);
    }

    /**
     * Streaming decryption: Reads the IV from the beginning of the encrypted stream,
     *  then decrypts the rest of the data. If the data is tampered with, an error will be thrown (FR1.1).
     */
    public InputStream decryptStream(InputStream encryptedStream, String passphrase) throws Exception {
        SecretKey secretKey = deriveKey(passphrase);

        // 1. Read the 12-byte IV from the beginning of the encrypted stream
        byte[] iv = new byte[IV_LENGTH_BYTE];
        int ivBytesRead = encryptedStream.read(iv);
        if (ivBytesRead != IV_LENGTH_BYTE) {
            throw new IllegalArgumentException("Invalid encrypted file format: missing IV header.");
        }

        // 2. Initialize Cipher to decryption mode using the extracted IV.
        Cipher cipher = Cipher.getInstance(ALGORITHM);
        GCMParameterSpec parameterSpec = new GCMParameterSpec(TAG_LENGTH_BIT, iv);
        cipher.init(Cipher.DECRYPT_MODE, secretKey, parameterSpec);

        // 3. Streaming decryption of the main ciphertext
        ByteArrayOutputStream plaintextBuffer = new ByteArrayOutputStream();
        byte[] buffer = new byte[BUFFER_SIZE];
        int numBytesRead;
        while ((numBytesRead = encryptedStream.read(buffer)) != -1) {
            byte[] output = cipher.update(buffer, 0, numBytesRead);
            if (output != null) {
                plaintextBuffer.write(output);
            }
        }
        // GCM automatically verifies data integrity during doFinal.
        // If the encrypted data in the cloud has been tampered with, an AEADBadTagException will be thrown here.
        byte[] finalOutput = cipher.doFinal();
        if (finalOutput != null) {
            plaintextBuffer.write(finalOutput);
        }

        return new ByteArrayInputStream(plaintextBuffer.toByteArray());
    }
}