package com.komek.util;

import java.time.LocalDateTime;
import java.time.ZoneId;

/** The app is for Almaty, so all timestamps use Almaty time no matter where the server runs. */
public final class TimeUtil {
    private static final ZoneId ZONE = ZoneId.of("Asia/Almaty");

    private TimeUtil() {}

    public static LocalDateTime now() { return LocalDateTime.now(ZONE); }
}
