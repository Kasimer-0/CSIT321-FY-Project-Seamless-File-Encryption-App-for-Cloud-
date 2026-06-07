package com.stealthsync.controller;

import com.stealthsync.model.entity.EncryptedFileRecord;
import com.stealthsync.service.AppDataService;
import com.stealthsync.service.crypto.AesGcmService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173"}, allowCredentials = "true") // Allow cross-origin access to the Vite frontend via the default port.
@Slf4j
public class FileController {

    private static final String DEFAULT_PASSPHRASE = "stealthsync-demo-passphrase";
    private static final String DEFAULT_ENC_METHOD = "AES-256-GCM";

    private final AesGcmService aesGcmService;
    private final AppDataService dataStore;

    /**
     * Receive files uploaded via drag-and-drop from the frontend and encrypt them silently in the background (FR2.2 / FR1.1)
     */
    @PostMapping("/api/file/encrypt")
    public ResponseEntity<InputStreamResource> encryptFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam("passphrase") String passphrase) {
        try {
            log.info("Receiving file for encryption: {}, size: {} bytes", file.getOriginalFilename(), file.getSize());
            
            // Streaming processing is used to directly acquire the input stream, never reading it all into memory at once,
            //  thus preventing OutOfMemoryError (OOM).
            InputStream encryptedStream = aesGcmService.encryptStream(file.getInputStream(), passphrase);
            String downloadName = safeFilename(file.getOriginalFilename(), "encrypted-file") + ".enc";

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, attachmentHeader(downloadName))
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .body(new InputStreamResource(encryptedStream));
        } catch (Exception e) {
            log.error("Encryption API failed", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Receive encrypted files and automatically decrypt and download them (FR2.3)
     */
    @PostMapping("/api/file/decrypt")
    public ResponseEntity<InputStreamResource> decryptFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam("passphrase") String passphrase) {
        try {
            log.info("Receiving file for decryption: {}", file.getOriginalFilename());
            
            InputStream decryptedStream = aesGcmService.decryptStream(file.getInputStream(), passphrase);

            String originalName = file.getOriginalFilename();
            if (originalName != null && originalName.endsWith(".enc")) {
                originalName = originalName.substring(0, originalName.length() - 4);
            }
            String downloadName = safeFilename(originalName, "decrypted-file");

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, attachmentHeader(downloadName))
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .body(new InputStreamResource(decryptedStream));
        } catch (Exception e) {
            log.error("Decryption API failed. This implies tampering or incorrect passphrase.", e);
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/files")
    public ResponseEntity<List<EncryptedFileRecord>> getEncryptedFiles() {
        return ResponseEntity.ok(dataStore.listEncryptedFiles());
    }

    @PostMapping("/files/encrypt-upload")
    public ResponseEntity<EncryptedFileRecord> encryptAndUpload(@RequestParam("file") MultipartFile file) {
        try {
            String filename = safeFilename(file.getOriginalFilename(), "uploaded-file");
            InputStream encryptedStream = aesGcmService.encryptStream(file.getInputStream(), DEFAULT_PASSPHRASE);
            EncryptedFileRecord record = dataStore.storeEncryptedFile(
                    filename,
                    file.getSize(),
                    DEFAULT_ENC_METHOD,
                    encryptedStream.readAllBytes()
            );
            return ResponseEntity.ok(record);
        } catch (Exception e) {
            log.error("Encrypt-upload API failed", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/files/{id}/decrypt-download")
    public ResponseEntity<InputStreamResource> decryptAndDownload(@PathVariable Long id) {
        return dataStore.findEncryptedFile(id)
                .map(this::downloadRecord)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    private ResponseEntity<InputStreamResource> downloadRecord(EncryptedFileRecord record) {
        try {
            byte[] plaintext;
            if (record.getEncryptedContent() == null || record.getEncryptedContent().length == 0) {
                plaintext = ("Demo decrypted content for " + record.getFileName()).getBytes(StandardCharsets.UTF_8);
            } else {
                try (InputStream decryptedStream = aesGcmService.decryptStream(
                        new ByteArrayInputStream(record.getEncryptedContent()),
                        DEFAULT_PASSPHRASE)) {
                    plaintext = decryptedStream.readAllBytes();
                }
            }

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, attachmentHeader(record.getFileName()))
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .body(new InputStreamResource(new ByteArrayInputStream(plaintext)));
        } catch (Exception e) {
            log.error("Decrypt-download API failed", e);
            return ResponseEntity.badRequest().build();
        }
    }

    private String attachmentHeader(String filename) {
        return ContentDisposition.attachment()
                .filename(filename, StandardCharsets.UTF_8)
                .build()
                .toString();
    }

    private String safeFilename(String filename, String fallback) {
        if (filename == null || filename.isBlank()) {
            return fallback;
        }
        return filename.replace("\\", "_").replace("/", "_");
    }
}
