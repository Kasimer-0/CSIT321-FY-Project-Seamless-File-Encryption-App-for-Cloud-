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

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "plans")
/** Purchasable free or paid plan including status and advertised encryption method. */
public class Plan {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "plan_id")
    private Long planID;          //Align the planID: number in Entity.ts

    @Column(nullable = false)
    private String planTitle;

    @Column(nullable = false)
    private double planPrice;     // Align the planPrice: number in Entity.ts

    @Column(length = 1000)
    private String planDescription;

    @Column(nullable = false)
    private String planStatus;

    @Column(nullable = false)
    private String encMethod;
}
