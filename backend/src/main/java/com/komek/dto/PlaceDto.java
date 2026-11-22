package com.komek.dto;

/** One address suggestion. text is what goes into the input field when the user picks it. */
public record PlaceDto(String title, String subtitle, String text, Double lat, Double lon) {}
