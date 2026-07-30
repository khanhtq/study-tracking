package com.studytracker.repository;

import com.studytracker.model.PaymentPackage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PaymentPackageRepository extends JpaRepository<PaymentPackage, String> {
    List<PaymentPackage> findByIsActiveTrueOrderByPriceVndAsc();
    List<PaymentPackage> findAllByOrderByPriceVndAsc();
}
