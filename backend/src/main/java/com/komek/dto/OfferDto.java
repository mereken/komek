package com.komek.dto;

import java.time.LocalDateTime;

public record OfferDto(Long id, PersonDto runner, int price, LocalDateTime createdAt) {}
