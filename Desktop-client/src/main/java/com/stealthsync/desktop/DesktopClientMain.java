package com.stealthsync.desktop;

import javafx.application.Application;

/** Process entry point used by jpackage. */
public final class DesktopClientMain {

    private DesktopClientMain() {
    }

    public static void main(String[] args) {
        SingleInstanceCoordinator coordinator = new SingleInstanceCoordinator();
        if (!coordinator.acquire()) {
            return;
        }
        DesktopClientApplication.setCoordinator(coordinator);
        try {
            Application.launch(DesktopClientApplication.class, args);
        } finally {
            coordinator.close();
        }
    }
}
