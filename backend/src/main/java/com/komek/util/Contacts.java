package com.komek.util;

import java.util.regex.Pattern;

/** Normalizes phone / e-mail so "8 701 234 56 78" and "+77012345678" are the same account. */
public final class Contacts {
    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");

    private Contacts() {}

    /** Returns "+7XXXXXXXXXX" or null if it is not a valid +7 / 8 number. */
    public static String normalizePhone(String raw) {
        if (raw == null) return null;
        String d = raw.replaceAll("\\D", "");
        if (d.length() == 11 && (d.startsWith("7") || d.startsWith("8"))) d = "7" + d.substring(1);
        else if (d.length() == 10) d = "7" + d;
        else return null;
        return "+" + d;
    }

    /** Returns lower-cased e-mail or null if invalid. */
    public static String normalizeEmail(String raw) {
        if (raw == null) return null;
        String e = raw.trim().toLowerCase();
        return e.length() <= 150 && EMAIL.matcher(e).matches() ? e : null;
    }
}
