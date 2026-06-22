package com.stealthsync.security;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableMethodSecurity
@RequiredArgsConstructor
/** Defines public authentication/static routes and role-protected application APIs. */
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(
                                "/", "/index.html", "/assets/**", "/static/**", "/favicon.svg", "/icons.svg",
                                "/login", "/signup", "/account/recovery-phrase/login",
                                "/cloud-storage/oauth/google/callback", "/error"
                        ).permitAll()
                        .requestMatchers("/admin/**", "/users/**", "/enc-methods").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/plans/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/plans/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/plans/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/subscriptions", "/subscriptions/*").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/subscriptions/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/subscriptions/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/subscriptions/purchase").hasRole("CUSTOMER")
                        .requestMatchers(
                                "/account/**", "/cloud-storage/**", "/encryption-keys/**",
                                "/physical-tokens/**", "/vault/**", "/privacy/**", "/files/**", "/api/file/**"
                        ).hasRole("CUSTOMER")
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }
}