package com.stealthsync.controller;

import com.stealthsync.config.DesktopWindowLauncher;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Profile("desktop")
@RequestMapping("/desktop")
/** Desktop-only bridge for opening external URLs and focusing the primary application window. */
public class DesktopController {

    @PostMapping("/focus")
    public ResponseEntity<Void> focusWindow() {
        return DesktopWindowLauncher.focusPrimaryWindow()
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }
}
