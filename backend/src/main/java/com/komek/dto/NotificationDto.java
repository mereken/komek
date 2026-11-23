package com.komek.dto;

import java.time.LocalDateTime;

public record NotificationDto(Long id, String kind, String area, Long taskId, String text,
                              LocalDateTime createdAt, boolean read) {}
