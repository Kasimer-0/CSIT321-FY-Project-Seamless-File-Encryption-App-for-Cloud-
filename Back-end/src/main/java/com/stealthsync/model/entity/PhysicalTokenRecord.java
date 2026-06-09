package com.stealthsync.model.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "physical_tokens")
public class PhysicalTokenRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "token_id")
    private Long tokenID;

    @Column(nullable = false)
    private Long ownerID;

    @Column(nullable = false)
    private String tokenName;

    @Column(nullable = false)
    private String serialNumber;

    @Column(nullable = false)
    private String status;

    @Column(nullable = false)
    private Instant registeredAt;

    private Instant lastUsedAt;
}
