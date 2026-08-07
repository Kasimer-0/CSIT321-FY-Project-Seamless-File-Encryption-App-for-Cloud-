package com.stealthsync.desktop;

import javafx.stage.FileChooser;
import javafx.stage.Window;

import java.io.File;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.StandardOpenOption;
import java.util.Base64;

/** Narrow JavaScript bridge for OAuth handoff and user-approved decrypted-file saves. */
public final class DesktopBridge {

    private static final int MAX_BASE64_CHARACTERS = 720_000_000;

    private final Window owner;
    private final ExternalBrowser browser;
    private final ExternalUrlPolicy externalUrlPolicy;

    public DesktopBridge(Window owner, ExternalBrowser browser, ExternalUrlPolicy externalUrlPolicy) {
        this.owner = owner;
        this.browser = browser;
        this.externalUrlPolicy = externalUrlPolicy;
    }

    public boolean openExternal(String rawUrl) {
        if (!externalUrlPolicy.isAllowed(rawUrl)) {
            return false;
        }
        return browser.open(URI.create(rawUrl));
    }

    public boolean saveBase64File(String requestedFilename, String base64Data) {
        if (base64Data == null || base64Data.length() > MAX_BASE64_CHARACTERS) {
            return false;
        }
        try {
            byte[] bytes = Base64.getDecoder().decode(base64Data);
            FileChooser chooser = new FileChooser();
            chooser.setTitle("Save decrypted file");
            chooser.setInitialFileName(FilenamePolicy.sanitize(requestedFilename));
            chooser.getExtensionFilters().add(new FileChooser.ExtensionFilter("All files", "*.*"));
            File selected = chooser.showSaveDialog(owner);
            if (selected == null) {
                return false;
            }
            Files.write(selected.toPath(), bytes,
                    StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING, StandardOpenOption.WRITE);
            return true;
        } catch (Exception exception) {
            return false;
        }
    }
}
