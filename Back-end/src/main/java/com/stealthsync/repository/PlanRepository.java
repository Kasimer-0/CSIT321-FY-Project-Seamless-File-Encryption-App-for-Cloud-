package com.stealthsync.repository;

import com.stealthsync.model.entity.Plan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PlanRepository extends JpaRepository<Plan, Long> {
    Optional<Plan> findByPlanTitleIgnoreCase(String planTitle);
}
