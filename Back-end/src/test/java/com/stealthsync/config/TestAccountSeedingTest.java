package com.stealthsync.config;

import com.stealthsync.model.entity.UserAccount;
import com.stealthsync.repository.UserAccountRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:seed-test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "stealthsync.vault.directory=target/test-vault"
})
@Transactional
class TestAccountSeedingTest {

    @Autowired
    private UserAccountRepository userAccountRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void createsAdminAndNormalCustomerCredentials() {
        UserAccount admin = userAccountRepository.findByUsernameIgnoreCase("admin").orElseThrow();
        assertEquals("admin", admin.getRole());
        assertFalse(admin.isSuspended());
        assertTrue(passwordEncoder.matches("Admin@123", admin.getPasswordHash()));

        UserAccount customer = userAccountRepository.findByUsernameIgnoreCase("testuser").orElseThrow();
        assertEquals("customer", customer.getRole());
        assertFalse(customer.isSubscribed());
        assertFalse(customer.isSuspended());
        assertTrue(passwordEncoder.matches("User@123", customer.getPasswordHash()));
    }
}
