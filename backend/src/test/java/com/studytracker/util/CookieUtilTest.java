package com.studytracker.util;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CookieUtilTest {

    @Test
    void createCookies_shouldUseConfiguredSameSiteAndSecureFlags() {
        CookieUtil cookieUtil = new CookieUtil();
        ReflectionTestUtils.setField(cookieUtil, "cookieSameSite", "None");
        ReflectionTestUtils.setField(cookieUtil, "cookieSecure", true);

        var accessCookie = cookieUtil.createAccessTokenCookie("token", 900000);
        var refreshCookie = cookieUtil.createRefreshTokenCookie("token", 604800000);
        var cleanAccessCookie = cookieUtil.createCleanAccessTokenCookie();
        var cleanRefreshCookie = cookieUtil.createCleanRefreshTokenCookie();

        assertEquals("None", accessCookie.getSameSite());
        assertEquals("None", refreshCookie.getSameSite());
        assertEquals("None", cleanAccessCookie.getSameSite());
        assertEquals("None", cleanRefreshCookie.getSameSite());

        assertTrue(accessCookie.isSecure());
        assertTrue(refreshCookie.isSecure());
        assertTrue(cleanAccessCookie.isSecure());
        assertTrue(cleanRefreshCookie.isSecure());

        assertTrue(accessCookie.isHttpOnly());
        assertTrue(refreshCookie.isHttpOnly());
    }
}
