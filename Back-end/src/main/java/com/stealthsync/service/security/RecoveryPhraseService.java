package com.stealthsync.service.security;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;

@Service
/** Normalizes recovery phrases so generation and login always hash the same canonical value. */
public class RecoveryPhraseService {

    private static final int REQUIRED_WORD_COUNT = 6;
    private static final int MINIMUM_WORD_LIST_SIZE = 2048;
    private static final String WORD_LIST_RESOURCE = "recovery-words.txt";

    private final SecureRandom secureRandom = new SecureRandom();
    private final List<String> words;

    public RecoveryPhraseService() {
        this.words = loadWordList();
    }

    public String generate() {
        String[] selected = new String[REQUIRED_WORD_COUNT];
        for (int index = 0; index < selected.length; index++) {
            selected[index] = words.get(secureRandom.nextInt(words.size()));
        }
        return String.join("-", selected);
    }

    public int wordCount() {
        return words.size();
    }

    public String normalize(String phrase) {
        if (phrase == null || phrase.isBlank()) {
            throw new IllegalArgumentException("Recovery phrase must contain exactly 6 words.");
        }

        String[] words = Arrays.stream(phrase.trim().toLowerCase(Locale.ROOT).split("[\\s-]+"))
                .filter(word -> !word.isBlank())
                .toArray(String[]::new);
        if (words.length != REQUIRED_WORD_COUNT) {
            throw new IllegalArgumentException("Recovery phrase must contain exactly 6 words.");
        }
        return String.join("-", words);
    }

    private List<String> loadWordList() {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(
                new ClassPathResource(WORD_LIST_RESOURCE).getInputStream(), StandardCharsets.UTF_8))) {
            List<String> loaded = reader.lines()
                    .map(String::trim)
                    .filter(word -> !word.isBlank())
                    .toList();
            boolean validWords = loaded.stream().allMatch(word -> word.matches("[a-z]+"));
            if (loaded.size() < MINIMUM_WORD_LIST_SIZE
                    || new HashSet<>(loaded).size() != loaded.size()
                    || !validWords) {
                throw new IllegalStateException("Recovery word list must contain at least 2048 unique lowercase English words.");
            }
            return List.copyOf(loaded);
        } catch (IllegalStateException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new IllegalStateException("Recovery word list is missing or unreadable.", exception);
        }
    }
}
