package com.stealthsync.config;

import javafx.application.Platform;
import javafx.concurrent.Worker;
import javafx.scene.Scene;
import javafx.scene.web.WebEngine;
import javafx.scene.web.WebView;
import javafx.stage.Stage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Profile;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

@Component
@Profile("desktop")
@RequiredArgsConstructor
@Slf4j
public class DesktopWindowLauncher {

    private static final AtomicBoolean TOOLKIT_STARTED = new AtomicBoolean();
    private static final AtomicBoolean SHUTTING_DOWN = new AtomicBoolean();
    private static final AtomicReference<Stage> PRIMARY_STAGE = new AtomicReference<>();

    private final ConfigurableApplicationContext applicationContext;

    @Value("${server.port:8080}")
    private int serverPort;

    @EventListener(ApplicationReadyEvent.class)
    public void openDesktopWindow() {
        Runnable createWindow = () -> createAndShowWindow("http://127.0.0.1:" + serverPort);
        if (TOOLKIT_STARTED.compareAndSet(false, true)) {
            Platform.startup(createWindow);
        } else {
            Platform.runLater(createWindow);
        }
    }

    public static boolean focusPrimaryWindow() {
        Stage stage = PRIMARY_STAGE.get();
        if (stage == null) {
            return false;
        }
        Platform.runLater(() -> {
            if (stage.isIconified()) {
                stage.setIconified(false);
            }
            stage.show();
            stage.toFront();
            stage.requestFocus();
        });
        return true;
    }

    private void createAndShowWindow(String applicationUrl) {
        Platform.setImplicitExit(false);

        WebView webView = new WebView();
        WebEngine webEngine = webView.getEngine();
        webEngine.setJavaScriptEnabled(true);
        webEngine.setCreatePopupHandler(configuration -> webEngine);

        Stage stage = new Stage();
        PRIMARY_STAGE.set(stage);
        stage.setTitle("StealthSync - Loading");
        stage.setMinWidth(960);
        stage.setMinHeight(640);
        stage.setScene(new Scene(webView, 1280, 800));
        stage.setOnCloseRequest(event -> shutdownApplication());

        webEngine.getLoadWorker().stateProperty().addListener((observable, previous, current) -> {
            if (current == Worker.State.FAILED) {
                stage.setTitle("StealthSync - Load Error");
                log.error("Desktop window failed to load {}.", applicationUrl,
                        webEngine.getLoadWorker().getException());
            } else if (current == Worker.State.SUCCEEDED) {
                stage.setTitle("StealthSync");
            }
        });

        stage.show();

        webEngine.load(applicationUrl);
        log.info("StealthSync desktop window opened at {}.", applicationUrl);
    }

    private void shutdownApplication() {
        if (!SHUTTING_DOWN.compareAndSet(false, true)) {
            return;
        }
        PRIMARY_STAGE.set(null);
        Thread shutdownThread = new Thread(() -> {
            try {
                applicationContext.close();
            } finally {
                Platform.exit();
                System.exit(0);
            }
        }, "stealthsync-desktop-shutdown");
        shutdownThread.setDaemon(false);
        shutdownThread.start();
    }
}
