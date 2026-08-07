package com.stealthsync.desktop;

import java.util.Locale;
import java.util.Set;

/** Produces a Windows-safe suggested filename without accepting a caller-supplied path. */
public final class FilenamePolicy {

    private static final Set<String> RESERVED = Set.of(
            "CON", "PRN", "AUX", "NUL",
            "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
            "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9"
    );

    private FilenamePolicy() {
    }

    public static String sanitize(String value) {
        String filename = value == null ? "" : value
                .replaceAll("[\\x00-\\x1f<>:\"/\\\\|?*]", "_")
                .replaceAll("^[. _]+", "")
                .replaceAll("[. ]+$", "")
                .trim();
        if (filename.isBlank() || ".".equals(filename) || "..".equals(filename)) {
            filename = "decrypted-file";
        }
        if (filename.length() > 180) {
            filename = filename.substring(0, 180);
        }
        String baseName = filename.split("\\.", 2)[0].toUpperCase(Locale.ROOT);
        return RESERVED.contains(baseName) ? "_" + filename : filename;
    }
}
