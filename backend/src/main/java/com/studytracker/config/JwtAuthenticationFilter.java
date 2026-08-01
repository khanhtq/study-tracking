package com.studytracker.config;

import com.studytracker.util.CookieUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;
    private final UserDetailsService userDetailsService;
    private final CookieUtil cookieUtil;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String jwt = cookieUtil.extractCookieValue(request, CookieUtil.ACCESS_TOKEN_COOKIE_NAME);

        // Fallback to Authorization header if cookie is missing
        if (jwt == null || jwt.isBlank()) {
            final String authHeader = request.getHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                jwt = authHeader.substring(7);
            }
        }

        if (jwt == null || jwt.isBlank()) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            String userEmail = jwtTokenProvider.extractUsername(jwt);
            if (userEmail != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                UserDetails userDetails = this.userDetailsService.loadUserByUsername(userEmail);
                if (jwtTokenProvider.validateToken(jwt, userDetails)) {
                    if (!userDetails.isAccountNonLocked()) {
                        String banReason = "Vi phạm quy chuẩn cộng đồng";
                        if (userDetails instanceof com.studytracker.model.User) {
                            com.studytracker.model.User user = (com.studytracker.model.User) userDetails;
                            if (user.getBanReason() != null && !user.getBanReason().isBlank()) {
                                banReason = user.getBanReason();
                            }
                        }
                        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                        response.setContentType("application/json;charset=UTF-8");
                        String safeReason = banReason.replace("\"", "\\\"").replace("\n", " ");
                        String jsonBody = String.format("{\"status\":403,\"error\":\"FORBIDDEN\",\"message\":\"Tài khoản của bạn đã bị cấm. Lý do: %s\",\"banned\":true,\"banReason\":\"%s\"}",
                                safeReason, safeReason);
                        response.getWriter().write(jsonBody);
                        return;
                    }

                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,
                            userDetails.getAuthorities()
                    );
                    authToken.setDetails(
                            new WebAuthenticationDetailsSource().buildDetails(request)
                    );
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }
        } catch (Exception e) {
            log.warn("Cannot set user authentication from JWT token: {}", e.getMessage());
        }
        filterChain.doFilter(request, response);
    }
}
