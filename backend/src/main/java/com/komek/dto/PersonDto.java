package com.komek.dto;

/**
 * Public info about another user. contact (phone or e-mail) is filled only for the other side of an assigned task.
 * rating is the one that matters in this role: a requester shows the rating given by runners, a runner the one given by requesters.
 */
public record PersonDto(Long id, String name, Double rating, long ratingCount, long completed, String contact,
                        String avatarUrl) {}
