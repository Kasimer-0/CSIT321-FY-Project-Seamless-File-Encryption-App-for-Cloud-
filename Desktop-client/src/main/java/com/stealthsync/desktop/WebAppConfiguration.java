package com.stealthsync.desktop;

import java.net.URI;
import java.util.Locale;

/** Resolves and validates the one hosted StealthSync origin trusted by the desktop shell. */
public final class WebAppConfiguration {

    public static final String DEFAULT_SERVICE_URL = "https://tj867zgk-8080.asse.devtunnels.ms";
    private static final String URL_PROPERTY = "stealthsync.desktop.url";
    private static final String URL_ENVIRONMENT = "STEALTHSYNC_DESKTOP_URL";

    private final URI serviceUri;

    public WebAppConfiguration(URI serviceUri) {
        this.serviceUri = validate(serviceUri);
    }

    public static WebAppConfiguration load() {
        // The environment override lets local smoke tests target loopback while packaged builds
        // continue to carry the production URL as their default JVM system property.
        String configured = System.getenv(URL_ENVIRONMENT);
        if (configured == null || configured.isBlank()) {
            configured = System.getProperty(URL_PROPERTY);
        }
        if (configured == null || configured.isBlank()) {
            configured = DEFAULT_SERVICE_URL;
        }
        return new WebAppConfiguration(URI.create(configured.trim()));
    }

    public URI serviceUri() {
        return serviceUri;
    }

    public boolean isTrustedApplicationUrl(String value) {
        try {
            URI candidate = URI.create(value);
            return serviceUri.getScheme().equalsIgnoreCase(candidate.getScheme())
                    && serviceUri.getHost().equalsIgnoreCase(candidate.getHost())
                    && effectivePort(serviceUri) == effectivePort(candidate);
        } catch (Exception exception) {
            return false;
        }
    }

    private static URI validate(URI uri) {
        if (uri == null || uri.getHost() == null || uri.getUserInfo() != null) {
            throw new IllegalArgumentException("The desktop service URL must be an absolute HTTPS URL.");
        }
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
        boolean localTest = "http".equals(scheme)
                && ("localhost".equalsIgnoreCase(uri.getHost()) || "127.0.0.1".equals(uri.getHost()));
        if (!"https".equals(scheme) && !localTest) {
            throw new IllegalArgumentException("The desktop service URL must use HTTPS.");
        }
        return URI.create(uri.getScheme() + "://" + uri.getAuthority());
    }

    private static int effectivePort(URI uri) {
        if (uri.getPort() >= 0) return uri.getPort();
        return "https".equalsIgnoreCase(uri.getScheme()) ? 443 : 80;
    }
}
