package com.komek.util;

import java.time.YearMonth;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Format checks for the demo bank card. (No Luhn check on purpose: any 16 digits work as a test card.) */
public final class Cards {
    private static final Pattern EXPIRY = Pattern.compile("^(\\d{1,2})\\s*/\\s*(\\d{2})$");

    private Cards() {}

    public static String digits(String raw) {
        return raw == null ? "" : raw.replaceAll("\\D", "");
    }

    public static boolean validNumber(String digits) {
        return digits != null && digits.matches("^\\d{16}$");
    }

    public static boolean validCvc(String raw) {
        return raw != null && raw.trim().matches("^\\d{3}$");
    }

    /** "8/28" or "08 / 28" -> "08/28". Returns null when the format or the month is wrong. */
    public static String normalizeExpiry(String raw) {
        if (raw == null) return null;
        Matcher m = EXPIRY.matcher(raw.trim());
        if (!m.matches()) return null;
        int month = Integer.parseInt(m.group(1));
        if (month < 1 || month > 12) return null;
        return String.format("%02d/%s", month, m.group(2));
    }

    /** expiry must already be normalized ("MM/YY"). A card is valid through the end of its month. */
    public static boolean expired(String expiry) {
        int month = Integer.parseInt(expiry.substring(0, 2));
        int year = 2000 + Integer.parseInt(expiry.substring(3, 5));
        return YearMonth.of(year, month).isBefore(YearMonth.from(TimeUtil.now()));
    }

    public static String brand(String digits) {
        if (digits.startsWith("4")) return "Visa";
        if (digits.matches("^(5[1-5]|2[2-7]).*")) return "Mastercard";
        return "Карта";
    }
}
