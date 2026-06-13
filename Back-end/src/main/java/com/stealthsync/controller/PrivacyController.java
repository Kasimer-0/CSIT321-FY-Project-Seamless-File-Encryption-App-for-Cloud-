package com.stealthsync.controller;

import com.stealthsync.service.ai.PrivacyScannerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/privacy")
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173"}, allowCredentials = "true")
@RequiredArgsConstructor
/** Runs lightweight sensitive-data checks before a customer confirms file upload. */
public class PrivacyController {

    private final PrivacyScannerService privacyScannerService;

    @PostMapping("/scan")
    public ResponseEntity<Map<String, Object>> scan(@RequestBody Map<String, String> request) {
        List<String> warnings = new ArrayList<>();
        warnings.addAll(privacyScannerService.scanText(request.get("filename")));
        warnings.addAll(privacyScannerService.scanText(request.get("sample")));
        return ResponseEntity.ok(Map.of(
                "hasWarnings", !warnings.isEmpty(),
                "warnings", warnings
        ));
    }
}
