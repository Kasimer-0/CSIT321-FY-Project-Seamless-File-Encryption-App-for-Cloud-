package com.stealthsync.desktop;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;
import java.util.Properties;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class WebAppConfigurationTest {

    @TempDir
    Path tempDirectory;

    @Test
    void trustsOnlyTheConfiguredOrigin() {
        WebAppConfiguration configuration = new WebAppConfiguration(
                URI.create("https://stealthsync.example/app/path"));
        assertTrue(configuration.isTrustedApplicationUrl("https://stealthsync.example/login"));
        assertFalse(configuration.isTrustedApplicationUrl("https://other.example/login"));
        assertFalse(configuration.isTrustedApplicationUrl("http://stealthsync.example/login"));
    }

    @Test
    void rejectsInsecureRemoteServicesButAllowsLoopbackTests() {
        assertThrows(IllegalArgumentException.class,
                () -> new WebAppConfiguration(URI.create("http://stealthsync.example")));
        assertTrue(new WebAppConfiguration(URI.create("http://127.0.0.1:18080"))
                .isTrustedApplicationUrl("http://127.0.0.1:18080/"));
    }

    @Test
    void editableConfigOverridesThePackagedBuildUrl() throws Exception {
        Path config = tempDirectory.resolve("desktop.properties");
        Files.writeString(config, "service.url=https://production.example\n");
        Properties system = new Properties();
        system.setProperty("stealthsync.desktop.url", "https://old-build.example");

        WebAppConfiguration configuration = WebAppConfiguration.load(Map.of(), system, config);

        assertTrue(configuration.isTrustedApplicationUrl("https://production.example/login"));
        assertFalse(configuration.isTrustedApplicationUrl("https://old-build.example/login"));
    }

    @Test
    void environmentOverrideHasHighestPriority() throws Exception {
        Path config = tempDirectory.resolve("desktop.properties");
        Files.writeString(config, "service.url=https://config.example\n");
        Map<String, String> environment = new HashMap<>();
        environment.put("STEALTHSYNC_DESKTOP_URL", "https://environment.example");

        WebAppConfiguration configuration = WebAppConfiguration.load(environment, new Properties(), config);

        assertTrue(configuration.isTrustedApplicationUrl("https://environment.example/"));
    }

    @Test
    void missingBuildAndConfigUrlFailsClearly() {
        assertThrows(
                IllegalStateException.class,
                () -> WebAppConfiguration.load(Map.of(), new Properties(), tempDirectory.resolve("missing.properties"))
        );
    }
}
