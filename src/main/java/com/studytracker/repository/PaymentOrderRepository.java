package com.studytracker.repository;

import com.studytracker.model.PaymentOrder;
import com.studytracker.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentOrderRepository extends JpaRepository<PaymentOrder, Long> {
    Optional<PaymentOrder> findByOrderId(String orderId);
    List<PaymentOrder> findByUserOrderByCreatedAtDesc(User user);

    @Modifying
    @Query("UPDATE PaymentOrder p SET p.status = 'EXPIRED' WHERE p.status = 'PENDING' AND p.createdAt < :cutoffTime")
    int updateStatusToExpiredForPendingOrdersBefore(@Param("cutoffTime") Instant cutoffTime);
}
