package com.studytracker.service;

import com.studytracker.config.VnPayConfig;
import com.studytracker.dto.PaymentOrderDto;
import com.studytracker.dto.PaymentPackageDto;
import com.studytracker.dto.SavePackageRequest;
import com.studytracker.model.PaymentOrder;
import com.studytracker.model.PaymentPackage;
import com.studytracker.model.User;
import com.studytracker.repository.PaymentOrderRepository;
import com.studytracker.repository.PaymentPackageRepository;
import com.studytracker.repository.UserRepository;
import com.studytracker.util.VnPayUtil;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final VnPayConfig vnPayConfig;
    private final PaymentOrderRepository paymentOrderRepository;
    private final PaymentPackageRepository paymentPackageRepository;
    private final UserRepository userRepository;

    public boolean isUserPremium(User user) {
        if (paymentPackageRepository.countByIsActiveTrue() == 0) {
            return true; // Dynamic Free Mode: zero active packages -> unlock VIP for all users!
        }
        return user != null && user.isPremiumActive();
    }

    public List<PaymentPackageDto> getActivePackages() {
        return paymentPackageRepository.findByIsActiveTrueOrderByPriceVndAsc().stream()
                .map(this::mapToPackageDto)
                .collect(Collectors.toList());
    }

    public List<PaymentPackageDto> getAllPackages() {
        return paymentPackageRepository.findAllByOrderByPriceVndAsc().stream()
                .map(this::mapToPackageDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public PaymentPackageDto savePackage(SavePackageRequest request) {
        String packageId = (request.getId() != null && !request.getId().trim().isEmpty())
                ? request.getId().trim().toUpperCase()
                : "PKG_" + System.currentTimeMillis();

        PaymentPackage pkg = paymentPackageRepository.findById(packageId)
                .orElseGet(() -> PaymentPackage.builder().id(packageId).build());

        pkg.setName(request.getName() != null ? request.getName().trim() : "Gói VIP");
        pkg.setPriceVnd(request.getPriceVnd() != null && request.getPriceVnd() > 0 ? request.getPriceVnd() : 20000L);
        pkg.setDurationDays(request.getDurationDays() != null && request.getDurationDays() > 0 ? request.getDurationDays() : 30);
        pkg.setTagName(request.getTagName() != null ? request.getTagName().trim() : null);
        if (request.getIsActive() != null) {
            pkg.setIsActive(request.getIsActive());
        }

        PaymentPackage saved = paymentPackageRepository.save(pkg);
        return mapToPackageDto(saved);
    }

    @Transactional
    public void deletePackage(String id) {
        if (paymentPackageRepository.existsById(id)) {
            paymentPackageRepository.deleteById(id);
        }
    }

    private PaymentPackageDto mapToPackageDto(PaymentPackage pkg) {
        return PaymentPackageDto.builder()
                .id(pkg.getId())
                .name(pkg.getName())
                .priceVnd(pkg.getPriceVnd())
                .durationDays(pkg.getDurationDays())
                .tagName(pkg.getTagName())
                .isActive(pkg.getIsActive())
                .createdAt(pkg.getCreatedAt())
                .updatedAt(pkg.getUpdatedAt())
                .build();
    }

    @Transactional
    public String createVnPayPaymentUrl(User user, String packageId, HttpServletRequest request) {
        PaymentPackage pkg = paymentPackageRepository.findById(packageId)
                .orElseGet(() -> paymentPackageRepository.findByIsActiveTrueOrderByPriceVndAsc().stream()
                        .findFirst()
                        .orElse(PaymentPackage.builder()
                                .id("1_MONTH")
                                .name("Gói VIP Premium 1 Tháng")
                                .priceVnd(20000L)
                                .durationDays(30)
                                .build()));

        String orderId = "ST" + VnPayUtil.getRandomNumber(6) + System.currentTimeMillis() % 100000;
        long amountVnd = pkg.getPriceVnd();

        // Save PENDING order to database
        PaymentOrder paymentOrder = PaymentOrder.builder()
                .user(user)
                .orderId(orderId)
                .amount(amountVnd)
                .packageId(pkg.getId())
                .durationDays(pkg.getDurationDays())
                .packageName(pkg.getName())
                .orderInfo("Thanh toan " + pkg.getName() + " - User: " + user.getDisplayName())
                .status("PENDING")
                .build();
        paymentOrderRepository.save(paymentOrder);

        // Build VNPay params map
        Map<String, String> vnpParams = new HashMap<>();
        vnpParams.put("vnp_Version", vnPayConfig.getVersion());
        vnpParams.put("vnp_Command", vnPayConfig.getCommand());
        vnpParams.put("vnp_TmnCode", vnPayConfig.getTmnCode());
        vnpParams.put("vnp_Amount", String.valueOf(amountVnd * 100)); // VNPay amount is x100
        vnpParams.put("vnp_CurrCode", "VND");
        vnpParams.put("vnp_TxnRef", orderId);
        vnpParams.put("vnp_OrderInfo", paymentOrder.getOrderInfo());
        vnpParams.put("vnp_OrderType", "other");
        vnpParams.put("vnp_Locale", "vn");
        vnpParams.put("vnp_ReturnUrl", vnPayConfig.getReturnUrl());
        vnpParams.put("vnp_IpAddr", VnPayUtil.getIpAddress(request));

        Calendar cld = Calendar.getInstance(TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));
        SimpleDateFormat formatter = new SimpleDateFormat("yyyyMMddHHmmss");
        formatter.setTimeZone(TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));
        String vnpCreateDate = formatter.format(cld.getTime());
        vnpParams.put("vnp_CreateDate", vnpCreateDate);

        cld.add(Calendar.MINUTE, 30);
        String vnpExpireDate = formatter.format(cld.getTime());
        vnpParams.put("vnp_ExpireDate", vnpExpireDate);

        // Sort parameters alphabetically
        List<String> fieldNames = new ArrayList<>(vnpParams.keySet());
        Collections.sort(fieldNames);

        StringBuilder hashData = new StringBuilder();
        StringBuilder query = new StringBuilder();

        Iterator<String> itr = fieldNames.iterator();
        while (itr.hasNext()) {
            String fieldName = itr.next();
            String fieldValue = vnpParams.get(fieldName);
            if ((fieldValue != null) && (!fieldValue.isEmpty())) {
                try {
                    hashData.append(fieldName);
                    hashData.append('=');
                    hashData.append(URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII.toString()));

                    query.append(URLEncoder.encode(fieldName, StandardCharsets.US_ASCII.toString()));
                    query.append('=');
                    query.append(URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII.toString()));

                    if (itr.hasNext()) {
                        query.append('&');
                        hashData.append('&');
                    }
                } catch (Exception e) {
                    log.error("Error encoding URL parameter", e);
                }
            }
        }

        String queryUrl = query.toString();
        String vnpSecureHash = VnPayUtil.hmacSHA512(vnPayConfig.getHashSecret(), hashData.toString());
        queryUrl += "&vnp_SecureHash=" + vnpSecureHash;

        return vnPayConfig.getPayUrl() + "?" + queryUrl;
    }

    @Transactional
    public PaymentOrder processVnPayCallback(Map<String, String> queryParams) {
        String vnpSecureHash = queryParams.get("vnp_SecureHash");
        Map<String, String> fields = new HashMap<>();

        for (Map.Entry<String, String> entry : queryParams.entrySet()) {
            String key = entry.getKey();
            String value = entry.getValue();
            if (value != null && !value.isEmpty() && !key.equals("vnp_SecureHash") && !key.equals("vnp_SecureHashType")) {
                fields.put(key, value);
            }
        }

        // Sort fields for hashing verification
        List<String> fieldNames = new ArrayList<>(fields.keySet());
        Collections.sort(fieldNames);

        StringBuilder hashData = new StringBuilder();
        Iterator<String> itr = fieldNames.iterator();
        while (itr.hasNext()) {
            String fieldName = itr.next();
            String fieldValue = fields.get(fieldName);
            try {
                hashData.append(fieldName);
                hashData.append('=');
                hashData.append(URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII.toString()));
                if (itr.hasNext()) {
                    hashData.append('&');
                }
            } catch (Exception e) {
                log.error("Error encoding field in hash verification", e);
            }
        }

        String signValue = VnPayUtil.hmacSHA512(vnPayConfig.getHashSecret(), hashData.toString());
        boolean isValidSignature = signValue != null && signValue.equalsIgnoreCase(vnpSecureHash);

        String orderId = queryParams.get("vnp_TxnRef");
        String responseCode = queryParams.get("vnp_ResponseCode");
        String transactionNo = queryParams.get("vnp_TransactionNo");

        PaymentOrder paymentOrder = paymentOrderRepository.findByOrderId(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng: " + orderId));

        paymentOrder.setVnpTransactionNo(transactionNo);
        paymentOrder.setVnpResponseCode(responseCode);

        if (isValidSignature && "00".equals(responseCode)) {
            paymentOrder.setStatus("SUCCESS");
            
            // Activate / Extend Premium for User
            User user = paymentOrder.getUser();
            user.setIsPremium(true);
            
            Instant currentUntil = user.getPremiumUntil();
            Instant now = Instant.now();
            Instant newUntil;
            
            if (currentUntil != null && currentUntil.isAfter(now)) {
                newUntil = currentUntil.plus(paymentOrder.getDurationDays(), ChronoUnit.DAYS);
            } else {
                newUntil = now.plus(paymentOrder.getDurationDays(), ChronoUnit.DAYS);
            }
            
            user.setPremiumUntil(newUntil);
            userRepository.save(user);
            log.info("Thanh toan thanh cong đơn hang {} cho user {}, gia han toi {}", orderId, user.getEmail(), newUntil);
        } else {
            paymentOrder.setStatus("FAILED");
            log.warn("Thanh toan thất bai đơn hang {}: responseCode={}, isValidSignature={}", orderId, responseCode, isValidSignature);
        }

        return paymentOrderRepository.save(paymentOrder);
    }

    public List<PaymentOrderDto> getUserPaymentHistory(User user) {
        return paymentOrderRepository.findByUserOrderByCreatedAtDesc(user).stream()
                .map(order -> PaymentOrderDto.builder()
                        .orderId(order.getOrderId())
                        .packageId(order.getPackageId())
                        .packageName(order.getPackageName())
                        .amount(order.getAmount())
                        .durationDays(order.getDurationDays())
                        .status(order.getStatus())
                        .vnpTransactionNo(order.getVnpTransactionNo())
                        .createdAt(order.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    /**
     * Tự động chuyển trạng thái các đơn hàng PENDING quá 30 phút thành EXPIRED.
     * Tác vụ tự động chạy mỗi 10 phút.
     */
    @Scheduled(cron = "0 */10 * * * *")
    @Transactional
    public void cleanupExpiredPendingOrders() {
        Instant cutoffTime = Instant.now().minus(30, ChronoUnit.MINUTES);
        int updatedCount = paymentOrderRepository.updateStatusToExpiredForPendingOrdersBefore(cutoffTime);
        if (updatedCount > 0) {
            log.info("Đã cập nhật trạng thái {} đơn hàng PENDING hết hạn sang EXPIRED (tạo trước {})", updatedCount, cutoffTime);
        }
    }
}
