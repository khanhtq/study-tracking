package com.studytracker.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(name = "payment_packages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentPackage {

    @Id
    @Column(length = 50, nullable = false)
    private String id;

    @Column(length = 100, nullable = false)
    private String name;

    @Column(name = "price_vnd", nullable = false)
    private Long priceVnd;

    @Column(name = "duration_days", nullable = false)
    private Integer durationDays;

    @Column(name = "tag_name", length = 50)
    private String tagName;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
