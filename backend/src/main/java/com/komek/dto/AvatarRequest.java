package com.komek.dto;

import jakarta.validation.constraints.NotBlank;

/** image is a data URL: "data:image/jpeg;base64,...." (the app shrinks the photo before sending). */
public record AvatarRequest(@NotBlank(message = "Выберите фото") String image) {}
