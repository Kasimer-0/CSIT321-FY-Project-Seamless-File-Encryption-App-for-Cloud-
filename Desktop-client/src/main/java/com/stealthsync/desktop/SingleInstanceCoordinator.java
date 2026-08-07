package com.stealthsync.desktop;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicBoolean;

/** Uses a loopback-only control socket to focus the existing client instead of opening duplicates. */
public final class SingleInstanceCoordinator implements AutoCloseable {

    static final int DEFAULT_CONTROL_PORT = 43871;
    private final int port;
    private final AtomicBoolean running = new AtomicBoolean();
    private volatile Runnable focusAction = () -> { };
    private ServerSocket serverSocket;

    public SingleInstanceCoordinator() {
        this(DEFAULT_CONTROL_PORT);
    }

    SingleInstanceCoordinator(int port) {
        this.port = port;
    }

    public boolean acquire() {
        try {
            serverSocket = new ServerSocket();
            serverSocket.bind(new InetSocketAddress(InetAddress.getLoopbackAddress(), port), 1);
            running.set(true);
            Thread listener = new Thread(this::listen, "stealthsync-single-instance");
            listener.setDaemon(true);
            listener.start();
            return true;
        } catch (Exception exception) {
            signalExistingInstance();
            return false;
        }
    }

    public void onFocusRequested(Runnable action) {
        focusAction = action == null ? () -> { } : action;
    }

    private void listen() {
        while (running.get()) {
            try (Socket socket = serverSocket.accept();
                 BufferedReader reader = new BufferedReader(new InputStreamReader(
                         socket.getInputStream(), StandardCharsets.UTF_8))) {
                if ("FOCUS".equals(reader.readLine())) {
                    focusAction.run();
                }
            } catch (Exception exception) {
                if (running.get()) {
                    Thread.yield();
                }
            }
        }
    }

    private void signalExistingInstance() {
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(InetAddress.getLoopbackAddress(), port), 800);
            try (PrintWriter writer = new PrintWriter(socket.getOutputStream(), true, StandardCharsets.UTF_8)) {
                writer.println("FOCUS");
            }
        } catch (Exception ignored) {
            // A conflicting local process still prevents duplicate StealthSync windows.
        }
    }

    @Override
    public void close() {
        running.set(false);
        try {
            if (serverSocket != null) serverSocket.close();
        } catch (Exception ignored) {
        }
    }
}
