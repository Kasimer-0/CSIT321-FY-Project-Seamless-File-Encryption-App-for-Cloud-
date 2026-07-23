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

import jakarta.servlet.http.HttpServletResponse;

@Configuration
@EnableMethodSecurity
@RequiredArgsConstructor
/** Defines public authentication/static routes and role-protected application APIs. */
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final DeviceAccessFilter deviceAccessFilter;

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                // Stateless JWT logout is handled by AuthController so the
                // frontend receives JSON instead of Spring Security's default
                // redirect to a GET /login page.
                .logout(logout -> logout.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(exceptions -> exceptions
                        // API clients should receive a clear 401 instead of Spring Security's browser login redirect.
                        .authenticationEntryPoint((request, response, exception) ->
                                response.sendError(HttpServletResponse.SC_UNAUTHORIZED)))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(
                                "/", "/index.html", "/assets/**", "/static/**", "/favicon.svg", "/icons.svg",
                                "/login", "/signup", "/account/recovery-phrase/login",
                                "/cloud-storage/oauth/**", "/cloud-storage/*/callback", "/error"
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
                                "/devices/**", "/vault/**", "/files/**", "/api/file/**"
                        ).hasRole("CUSTOMER")
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterAfter(deviceAccessFilter, JwtAuthenticationFilter.class)
                .build();
    }
}
