package com.komek.dto;

/** Public info about another user. contact (phone or e-mail) is filled only for the other side of an assigned task. */
public record PersonDto(Long id, String name, Double rating, long ratingCount, long completed, String contact) {}
