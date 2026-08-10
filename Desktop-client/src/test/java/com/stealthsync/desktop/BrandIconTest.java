package com.stealthsync.desktop;

import javafx.scene.image.Image;
import javafx.scene.paint.Color;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class BrandIconTest {

    @Test
    void rendersWebsiteInspiredMarkWithTransparentCorners() {
        Image icon = BrandIcon.create(64);

        Color corner = icon.getPixelReader().getColor(0, 0);
        Color accentTile = icon.getPixelReader().getColor(32, 8);
        Color letter = icon.getPixelReader().getColor(20, 19);
        Color slash = icon.getPixelReader().getColor(42, 19);

        assertEquals(0.0, corner.getOpacity(), 0.001);
        assertTrue(accentTile.getRed() < 0.10 && accentTile.getGreen() > 0.60
                && accentTile.getBlue() > 0.70);
        assertTrue(letter.getRed() < 0.08 && letter.getGreen() < 0.08);
        assertTrue(slash.getRed() < 0.08 && slash.getGreen() < 0.08);
    }

    @Test
    void rejectsNonPositiveIconSizes() {
        assertThrows(IllegalArgumentException.class, () -> BrandIcon.create(0));
    }
}
