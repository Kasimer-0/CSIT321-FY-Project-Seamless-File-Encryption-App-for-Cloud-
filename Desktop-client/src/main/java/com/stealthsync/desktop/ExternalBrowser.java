package com.stealthsync.desktop;

import java.awt.Desktop;
import java.net.URI;
import java.util.Locale;

/** Opens OAuth and web URLs as direct process arguments so query strings are not shell-parsed. */
public class ExternalBrowser {

    public boolean open(URI uri) {
        try {
            if (Desktop.isDesktopSupported() && Desktop.getDesktop().isSupported(Desktop.Action.BROWSE)) {
                Desktop.getDesktop().browse(uri);
                return true;
            }
        } catch (Exception ignored) {
            // The Windows fallback below works in trimmed jpackage runtimes without Desktop integration.
        }
        try {
            if (System.getProperty("os.name", "").toLowerCase(Locale.ROOT).contains("win")) {
                new ProcessBuilder("rundll32", "url.dll,FileProtocolHandler", uri.toString()).start();
                return true;
            }
        } catch (Exception ignored) {
            // The caller shows a visible failure instead of silently navigating the embedded WebView.
        }
        return false;
    }
}
