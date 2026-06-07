package com.stealthsync.model.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "user_accounts")
public class UserAccount {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Long userID;          // Align the userID: number in Type.ts

    @Column(nullable = false, unique = true)
    private String username;

    @Column(nullable = false, unique = true)
    private String email;

    @JsonIgnore
    @Column(name = "password_hash")
    private String passwordHash;

    @Column(nullable = false)
    private String role;          // "admin" | "customer"

    @Column(name = "is_subscribed", nullable = false)
    private boolean subscribed;

    @Column(name = "is_suspended", nullable = false)
    private boolean suspended;

    @Column(name = "subscription_id")
    private Long subscription;

    public UserAccount(Long userID, String username, String email, String role, boolean subscribed, boolean suspended) {
        this(userID, username, email, role, subscribed, suspended, null);
    }

    public UserAccount(Long userID, String username, String email, String role,
                       boolean subscribed, boolean suspended, Long subscription) {
        this.userID = userID;
        this.username = username;
        this.email = email;
        this.role = role;
        this.subscribed = subscribed;
        this.suspended = suspended;
        this.subscription = subscription;
    }

    public Long getId() {
        return userID;
    }

    public void setId(Long id) {
        this.userID = id;
    }

    @JsonProperty("isSubscribed")
    public boolean isSubscribed() {
        return subscribed;
    }

    @JsonProperty("isSubscribed")
    public void setSubscribed(boolean subscribed) {
        this.subscribed = subscribed;
    }

    @JsonProperty("isSuspended")
    public boolean isSuspended() {
        return suspended;
    }

    @JsonProperty("isSuspended")
    public void setSuspended(boolean suspended) {
        this.suspended = suspended;
    }
}
