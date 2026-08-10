package com.stealthsync.desktop;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.concurrent.CompletableFuture;
import java.util.regex.Pattern;

/** Fetches the Vite entry bundle only from the configured StealthSync origin. */
final class HostedEntryLoader {

    private static final Pattern ENTRY_SCRIPT = Pattern.compile(
            "<script[^>]+src=[\\\"']([^\\\"']+\\.js(?:\\?[^\\\"']*)?)[\\\"']",
            Pattern.CASE_INSENSITIVE);
    private static final int MAX_SCRIPT_CHARACTERS = 2_000_000;

    private final URI serviceUri;
    private final HttpClient httpClient;

    HostedEntryLoader(URI serviceUri) {
        this.serviceUri = serviceUri;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(12))
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
    }

    CompletableFuture<String> loadScript() {
        return send(serviceUri).thenCompose(html -> {
            URI entryUri = resolveEntryUri(serviceUri, html);
            return send(entryUri).thenApply(script -> {
                if (script.length() > MAX_SCRIPT_CHARACTERS) {
                    throw new IllegalStateException("The hosted desktop entry exceeded the allowed size.");
                }
                return script + "\n//# sourceURL=" + entryUri;
            });
        });
    }

    static URI resolveEntryUri(URI serviceUri, String html) {
        var matcher = ENTRY_SCRIPT.matcher(html == null ? "" : html);
        if (!matcher.find()) {
            throw new IllegalStateException("The hosted page did not declare a JavaScript entry bundle.");
        }
        URI entryUri = serviceUri.resolve(matcher.group(1));
        if (!"https".equalsIgnoreCase(entryUri.getScheme())
                || entryUri.getUserInfo() != null
                || !sameOrigin(serviceUri, entryUri)
                || entryUri.getPath() == null
                || !entryUri.getPath().startsWith("/assets/")) {
            throw new IllegalStateException("The hosted JavaScript entry was outside the trusted origin.");
        }
        return entryUri;
    }

    private CompletableFuture<String> send(URI uri) {
        HttpRequest request = HttpRequest.newBuilder(uri)
                .timeout(Duration.ofSeconds(20))
                .header("X-Tunnel-Skip-AntiPhishing-Page", "true")
                .header("Accept", "text/html,application/javascript,text/javascript")
                .GET()
                .build();
        return httpClient.sendAsync(request, HttpResponse.BodyHandlers.ofString())
                .thenApply(response -> {
                    if (response.statusCode() < 200 || response.statusCode() >= 300) {
                        throw new IllegalStateException("Hosted resource returned HTTP " + response.statusCode() + ".");
                    }
                    return response.body();
                });
    }

    private static boolean sameOrigin(URI left, URI right) {
        return left.getScheme().equalsIgnoreCase(right.getScheme())
                && left.getHost().equalsIgnoreCase(right.getHost())
                && effectivePort(left) == effectivePort(right);
    }

    private static int effectivePort(URI uri) {
        return uri.getPort() == -1 ? 443 : uri.getPort();
    }
}
