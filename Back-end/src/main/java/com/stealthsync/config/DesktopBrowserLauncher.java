package com.stealthsync.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.net.URI;

@Component
@Slf4j
public class DesktopBrowserLauncher {

    @Value("${stealthsync.open-browser:false}")
    private boolean openBrowser;

    @Value("${server.port:8080}")
    private int serverPort;

    @EventListener(ApplicationReadyEvent.class)
    public void openBrowserWhenDesktopAppStarts() {
        if (!openBrowser) {
            return;
        }
        URI applicationUri = URI.create("http://localhost:" + serverPort);
        if (!SystemBrowserLauncher.open(applicationUri)) {
            log.warn("Unable to open the default browser automatically. Open {} manually.", applicationUri);
        }
    }
}
