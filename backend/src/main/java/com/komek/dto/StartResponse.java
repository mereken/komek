package com.komek.dto;

/** contact = normalized phone/e-mail. devCode is filled only in test mode (no real SMS yet). */
public record StartResponse(String contact, int resendInSeconds, String devCode) {}
