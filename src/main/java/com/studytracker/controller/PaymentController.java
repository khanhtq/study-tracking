package com.studytracker.controller;

import com.studytracker.dto.CreatePaymentRequest;
import com.studytracker.dto.PaymentOrderDto;
import com.studytracker.dto.PaymentPackageDto;
import com.studytracker.model.PaymentOrder;
import com.studytracker.model.User;
import com.studytracker.service.PaymentService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/payment")
@RequiredArgsConstructor
@Slf4j
public class PaymentController {

    private final PaymentService paymentService;

    @Value("${APP_FRONTEND_URL:${FRONTEND_URL:${app.frontend-url:http://localhost:5173}}}")
    private String frontendUrl;

    @PostMapping("/vnpay/create")
    public ResponseEntity<Map<String, String>> createVnPayPayment(
            @AuthenticationPrincipal User user,
            @RequestBody(required = false) CreatePaymentRequest requestDto,
            HttpServletRequest request) {
        String packageId = (requestDto != null && requestDto.getPackageId() != null)
                ? requestDto.getPackageId()
                : "1_MONTH";

        String paymentUrl = paymentService.createVnPayPaymentUrl(user, packageId, request);
        return ResponseEntity.ok(Map.of("paymentUrl", paymentUrl));
    }

    @GetMapping("/vnpay/return")
    public void handleVnPayReturn(
            @RequestParam Map<String, String> queryParams,
            HttpServletResponse response) throws IOException {
        try {
            PaymentOrder order = paymentService.processVnPayCallback(queryParams);
            String status = order.getStatus();
            String redirectTarget = frontendUrl + "/?paymentStatus=" + status + "&orderId=" + order.getOrderId();
            response.sendRedirect(redirectTarget);
        } catch (Exception e) {
            log.error("Error processing VNPay return callback", e);
            response.sendRedirect(frontendUrl + "/?paymentStatus=FAILED");
        }
    }

    @GetMapping("/packages")
    public ResponseEntity<List<PaymentPackageDto>> getActivePackages() {
        return ResponseEntity.ok(paymentService.getActivePackages());
    }

    @GetMapping("/history")
    public ResponseEntity<List<PaymentOrderDto>> getPaymentHistory(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(paymentService.getUserPaymentHistory(user));
    }
}
