package com.stealthsync.desktop;

import com.sun.javafx.webkit.WebConsoleListener;
import javafx.scene.web.WebView;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.OffsetDateTime;

/** Writes WebView failures to a local file without exposing tokens or page content. */
final class DesktopDiagnostics {

    private static final Path LOG_FILE = resolveLogFile();

    private DesktopDiagnostics() {
    }

    static void install() {
        WebConsoleListener.setDefaultListener((WebView view, String message, int line, String sourceId) ->
                log("Web console: " + safeSource(sourceId) + ":" + line + " " + message));
    }

    static synchronized void log(String message) {
        try {
            Files.createDirectories(LOG_FILE.getParent());
            Files.writeString(LOG_FILE,
                    "[" + OffsetDateTime.now() + "] " + message + System.lineSeparator(),
                    StandardCharsets.UTF_8,
                    StandardOpenOption.CREATE,
                    StandardOpenOption.APPEND);
        } catch (IOException ignored) {
            // Diagnostics must never prevent the desktop client from opening.
        }
    }

    static Path logFile() {
        return LOG_FILE;
    }

    private static Path resolveLogFile() {
        String localAppData = System.getenv("LOCALAPPDATA");
        Path root = localAppData == null || localAppData.isBlank()
                ? Path.of(System.getProperty("user.home"), ".stealthsync")
                : Path.of(localAppData, "StealthSync");
        return root.resolve("logs").resolve("desktop.log");
    }

    private static String safeSource(String sourceId) {
        if (sourceId == null || sourceId.isBlank()) {
            return "unknown-source";
        }
        try {
            var uri = java.net.URI.create(sourceId);
            return uri.getScheme() + "://" + uri.getHost() + uri.getPath();
        } catch (IllegalArgumentException ignored) {
            return "unknown-source";
        }
    }
}
