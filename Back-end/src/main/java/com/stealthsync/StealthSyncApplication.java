package com.stealthsync;

import com.stealthsync.config.DesktopLaunchSupport;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class StealthSyncApplication {

    public static void main(String[] args) {
        if (DesktopLaunchSupport.openExistingDesktopApp()) {
            return;
        }
        SpringApplication.run(StealthSyncApplication.class, args);
    }
}
