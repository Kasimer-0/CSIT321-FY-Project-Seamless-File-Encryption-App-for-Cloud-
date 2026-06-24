package com.stealthsync.controller;

import com.stealthsync.model.entity.EncryptedFileRecord;
import com.stealthsync.service.AppDataService;
import com.stealthsync.security.CurrentUserService;
import com.stealthsync.service.crypto.AesGcmService;
import com.stealthsync.service.crypto.EncryptionPolicyService;
import com.stealthsync.service.crypto.UserVaultService;
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
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173"}, allowCredentials = "true") // Allow cross-origin access to the Vite frontend via the default port.
@Slf4j
/** Provides local encryption/decryption downloads and the demo encrypted-file storage workflow. */
public class FileController {

    private final AesGcmService aesGcmService;
    private final AppDataService dataStore;
    private final CurrentUserService currentUserService;
    private final UserVaultService userVaultService;
    private final EncryptionPolicyService encryptionPolicyService;

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
        return ResponseEntity.ok(dataStore.listEncryptedFiles(currentUserService.requireUserID()));
    }

    @PostMapping("/files/encrypt-upload")
    public ResponseEntity<EncryptedFileRecord> encryptAndUpload(@RequestParam("file") MultipartFile file) {
        Long ownerID = currentUserService.requireUserID();
        try {
            String filename = safeFilename(file.getOriginalFilename(), "uploaded-file");
            EncryptionPolicyService.EncryptionPolicy policy = encryptionPolicyService.policyForUser(ownerID);
            String vaultPassphrase = userVaultService.filePassphraseFor(ownerID);
            try (InputStream encryptedStream = aesGcmService.encryptStream(
                    file.getInputStream(),
                    vaultPassphrase,
                    policy.keyLengthBits())) {
                EncryptedFileRecord record = dataStore.storeEncryptedFile(
                        ownerID,
                        filename,
                        file.getSize(),
                        policy.algorithm(),
                        encryptedStream.readAllBytes()
                );
                return ResponseEntity.ok(record);
            }
        } catch (Exception e) {
            log.error("Encrypt-upload API failed", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/files/{id}/decrypt-download")
    public ResponseEntity<InputStreamResource> decryptAndDownload(@PathVariable Long id) {
        return dataStore.findEncryptedFile(id, currentUserService.requireUserID())
                .map(this::downloadRecord)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /** Removes a legacy encrypted record stored in StealthSync's local database. */
    @DeleteMapping("/files/{id}")
    public ResponseEntity<Void> deleteEncryptedFile(@PathVariable Long id) {
        return dataStore.deleteEncryptedFile(id, currentUserService.requireUserID())
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }

    /**
     * JavaFX WebView does not implement browser Blob downloads. Save the decrypted
     * file explicitly for the desktop UI and return the absolute path so the user
     * can see exactly where the file was written.
     */
    @PostMapping("/files/{id}/decrypt-save")
    public ResponseEntity<Map<String, Object>> decryptAndSave(@PathVariable Long id) {
        return dataStore.findEncryptedFile(id, currentUserService.requireUserID())
                .map(this::saveRecordToDownloads)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    private ResponseEntity<InputStreamResource> downloadRecord(EncryptedFileRecord record) {
        try {
            byte[] plaintext = decryptRecord(record);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, attachmentHeader(record.getFileName()))
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .body(new InputStreamResource(new ByteArrayInputStream(plaintext)));
        } catch (Exception e) {
            log.error("Decrypt-download API failed", e);
            return ResponseEntity.badRequest().build();
        }
    }

    /** Saves plaintext to Downloads and returns the actual collision-safe path. */
    private ResponseEntity<Map<String, Object>> saveRecordToDownloads(EncryptedFileRecord record) {
        try {
            byte[] plaintext = decryptRecord(record);
            Path downloads = Path.of(System.getProperty("user.home"), "Downloads");
            Files.createDirectories(downloads);
            Path destination = availableDestination(downloads, safeFilename(record.getFileName(), "decrypted-file"));
            Files.write(destination, plaintext);

            return ResponseEntity.ok(Map.of(
                    "fileName", destination.getFileName().toString(),
                    "savedPath", destination.toAbsolutePath().toString(),
                    "size", plaintext.length
            ));
        } catch (Exception e) {
            log.error("Decrypt-save API failed", e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "message", "Unable to save the decrypted file to Downloads."
            ));
        }
    }

    private byte[] decryptRecord(EncryptedFileRecord record) throws Exception {
        // Early prototype seed records have no ciphertext. Preserve their demo
        // behavior while real records continue through AES-GCM decryption.
        if (record.getEncryptedContent() == null || record.getEncryptedContent().length == 0) {
            return ("Demo decrypted content for " + record.getFileName()).getBytes(StandardCharsets.UTF_8);
        }
        Long ownerID = record.getOwnerID() == null ? currentUserService.requireUserID() : record.getOwnerID();
        EncryptionPolicyService.EncryptionPolicy policy = encryptionPolicyService.policyForAlgorithm(record.getEncMethod());
        String vaultPassphrase = userVaultService.filePassphraseFor(ownerID);
        try (InputStream decryptedStream = aesGcmService.decryptStream(
                new ByteArrayInputStream(record.getEncryptedContent()),
                vaultPassphrase,
                policy.keyLengthBits())) {
            return decryptedStream.readAllBytes();
        }
    }

    /** Keeps existing downloads intact by selecting the first unused filename. */
    private Path availableDestination(Path directory, String filename) {
        Path initial = directory.resolve(filename);
        if (!Files.exists(initial)) {
            return initial;
        }

        int dot = filename.lastIndexOf('.');
        String stem = dot > 0 ? filename.substring(0, dot) : filename;
        String extension = dot > 0 ? filename.substring(dot) : "";
        for (int suffix = 1; suffix < 10_000; suffix++) {
            Path candidate = directory.resolve(stem + " (" + suffix + ")" + extension);
            if (!Files.exists(candidate)) {
                return candidate;
            }
        }
        throw new IllegalStateException("Unable to choose an available download filename.");
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
