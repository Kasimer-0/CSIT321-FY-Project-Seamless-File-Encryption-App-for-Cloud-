package com.stealthsync.config;

import lombok.extern.slf4j.Slf4j;

import java.awt.Desktop;
import java.net.URI;
import java.util.List;
import java.util.Locale;

@Slf4j
public final class SystemBrowserLauncher {

    private SystemBrowserLauncher() {
    }

    public static boolean open(URI uri) {
        String osName = System.getProperty("os.name", "");

        // The AWT Desktop API can report success without opening a browser in a
        // packaged Windows app, so use the native URL handler first on Windows.
        if (isWindows(osName) && openWithNativeCommand(osName, uri)) {
            return true;
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

    private static boolean isWindows(String osName) {
        return osName.toLowerCase(Locale.ROOT).contains("win");
    }
}
