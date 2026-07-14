package com.stealthsync.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:static-frontend-test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "stealthsync.vault.directory=target/static-frontend-test-vault",
        "stealthsync.jwt.secret=static-frontend-test-signing-secret"
})
class StaticFrontendSmokeTest {

    private static final Pattern SCRIPT_PATH = Pattern.compile("src=\"(/assets/index-[^\"]+\\.js)\"");
    private static final Pattern STYLE_PATH = Pattern.compile("href=\"(/assets/index-[^\"]+\\.css)\"");

    @Autowired
    private MockMvc mockMvc;

    @Test
    void rootAndCurrentHashedAssetsAreServedBySpringBoot() throws Exception {
        mockMvc.perform(get("/")).andExpect(status().isOk());
        String html = mockMvc.perform(get("/index.html"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        String scriptPath = requiredMatch(SCRIPT_PATH, html);
        String stylePath = requiredMatch(STYLE_PATH, html);
        String script = mockMvc.perform(get(scriptPath))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        mockMvc.perform(get(stylePath)).andExpect(status().isOk());

        assertTrue(script.contains("Rotate Account Recovery Phrase"));
        assertTrue(script.contains("Save Name"));
        assertTrue(script.contains("This key will be retired"));
        assertTrue(script.contains("Activate Cloud Account?"));
        assertTrue(script.contains("Deactivate Cloud Account?"));
        assertTrue(script.contains("Yes, Reset Password"));
        assertTrue(script.contains("Physical Token Registration Prototype"));
        assertTrue(script.contains("Remove Physical Token Registration"));
    }

    private String requiredMatch(Pattern pattern, String value) {
        Matcher matcher = pattern.matcher(value);
        assertTrue(matcher.find(), "Expected hashed frontend asset reference was not found.");
        return matcher.group(1);
    }
}
