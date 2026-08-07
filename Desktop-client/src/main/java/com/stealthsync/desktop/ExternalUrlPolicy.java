package com.stealthsync.desktop;

import java.net.URI;
import java.util.Set;

/** Restricts bridge-launched URLs to the official OAuth authorization hosts. */
public final class ExternalUrlPolicy {

    private static final Set<String> OAUTH_HOSTS = Set.of(
            "accounts.google.com",
            "www.dropbox.com",
            "login.microsoftonline.com",
            "login.live.com"
    );

    public boolean isAllowed(String rawUrl) {
        try {
            URI uri = URI.create(rawUrl);
            return "https".equalsIgnoreCase(uri.getScheme())
                    && uri.getUserInfo() == null
                    && uri.getHost() != null
                    && OAUTH_HOSTS.contains(uri.getHost().toLowerCase());
        } catch (Exception exception) {
            return false;
        }
    }
}
