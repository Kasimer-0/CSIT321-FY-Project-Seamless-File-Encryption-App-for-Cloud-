package com.stealthsync.desktop;

import javafx.scene.image.Image;
import javafx.scene.image.WritableImage;
import javafx.scene.paint.Color;

/** Generates the black-and-cyan StealthSync mark without shipping an editable image asset. */
final class BrandIcon {

    private BrandIcon() {
    }

    static Image create(int size) {
        WritableImage image = new WritableImage(size, size);
        var pixels = image.getPixelWriter();
        double center = (size - 1) / 2.0;
        double outer = size * 0.46;
        double inner = size * 0.26;
        for (int y = 0; y < size; y++) {
            for (int x = 0; x < size; x++) {
                double distance = Math.hypot(x - center, y - center);
                Color color = distance <= outer ? Color.web("#111318") : Color.TRANSPARENT;
                if (distance <= inner) color = Color.web("#06b6d4");
                pixels.setColor(x, y, color);
            }
        }
        return image;
    }
}
