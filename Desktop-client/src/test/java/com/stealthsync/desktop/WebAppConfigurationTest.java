package com.stealthsync.desktop;

import org.junit.jupiter.api.Test;

import java.net.URI;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class WebAppConfigurationTest {

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
}
