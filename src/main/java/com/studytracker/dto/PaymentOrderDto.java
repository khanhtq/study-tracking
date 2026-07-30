package com.studytracker.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentOrderDto {
    private String orderId;
    private String packageId;
    private String packageName;
    private Long amount;
    private Integer durationDays;
    private String status;
    private String vnpTransactionNo;
    private Instant createdAt;
}
