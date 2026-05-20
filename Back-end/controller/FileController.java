package com.stealthsync.controller;

import com.stealthsync.service.crypto.AesGcmService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;

@RestController
@RequestMapping("/api/file")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173") // Allow cross-origin access to the Vite frontend via the default port.
@Slf4j
public class FileController {

    private final AesGcmService aesGcmService;

    /**
     * Receive files uploaded via drag-and-drop from the frontend and encrypt them silently in the background (FR2.2 / FR1.1)
     */
    @PostMapping("/encrypt")
    public ResponseEntity<InputStreamResource> encryptFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam("passphrase") String passphrase) {
        try {
            log.info("Receiving file for encryption: {}, size: {} bytes", file.getOriginalFilename(), file.getSize());
            
            // Streaming processing is used to directly acquire the input stream, never reading it all into memory at once,
            //  thus preventing OutOfMemoryError (OOM).
            InputStream encryptedStream = aesGcmService.encryptStream(file.getInputStream(), passphrase);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file.getOriginalFilename() + ".enc\"")
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
    @PostMapping("/decrypt")
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

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + originalName + "\"")
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .body(new InputStreamResource(decryptedStream));
        } catch (Exception e) {
            log.error("Decryption API failed. This implies tampering or incorrect passphrase.", e);
            return ResponseEntity.badRequest().build();
        }
    }
}