package com.stealthsync.config;

import lombok.extern.slf4j.Slf4j;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Arrays;

@Slf4j
public final class DesktopLaunchSupport {

    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(2);
    private static final String APPLICATION_MARKER = "<title>encryption-app</title>";

    private DesktopLaunchSupport() {
    }

    public static boolean openExistingDesktopApp() {
        if (!hasDesktopProfile(System.getProperty("spring.profiles.active", ""))) {
            return false;
        }

        URI applicationUri = applicationUri(System.getProperty("server.port", "8080"));
        if (!isStealthSyncRunning(applicationUri)) {
            return false;
        }

        log.info("StealthSync is already running. Opening {}.", applicationUri);
        SystemBrowserLauncher.open(applicationUri);
        return true;
    }

    static boolean hasDesktopProfile(String activeProfiles) {
        return Arrays.stream(activeProfiles.split(","))
                .map(String::trim)
                .anyMatch("desktop"::equalsIgnoreCase);
    }

    static URI applicationUri(String serverPort) {
        return URI.create("http://localhost:" + Integer.parseInt(serverPort));
    }

    private static boolean isStealthSyncRunning(URI applicationUri) {
        try {
            HttpClient client = HttpClient.newBuilder()
                    .connectTimeout(REQUEST_TIMEOUT)
                    .build();
            HttpRequest request = HttpRequest.newBuilder(applicationUri)
                    .timeout(REQUEST_TIMEOUT)
                    .GET()
                    .build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            return response.statusCode() == 200 && response.body().contains(APPLICATION_MARKER);
        } catch (Exception exception) {
            return false;
        }
    }
}
