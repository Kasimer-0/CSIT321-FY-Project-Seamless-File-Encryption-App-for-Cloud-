package com.stealthsync.desktop;

import javafx.application.Application;
import javafx.application.Platform;
import javafx.concurrent.Worker;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.ProgressIndicator;
import javafx.scene.layout.StackPane;
import javafx.scene.layout.VBox;
import javafx.scene.web.WebEngine;
import javafx.scene.web.WebView;
import javafx.stage.Stage;
import netscape.javascript.JSObject;

/** Native window that hosts the validated shared StealthSync web application. */
public final class DesktopClientApplication extends Application {

    private static SingleInstanceCoordinator coordinator;
    private final WebAppConfiguration configuration = WebAppConfiguration.load();
    private final ExternalBrowser externalBrowser = new ExternalBrowser();
    private final ExternalUrlPolicy externalUrlPolicy = new ExternalUrlPolicy();

    private WebView webView;
    private VBox loadingPane;
    private VBox offlinePane;
    private Label offlineDetail;

    static void setCoordinator(SingleInstanceCoordinator value) {
        coordinator = value;
    }

    @Override
    public void start(Stage stage) {
        webView = new WebView();
        webView.setContextMenuEnabled(false);
        WebEngine engine = webView.getEngine();
        engine.setJavaScriptEnabled(true);

        loadingPane = loadingPane();
        offlinePane = offlinePane(engine);
        StackPane root = new StackPane(webView, loadingPane, offlinePane);
        root.setStyle("-fx-background-color: #090a0c;");

        Scene scene = new Scene(root, 1280, 800);
        scene.getStylesheets().add(getClass().getResource("/desktop.css").toExternalForm());
        stage.setScene(scene);
        stage.setTitle("StealthSync");
        stage.setMinWidth(960);
        stage.setMinHeight(640);
        stage.getIcons().add(BrandIcon.create(64));
        stage.setOnCloseRequest(event -> shutdown());

        DesktopBridge bridge = new DesktopBridge(stage, externalBrowser, externalUrlPolicy);
        engine.locationProperty().addListener((observable, previous, current) -> {
            if (current == null || current.isBlank() || configuration.isTrustedApplicationUrl(current)) return;
            Platform.runLater(() -> {
                engine.getLoadWorker().cancel();
                if (externalUrlPolicy.isAllowed(current)) externalBrowser.open(java.net.URI.create(current));
                engine.load(configuration.serviceUri().toString());
            });
        });
        engine.getLoadWorker().stateProperty().addListener((observable, previous, current) -> {
            if (current == Worker.State.RUNNING) {
                showLoading();
            } else if (current == Worker.State.SUCCEEDED) {
                if (!configuration.isTrustedApplicationUrl(engine.getLocation())) {
                    showOffline("The application redirected to an untrusted address.");
                    return;
                }
                try {
                    JSObject window = (JSObject) engine.executeScript("window");
                    window.setMember("stealthSyncDesktop", bridge);
                    engine.executeScript("window.dispatchEvent(new Event('stealthsync:desktop-ready'))");
                    showWebApp();
                } catch (Exception exception) {
                    showOffline("The secure desktop bridge could not be initialized.");
                }
            } else if (current == Worker.State.FAILED || current == Worker.State.CANCELLED) {
                if (configuration.isTrustedApplicationUrl(engine.getLocation())) {
                    showOffline("The shared StealthSync service is currently unavailable.");
                }
            }
        });

        if (coordinator != null) {
            coordinator.onFocusRequested(() -> Platform.runLater(() -> {
                if (stage.isIconified()) stage.setIconified(false);
                stage.show();
                stage.toFront();
                stage.requestFocus();
            }));
        }

        stage.show();
        showLoading();
        engine.load(configuration.serviceUri().toString());
    }

    private VBox loadingPane() {
        ProgressIndicator progress = new ProgressIndicator();
        progress.setMaxSize(42, 42);
        Label label = new Label("Connecting to StealthSync...");
        label.getStyleClass().add("status-text");
        VBox pane = new VBox(16, progress, label);
        pane.setAlignment(Pos.CENTER);
        pane.getStyleClass().add("status-pane");
        return pane;
    }

    private VBox offlinePane(WebEngine engine) {
        Label brand = new Label("STEALTHSYNC");
        brand.getStyleClass().add("brand-title");
        Label heading = new Label("Unable to reach the shared service");
        heading.getStyleClass().add("offline-title");
        offlineDetail = new Label();
        offlineDetail.setWrapText(true);
        offlineDetail.getStyleClass().add("status-text");
        Button retry = new Button("Retry");
        retry.getStyleClass().add("primary-button");
        retry.setOnAction(event -> engine.load(configuration.serviceUri().toString()));
        Button openWeb = new Button("Open Web App");
        openWeb.getStyleClass().add("secondary-button");
        openWeb.setOnAction(event -> externalBrowser.open(configuration.serviceUri()));
        VBox pane = new VBox(14, brand, heading, offlineDetail, retry, openWeb);
        pane.setAlignment(Pos.CENTER);
        pane.setPadding(new Insets(48));
        pane.setMaxWidth(560);
        pane.getStyleClass().add("offline-pane");
        return pane;
    }

    private void showLoading() {
        webView.setVisible(false);
        loadingPane.setVisible(true);
        offlinePane.setVisible(false);
    }

    private void showWebApp() {
        webView.setVisible(true);
        loadingPane.setVisible(false);
        offlinePane.setVisible(false);
    }

    private void showOffline(String detail) {
        offlineDetail.setText(detail + " Check your internet connection, then try again.");
        webView.setVisible(false);
        loadingPane.setVisible(false);
        offlinePane.setVisible(true);
    }

    private void shutdown() {
        if (coordinator != null) coordinator.close();
        Platform.exit();
    }
}
