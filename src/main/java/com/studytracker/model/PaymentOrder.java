package com.studytracker.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(name = "payment_orders")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "order_id", unique = true, nullable = false, length = 100)
    private String orderId;

    @Column(nullable = false)
    private Long amount;

    @Column(name = "package_id", nullable = false, length = 50)
    private String packageId;

    @Column(name = "duration_days", nullable = false)
    private Integer durationDays;

    @Column(name = "package_name", nullable = false, length = 100)
    private String packageName;

    @Column(name = "order_info", length = 255)
    private String orderInfo;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "PENDING"; // PENDING, SUCCESS, FAILED, CANCELLED

    @Column(name = "vnp_transaction_no", length = 100)
    private String vnpTransactionNo;

    @Column(name = "vnp_response_code", length = 20)
    private String vnpResponseCode;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
