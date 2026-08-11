package com.stealthsync.desktop;

import java.io.IOException;
import java.io.Reader;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.Map;
import java.util.Properties;

/** Resolves and validates the one hosted StealthSync origin trusted by the desktop shell. */
public final class WebAppConfiguration {

    private static final String URL_PROPERTY = "stealthsync.desktop.url";
    private static final String URL_ENVIRONMENT = "STEALTHSYNC_DESKTOP_URL";
    private static final String CONFIG_ENVIRONMENT = "STEALTHSYNC_DESKTOP_CONFIG";
    private static final String CONFIG_PROPERTY = "service.url";

    private final URI serviceUri;

    public WebAppConfiguration(URI serviceUri) {
        this.serviceUri = validate(serviceUri);
    }

    public static WebAppConfiguration load() {
        return load(System.getenv(), System.getProperties(), defaultConfigPath(System.getenv(), System.getProperties()));
    }

    static WebAppConfiguration load(Map<String, String> environment, Properties systemProperties, Path configPath) {
        String configured = environment.get(URL_ENVIRONMENT);
        if (configured == null || configured.isBlank()) {
            configured = readConfig(configPath);
        }
        if (configured == null || configured.isBlank()) {
            configured = systemProperties.getProperty(URL_PROPERTY);
        }
        if (configured == null || configured.isBlank()) {
            throw new IllegalStateException(
                    "No StealthSync service URL is configured. Set service.url in " + configPath
            );
        }
        return new WebAppConfiguration(URI.create(configured.trim()));
    }

    static Path defaultConfigPath(Map<String, String> environment, Properties systemProperties) {
        String explicit = environment.get(CONFIG_ENVIRONMENT);
        if (explicit != null && !explicit.isBlank()) {
            return Path.of(explicit.trim());
        }
        String localAppData = environment.get("LOCALAPPDATA");
        if (localAppData != null && !localAppData.isBlank()) {
            return Path.of(localAppData, "StealthSync", "desktop.properties");
        }
        return Path.of(systemProperties.getProperty("user.home"), ".stealthsync", "desktop.properties");
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

    private static String readConfig(Path configPath) {
        if (configPath == null || !Files.isRegularFile(configPath)) {
            return null;
        }
        Properties properties = new Properties();
        try (Reader reader = Files.newBufferedReader(configPath, StandardCharsets.UTF_8)) {
            properties.load(reader);
            return properties.getProperty(CONFIG_PROPERTY);
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to read desktop configuration: " + configPath, exception);
        }
    }

    private static int effectivePort(URI uri) {
        if (uri.getPort() >= 0) return uri.getPort();
        return "https".equalsIgnoreCase(uri.getScheme()) ? 443 : 80;
    }
}
