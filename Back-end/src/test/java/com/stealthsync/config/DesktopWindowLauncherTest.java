package com.stealthsync.config;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class DesktopWindowLauncherTest {

    @Test
    void usesSameHostnameAsPackagedFrontendApiRequests() {
        assertEquals("http://localhost:8080", DesktopWindowLauncher.applicationUrl(8080));
    }
}
