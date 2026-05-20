package com.stealthsync.service.ai;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class PrivacyScannerService {

    public List<String> scanText(String text) {
        List<String> findings = new ArrayList<>();
        if (text == null || text.isBlank()) {
            return findings;
        }
        if (text.matches(".*[\\w.%+-]+@[\\w.-]+\\.[A-Za-z]{2,}.*")) {
            findings.add("Possible email address detected.");
        }
        if (text.matches(".*\\b\\d{8,}\\b.*")) {
            findings.add("Possible long numeric identifier detected.");
        }
        return findings;
    }
}
