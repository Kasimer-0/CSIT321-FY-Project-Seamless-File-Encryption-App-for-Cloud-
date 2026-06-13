package com.stealthsync.service;

import com.stealthsync.service.crypto.AesGcmService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.InputStream;

@Service
@RequiredArgsConstructor
/** Keeps cloud/file workflows independent from the concrete AES-GCM implementation. */
public class FileOrchestrationService {

    private final AesGcmService aesGcmService;

    public InputStream encryptForUpload(InputStream plaintextStream, String passphrase) throws Exception {
        return aesGcmService.encryptStream(plaintextStream, passphrase);
    }

    public InputStream decryptAfterDownload(InputStream encryptedStream, String passphrase) throws Exception {
        return aesGcmService.decryptStream(encryptedStream, passphrase);
    }
}
