package com.stealthsync.desktop;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

class FilenamePolicyTest {

    @Test
    void stripsPathsControlCharactersAndWindowsReservedNames() {
        assertEquals("report_2026.txt", FilenamePolicy.sanitize("../report:2026.txt"));
        assertEquals("_CON.txt", FilenamePolicy.sanitize("CON.txt"));
        assertEquals("decrypted-file", FilenamePolicy.sanitize("  "));
        assertFalse(FilenamePolicy.sanitize("folder\\secret.txt").contains("\\"));
    }
}
