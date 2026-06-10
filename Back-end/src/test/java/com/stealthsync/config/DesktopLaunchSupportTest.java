package com.stealthsync.config;

import org.junit.jupiter.api.Test;

import java.net.URI;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DesktopLaunchSupportTest {

    private static final URI APPLICATION_URI = URI.create("http://localhost:8080");

    @Test
    void detectsDesktopProfileInProfileList() {
        assertTrue(DesktopLaunchSupport.hasDesktopProfile("test, desktop"));
        assertFalse(DesktopLaunchSupport.hasDesktopProfile("test,development"));
    }

    @Test
    void createsApplicationUriFromConfiguredPort() {
        assertEquals(URI.create("http://localhost:18080"), DesktopLaunchSupport.applicationUri("18080"));
    }

    @Test
    void createsNativeBrowserCommandsForSupportedPlatforms() {
        assertEquals(
                List.of("cmd.exe", "/c", "start", "", APPLICATION_URI.toString()),
                SystemBrowserLauncher.nativeCommand("Windows 11", APPLICATION_URI));
        assertEquals(
                List.of("open", APPLICATION_URI.toString()),
                SystemBrowserLauncher.nativeCommand("Mac OS X", APPLICATION_URI));
        assertEquals(
                List.of("xdg-open", APPLICATION_URI.toString()),
                SystemBrowserLauncher.nativeCommand("Linux", APPLICATION_URI));
    }
}
