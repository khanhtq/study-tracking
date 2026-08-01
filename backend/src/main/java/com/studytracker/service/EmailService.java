package com.studytracker.service;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${brevo.api.key:${BREVO_API_KEY:${spring.mail.password:}}}")
    private String brevoApiKey;

    @Value("${spring.mail.from:${spring.mail.username:no-reply@studyxptracker.com}}")
    private String fromEmail;

    @Async
    public void sendOtpEmail(String toEmail, String otpCode) {
        log.info("Sending OTP verification email to: {}", toEmail);
        String subject = "Mã xác minh tài khoản Study XP Tracker";
        String htmlBody = buildOtpEmailHtml(otpCode);

        if (sendViaBrevoHttpApi(toEmail, subject, htmlBody)) {
            return;
        }

        // Secondary fallback to SMTP if API key is not configured or fails
        try {
            if (mailSender != null) {
                MimeMessage message = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

                String sender = (fromEmail != null && !fromEmail.isBlank()) ? fromEmail : "no-reply@studyxptracker.com";
                helper.setFrom(sender, "Study XP Tracker");
                helper.setTo(toEmail);
                helper.setSubject(subject);
                helper.setText(htmlBody, true);

                mailSender.send(message);
                log.info("Successfully sent OTP email via SMTP fallback to {}", toEmail);
                return;
            }
        } catch (Exception e) {
            log.warn("SMTP fallback failed: {}", e.getMessage());
        }

        log.error("Failed to send OTP email to {}. (Dev Fallback OTP: {})", toEmail, otpCode);
    }

    @Async
    public void sendPasswordResetEmail(String toEmail, String otpCode) {
        log.info("Sending Password Reset OTP email to: {}", toEmail);
        String subject = "Mã khôi phục mật khẩu Study XP Tracker";
        String htmlBody = buildResetPasswordEmailHtml(otpCode);

        if (sendViaBrevoHttpApi(toEmail, subject, htmlBody)) {
            return;
        }

        // Secondary fallback to SMTP if API key is not configured or fails
        try {
            if (mailSender != null) {
                MimeMessage message = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

                String sender = (fromEmail != null && !fromEmail.isBlank()) ? fromEmail : "no-reply@studyxptracker.com";
                helper.setFrom(sender, "Study XP Tracker");
                helper.setTo(toEmail);
                helper.setSubject(subject);
                helper.setText(htmlBody, true);

                mailSender.send(message);
                log.info("Successfully sent Password Reset OTP email via SMTP fallback to {}", toEmail);
                return;
            }
        } catch (Exception e) {
            log.warn("SMTP fallback failed: {}", e.getMessage());
        }

        log.error("Failed to send Password Reset OTP email to {}. (Dev Fallback OTP: {})", toEmail, otpCode);
    }

    private boolean sendViaBrevoHttpApi(String toEmail, String subject, String htmlContent) {
        if (brevoApiKey == null || brevoApiKey.isBlank()) {
            log.warn("Cannot use Brevo HTTPS API fallback because BREVO_API_KEY / mailPassword is not configured.");
            return false;
        }

        try {
            log.info("Sending email via Brevo HTTPS REST API to {}", toEmail);
            String senderEmail = (fromEmail != null && !fromEmail.isBlank()) ? fromEmail : "no-reply@studyxptracker.com";

            String jsonPayload = String.format("""
                {
                  "sender": {"name": "Study XP Tracker", "email": "%s"},
                  "to": [{"email": "%s"}],
                  "subject": %s,
                  "htmlContent": %s
                }
                """,
                escapeJson(senderEmail),
                escapeJson(toEmail),
                toJsonString(subject),
                toJsonString(htmlContent)
            );

            java.net.http.HttpClient client = java.net.http.HttpClient.newHttpClient();
            java.net.http.HttpRequest request = java.net.http.HttpRequest.newBuilder()
                    .uri(java.net.URI.create("https://api.brevo.com/v3/smtp/email"))
                    .header("accept", "application/json")
                    .header("api-key", brevoApiKey)
                    .header("content-type", "application/json")
                    .POST(java.net.http.HttpRequest.BodyPublishers.ofString(jsonPayload))
                    .build();

            java.net.http.HttpResponse<String> response = client.send(request, java.net.http.HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                log.info("Successfully sent email via Brevo HTTPS API to {}", toEmail);
                return true;
            } else {
                log.error("Brevo HTTPS API returned error status {}: {}", response.statusCode(), response.body());
                return false;
            }
        } catch (Exception ex) {
            log.error("Exception during Brevo HTTPS API fallback send: ", ex);
            return false;
        }
    }

    private String toJsonString(String input) {
        if (input == null) return "null";
        StringBuilder sb = new StringBuilder("\"");
        for (char c : input.toCharArray()) {
            switch (c) {
                case '"' -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\b' -> sb.append("\\b");
                case '\f' -> sb.append("\\f");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                default -> {
                    if (c < ' ') {
                        sb.append(String.format("\\u%04x", (int) c));
                    } else {
                        sb.append(c);
                    }
                }
            }
        }
        sb.append("\"");
        return sb.toString();
    }

    private String escapeJson(String input) {
        if (input == null) return "";
        return input.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private String buildOtpEmailHtml(String otpCode) {
        return """
            <!DOCTYPE html>
            <html lang="vi">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Xác minh tài khoản</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #f8fafc;">
                <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="min-width: 100%; background-color: #0f172a; padding: 40px 20px;">
                    <tr>
                        <td align="center">
                            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #1e293b; border-radius: 16px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
                                <!-- Header -->
                                <tr>
                                    <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px 24px; text-align: center;">
                                        <div style="display: inline-block; width: 48px; height: 48px; background-color: rgba(255, 255, 255, 0.2); border-radius: 12px; line-height: 48px; font-size: 24px; margin-bottom: 12px;">
                                            ⚡
                                        </div>
                                        <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">Study XP Tracker</h1>
                                        <p style="margin: 6px 0 0 0; font-size: 14px; color: #e0e7ff;">Xác minh địa chỉ Email của bạn</p>
                                    </td>
                                </tr>
                                
                                <!-- Content -->
                                <tr>
                                    <td style="padding: 36px 32px; text-align: center;">
                                        <p style="margin: 0 0 24px 0; font-size: 15px; color: #cbd5e1; line-height: 1.6;">
                                            Cảm ơn bạn đã đăng ký tài khoản tại <strong>Study XP Tracker</strong>. Vui lòng sử dụng mã xác minh 4 chữ số dưới đây để kích hoạt tài khoản của bạn:
                                        </p>
                                        
                                        <!-- OTP Box -->
                                        <div style="background-color: #090d16; border: 2px dashed #6366f1; border-radius: 14px; padding: 20px 16px; margin: 0 auto 28px auto; max-width: 280px; text-align: center;">
                                            <span style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; color: #818cf8; letter-spacing: 14px; display: inline-block; padding-left: 14px;">
                                                """ + otpCode + """
                                            </span>
                                        </div>

                                        <div style="background-color: rgba(239, 68, 68, 0.1); border-radius: 8px; border-left: 4px solid #ef4444; padding: 12px 16px; text-align: left; margin-bottom: 24px;">
                                            <p style="margin: 0; font-size: 13px; color: #fca5a5; line-height: 1.5;">
                                                ⚠️ Mã này chỉ có hiệu lực trong <strong>5 phút</strong>. Nếu không hoàn tất xác minh trong 5 phút, thông tin đăng ký sẽ tự động xóa và bạn sẽ cần thực hiện đăng ký lại.
                                            </p>
                                        </div>

                                        <p style="margin: 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">
                                            Nếu bạn không thực hiện đăng ký tài khoản này, xin vui lòng bỏ qua email này.
                                        </p>
                                    </td>
                                </tr>

                                <!-- Footer -->
                                <tr>
                                    <td style="background-color: #0f172a; padding: 20px 32px; text-align: center; border-top: 1px solid #334155;">
                                        <p style="margin: 0; font-size: 12px; color: #64748b;">
                                            © 2026 Study XP Tracker. Tất cả các quyền được bảo lưu.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
            """;
    }

    private String buildResetPasswordEmailHtml(String otpCode) {
        return """
            <!DOCTYPE html>
            <html lang="vi">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Khôi phục mật khẩu</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #f8fafc;">
                <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="min-width: 100%; background-color: #0f172a; padding: 40px 20px;">
                    <tr>
                        <td align="center">
                            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #1e293b; border-radius: 16px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
                                <!-- Header -->
                                <tr>
                                    <td style="background: linear-gradient(135deg, #e11d48 0%, #9333ea 100%); padding: 32px 24px; text-align: center;">
                                        <div style="display: inline-block; width: 48px; height: 48px; background-color: rgba(255, 255, 255, 0.2); border-radius: 12px; line-height: 48px; font-size: 24px; margin-bottom: 12px;">
                                            🔑
                                        </div>
                                        <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">Study XP Tracker</h1>
                                        <p style="margin: 6px 0 0 0; font-size: 14px; color: #ffe4e6;">Yêu cầu khôi phục mật khẩu</p>
                                    </td>
                                </tr>
                                
                                <!-- Content -->
                                <tr>
                                    <td style="padding: 36px 32px; text-align: center;">
                                        <p style="margin: 0 0 24px 0; font-size: 15px; color: #cbd5e1; line-height: 1.6;">
                                            Chúng tôi đã nhận được yêu cầu lấy lại mật khẩu cho tài khoản <strong>Study XP Tracker</strong> của bạn. Vui lòng sử dụng mã 4 chữ số dưới đây để tiếp tục:
                                        </p>
                                        
                                        <!-- OTP Box -->
                                        <div style="background-color: #090d16; border: 2px dashed #f43f5e; border-radius: 14px; padding: 20px 16px; margin: 0 auto 28px auto; max-width: 280px; text-align: center;">
                                            <span style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; color: #fb7185; letter-spacing: 14px; display: inline-block; padding-left: 14px;">
                                                """ + otpCode + """
                                            </span>
                                        </div>

                                        <div style="background-color: rgba(244, 63, 94, 0.1); border-radius: 8px; border-left: 4px solid #f43f5e; padding: 12px 16px; text-align: left; margin-bottom: 24px;">
                                            <p style="margin: 0; font-size: 13px; color: #fca5a5; line-height: 1.5;">
                                                ⚠️ Mã này chỉ có hiệu lực trong <strong>5 phút</strong>.
                                            </p>
                                        </div>

                                        <p style="margin: 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">
                                            Nếu bạn không đưa ra yêu cầu này, xin vui lòng bỏ qua email và mật khẩu của bạn vẫn hoàn toàn an toàn.
                                        </p>
                                    </td>
                                </tr>

                                <!-- Footer -->
                                <tr>
                                    <td style="background-color: #0f172a; padding: 20px 32px; text-align: center; border-top: 1px solid #334155;">
                                        <p style="margin: 0; font-size: 12px; color: #64748b;">
                                            © 2026 Study XP Tracker. Tất cả các quyền được bảo lưu.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
            """;
    }
}
