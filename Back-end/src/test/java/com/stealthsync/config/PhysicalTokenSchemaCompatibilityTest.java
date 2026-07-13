package com.stealthsync.config;

import com.stealthsync.model.entity.PhysicalTokenRecord;
import jakarta.persistence.Column;
import org.junit.jupiter.api.Test;

import java.io.InputStream;
import java.util.Properties;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PhysicalTokenSchemaCompatibilityTest {

    @Test
    void encryptionKeyAssociationIsNullableAndDevelopmentSchemaUsesUpdate() throws Exception {
        Column column = PhysicalTokenRecord.class
                .getDeclaredField("encryptionKeyID")
                .getAnnotation(Column.class);
        assertNotNull(column);
        assertEquals("encryption_key_id", column.name());
        assertTrue(column.nullable());

        Properties properties = new Properties();
        try (InputStream input = getClass().getClassLoader().getResourceAsStream("application.properties")) {
            assertNotNull(input);
            properties.load(input);
        }
        assertEquals("update", properties.getProperty("spring.jpa.hibernate.ddl-auto"));
    }
}
