package com.stealthsync.desktop;

import javafx.application.Application;
import javafx.application.Platform;
import javafx.animation.PauseTransition;
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
import javafx.util.Duration;
import netscape.javascript.JSObject;

/** Native window that hosts the validated shared StealthSync web application. */
public final class DesktopClientApplication extends Application {

    private static SingleInstanceCoordinator coordinator;
    private final WebAppConfiguration configuration = WebAppConfiguration.load();
    private final ExternalBrowser externalBrowser = new ExternalBrowser();
    private final ExternalUrlPolicy externalUrlPolicy = new ExternalUrlPolicy();
    private final HostedEntryLoader hostedEntryLoader = new HostedEntryLoader(configuration.serviceUri());

    private WebView webView;
    private VBox loadingPane;
    private VBox offlinePane;
    private Label offlineDetail;
    private PauseTransition connectionTimeout;
    private PauseTransition renderCheck;
    private boolean entryFallbackAttempted;
    private boolean antiPhishingContinueAttempted;

    static void setCoordinator(SingleInstanceCoordinator value) {
        coordinator = value;
    }

    @Override
    public void start(Stage stage) {
        webView = new WebView();
        webView.setContextMenuEnabled(false);
        WebEngine engine = webView.getEngine();
        engine.setJavaScriptEnabled(true);
        DesktopDiagnostics.install();
        configureDiagnostics(engine);
        configureTimeouts(engine);

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
            entryFallbackAttempted = false;
            if (current == null || current.isBlank() || configuration.isTrustedApplicationUrl(current)) return;
            Platform.runLater(() -> {
                engine.getLoadWorker().cancel();
                if (externalUrlPolicy.isAllowed(current)) externalBrowser.open(java.net.URI.create(current));
                engine.load(configuration.serviceUri().toString());
            });
        });
        engine.getLoadWorker().stateProperty().addListener((observable, previous, current) -> {
            DesktopDiagnostics.log("Page state: " + current);
            if (current == Worker.State.RUNNING) {
                showLoading();
                renderCheck.stop();
                connectionTimeout.playFromStart();
            } else if (current == Worker.State.SUCCEEDED) {
                connectionTimeout.stop();
                if (!configuration.isTrustedApplicationUrl(engine.getLocation())) {
                    showOffline("The application redirected to an untrusted address.");
                    return;
                }
                if (continueTrustedDevTunnelInterstitial(engine)) {
                    showLoading();
                    return;
                }
                try {
                    JSObject window = (JSObject) engine.executeScript("window");
                    window.setMember("stealthSyncDesktop", bridge);
                    engine.executeScript("window.dispatchEvent(new Event('stealthsync:desktop-ready'))");
                    showWebApp();
                    renderCheck.playFromStart();
                } catch (Exception exception) {
                    DesktopDiagnostics.log("Desktop bridge initialization failed: " + exception.getMessage());
                    showOffline("The secure desktop bridge could not be initialized.");
                }
            } else if (current == Worker.State.FAILED || current == Worker.State.CANCELLED) {
                connectionTimeout.stop();
                renderCheck.stop();
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

    private void configureDiagnostics(WebEngine engine) {
        engine.setOnError(event -> DesktopDiagnostics.log(
                "Web engine error: " + event.getMessage() + " (" + event.getException() + ")"));
        engine.getLoadWorker().exceptionProperty().addListener((observable, previous, current) -> {
            if (current != null) {
                DesktopDiagnostics.log("Page load exception: " + current);
            }
        });
        engine.locationProperty().addListener((observable, previous, current) ->
                DesktopDiagnostics.log("Navigation: " + current));
    }

    private void configureTimeouts(WebEngine engine) {
        connectionTimeout = new PauseTransition(Duration.seconds(20));
        connectionTimeout.setOnFinished(event -> {
            DesktopDiagnostics.log("Connection timed out while loading " + configuration.serviceUri().getHost());
            engine.getLoadWorker().cancel();
            showOffline("The shared service did not respond within 20 seconds.");
        });

        renderCheck = new PauseTransition(Duration.seconds(5));
        renderCheck.setOnFinished(event -> {
            try {
                int childCount = renderedRootChildCount(engine);
                if (childCount < 1) {
                    DesktopDiagnostics.log("Render structure: " + renderStructure(engine));
                    executeTrustedEntryFallback(engine);
                }
            } catch (Exception exception) {
                DesktopDiagnostics.log("Render check failed: " + exception.getMessage());
                showOffline("The service responded, but its interface could not be verified.");
            }
        });
    }

    private int renderedRootChildCount(WebEngine engine) {
        Object result = engine.executeScript(
                "(function(){var root=document.getElementById('root');return root ? root.childElementCount : -1;})()"
        );
        return result instanceof Number number ? number.intValue() : -1;
    }

    private boolean continueTrustedDevTunnelInterstitial(WebEngine engine) {
        if (antiPhishingContinueAttempted
                || !configuration.serviceUri().getHost().endsWith(".devtunnels.ms")) {
            return false;
        }
        Object isInterstitial = engine.executeScript(
                "Boolean(!document.getElementById('root') && " +
                        "document.getElementById('continue') && " +
                        "typeof window.setCookie === 'function')"
        );
        if (!Boolean.TRUE.equals(isInterstitial)) {
            return false;
        }
        antiPhishingContinueAttempted = true;
        DesktopDiagnostics.log("Accepted the trusted Microsoft Dev Tunnel interstitial.");
        engine.executeScript("document.getElementById('continue').click()");
        return true;
    }

    private String renderStructure(WebEngine engine) {
        Object result = engine.executeScript(
                "(function(){return ['title='+document.title," +
                        "'ready='+document.readyState," +
                        "'html='+(document.documentElement ? 1 : 0)," +
                        "'bodyChildren='+(document.body ? document.body.childElementCount : -1)," +
                        "'root='+(document.getElementById('root') ? 1 : 0)," +
                        "'tags='+(document.body ? Array.prototype.map.call(document.body.children,function(e){return e.tagName+'#'+e.id;}).join('|') : '')].join(',');})()"
        );
        return String.valueOf(result);
    }

    private void executeTrustedEntryFallback(WebEngine engine) {
        if (!configuration.isTrustedApplicationUrl(engine.getLocation())) {
            showOffline("The page attempted to load code from an untrusted address.");
            return;
        }
        if (entryFallbackAttempted) return;
        entryFallbackAttempted = true;
        DesktopDiagnostics.log("Loading the trusted JavaScript entry through the desktop compatibility path.");
        hostedEntryLoader.loadScript().whenComplete((script, error) -> Platform.runLater(() -> {
            if (error != null) {
                DesktopDiagnostics.log("Trusted entry download failed: " + error.getMessage());
                showOffline("The shared service loaded, but its desktop interface could not be downloaded.");
                return;
            }
            try {
                engine.executeScript(script);
                DesktopDiagnostics.log("Trusted desktop entry executed.");
                scheduleFallbackRenderCheck(engine);
            } catch (Exception exception) {
                DesktopDiagnostics.log("Trusted entry execution failed: " + exception.getMessage());
                showOffline("The shared interface is not compatible with this desktop runtime.");
            }
        }));
    }

    private void scheduleFallbackRenderCheck(WebEngine engine) {
        PauseTransition fallbackCheck = new PauseTransition(Duration.seconds(2));
        fallbackCheck.setOnFinished(event -> {
            try {
                if (renderedRootChildCount(engine) < 1) {
                    DesktopDiagnostics.log("The page loaded but the React root remained empty.");
                    showOffline("The service responded, but its interface could not be rendered in the desktop window.");
                } else {
                    showWebApp();
                }
            } catch (Exception exception) {
                DesktopDiagnostics.log("Fallback render check failed: " + exception.getMessage());
                showOffline("The service responded, but its interface could not be verified.");
            }
        });
        fallbackCheck.play();
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
        if (connectionTimeout != null) connectionTimeout.stop();
        if (renderCheck != null) renderCheck.stop();
        if (coordinator != null) coordinator.close();
        Platform.exit();
    }
}
