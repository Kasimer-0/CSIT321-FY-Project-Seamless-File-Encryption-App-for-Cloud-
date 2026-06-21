package com.stealthsync.config;

import lombok.extern.slf4j.Slf4j;

import java.awt.Desktop;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Slf4j
/** Opens external authorization pages with OS-specific fallbacks when Desktop.browse is unavailable. */
public final class SystemBrowserLauncher {

    private SystemBrowserLauncher() {
    }

    public static boolean open(URI uri) {
        String osName = System.getProperty("os.name", "");

        if (isWindows(osName)) {
            // Launch Chrome directly when it is installed. Passing the URI as a
            // ProcessBuilder argument preserves OAuth query separators such as
            // '&'; cmd.exe `start` otherwise interprets them as shell operators
            // and can truncate the authorization request.
            if (openWithGoogleChrome(uri)) {
                return true;
            }

            if (openWithNativeCommand(osName, uri)) {
                return true;
            }
        }

        try {
            if (Desktop.isDesktopSupported() && Desktop.getDesktop().isSupported(Desktop.Action.BROWSE)) {
                Desktop.getDesktop().browse(uri);
                return true;
            }
        } catch (Exception exception) {
            log.debug("The Java Desktop API could not open {}.", uri, exception);
        }

        return !isWindows(osName) && openWithNativeCommand(osName, uri);
    }

    static List<String> nativeCommand(String osName, URI uri) {
        String normalizedOsName = osName.toLowerCase(Locale.ROOT);
        if (normalizedOsName.contains("win")) {
            return List.of("cmd.exe", "/c", "start", "", uri.toString());
        }
        if (normalizedOsName.contains("mac")) {
            return List.of("open", uri.toString());
        }
        return List.of("xdg-open", uri.toString());
    }

    private static boolean openWithNativeCommand(String osName, URI uri) {
        try {
            new ProcessBuilder(nativeCommand(osName, uri)).start();
            return true;
        } catch (Exception exception) {
            log.warn("The operating system could not open {}.", uri, exception);
            return false;
        }
    }

    /**
     * Opens OAuth links without passing them through cmd.exe. OAuth URLs contain
     * ampersands that the Windows shell treats as command separators, which can
     * remove required authorization parameters.
     */
    private static boolean openWithGoogleChrome(URI uri) {
        for (Path chromePath : googleChromeCandidates()) {
            if (!Files.isRegularFile(chromePath)) {
                continue;
            }
            try {
                new ProcessBuilder(chromePath.toString(), "--incognito", uri.toString()).start();
                return true;
            } catch (Exception exception) {
                log.debug("Google Chrome at {} could not open {}.", chromePath, uri, exception);
            }
        }
        return false;
    }

    /** Returns the standard machine-wide and per-user Chrome install locations. */
    static List<Path> googleChromeCandidates() {
        List<Path> candidates = new ArrayList<>();
        addChromeCandidate(candidates, System.getenv("PROGRAMFILES"));
        addChromeCandidate(candidates, System.getenv("PROGRAMFILES(X86)"));

        String localAppData = System.getenv("LOCALAPPDATA");
        if (localAppData != null && !localAppData.isBlank()) {
            candidates.add(Path.of(localAppData, "Google", "Chrome", "Application", "chrome.exe"));
        }
        return candidates;
    }

    private static void addChromeCandidate(List<Path> candidates, String programFiles) {
        if (programFiles != null && !programFiles.isBlank()) {
            candidates.add(Path.of(programFiles, "Google", "Chrome", "Application", "chrome.exe"));
        }
    }

    private static boolean isWindows(String osName) {
        return osName.toLowerCase(Locale.ROOT).contains("win");
    }
}
