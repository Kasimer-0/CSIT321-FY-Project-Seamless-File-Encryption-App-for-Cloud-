package com.stealthsync.desktop;

import javafx.scene.image.Image;
import javafx.scene.image.WritableImage;
import javafx.scene.paint.Color;

/**
 * Generates the compact S// mark used by the StealthSync marketing site.
 * The geometry stays legible in a 16 px Windows title bar without depending on
 * an installed font, while supersampling keeps larger taskbar icons smooth.
 */
final class BrandIcon {

    private static final int SAMPLES_PER_AXIS = 4;
    private static final Color ACCENT = Color.web("#06B6D4");
    private static final Color INK = Color.web("#050505");

    private BrandIcon() {
    }

    static Image create(int size) {
        if (size < 1) {
            throw new IllegalArgumentException("Icon size must be positive.");
        }
        WritableImage image = new WritableImage(size, size);
        var pixels = image.getPixelWriter();
        for (int y = 0; y < size; y++) {
            for (int x = 0; x < size; x++) {
                pixels.setColor(x, y, samplePixel(x, y, size));
            }
        }
        return image;
    }

    private static Color samplePixel(int pixelX, int pixelY, int size) {
        int tileSamples = 0;
        int markSamples = 0;
        int totalSamples = SAMPLES_PER_AXIS * SAMPLES_PER_AXIS;
        for (int sampleY = 0; sampleY < SAMPLES_PER_AXIS; sampleY++) {
            for (int sampleX = 0; sampleX < SAMPLES_PER_AXIS; sampleX++) {
                double x = (pixelX + (sampleX + 0.5) / SAMPLES_PER_AXIS) / size;
                double y = (pixelY + (sampleY + 0.5) / SAMPLES_PER_AXIS) / size;
                if (insideRoundedTile(x, y)) {
                    tileSamples++;
                    if (insideMark(x, y)) {
                        markSamples++;
                    }
                }
            }
        }
        if (tileSamples == 0) {
            return Color.TRANSPARENT;
        }

        double markCoverage = markSamples / (double) tileSamples;
        double alpha = tileSamples / (double) totalSamples;
        return new Color(
                mix(ACCENT.getRed(), INK.getRed(), markCoverage),
                mix(ACCENT.getGreen(), INK.getGreen(), markCoverage),
                mix(ACCENT.getBlue(), INK.getBlue(), markCoverage),
                alpha);
    }

    private static boolean insideRoundedTile(double x, double y) {
        double left = 0.04;
        double top = 0.04;
        double right = 0.96;
        double bottom = 0.96;
        double radius = 0.16;
        double nearestX = clamp(x, left + radius, right - radius);
        double nearestY = clamp(y, top + radius, bottom - radius);
        double dx = x - nearestX;
        double dy = y - nearestY;
        return dx * dx + dy * dy <= radius * radius;
    }

    private static boolean insideMark(double x, double y) {
        boolean letterS = insideRect(x, y, 0.20, 0.25, 0.52, 0.34)
                || insideRect(x, y, 0.20, 0.455, 0.52, 0.545)
                || insideRect(x, y, 0.20, 0.66, 0.52, 0.75)
                || insideRect(x, y, 0.20, 0.25, 0.29, 0.545)
                || insideRect(x, y, 0.43, 0.455, 0.52, 0.75);
        return letterS || insideSlash(x, y, 0.57) || insideSlash(x, y, 0.70);
    }

    private static boolean insideSlash(double x, double y, double bottomCenterX) {
        if (y < 0.25 || y > 0.75) {
            return false;
        }
        double centerX = bottomCenterX + (0.75 - y) * 0.18;
        return Math.abs(x - centerX) <= 0.035;
    }

    private static boolean insideRect(double x, double y, double left, double top,
                                      double right, double bottom) {
        return x >= left && x <= right && y >= top && y <= bottom;
    }

    private static double clamp(double value, double minimum, double maximum) {
        return Math.max(minimum, Math.min(value, maximum));
    }

    private static double mix(double from, double to, double amount) {
        return from + (to - from) * amount;
    }
}
