package com.komek.dto;

import com.komek.model.Category;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;

/**
 * Create or edit an order. fromLocation is required for the categories with two addresses (checked in TaskService).
 * startAt (optional) turns the deadline into a time window. budget = money the runner must spend (0 / null = none).
 * allowOffers null = true.
 */
public record CreateTaskRequest(
        @NotNull(message = "Выберите, что нужно сделать") Category category,
        @Size(max = 120, message = "Название слишком длинное") String title,
        @Size(max = 200, message = "Адрес слишком длинный") String fromLocation,
        @Size(max = 400, message = "Подробности слишком длинные") String fromDetails,
        @NotBlank(message = "Укажите адрес") @Size(max = 200, message = "Адрес слишком длинный") String location,
        @Size(max = 400, message = "Подробности слишком длинные") String locationDetails,
        LocalDateTime startAt,
        @NotNull(message = "Укажите время") LocalDateTime deadline,
        @Size(max = 2000, message = "Комментарий слишком длинный") String description,
        @NotNull(message = "Укажите цену")
        @Min(value = 100, message = "Минимальная цена — 100 ₸")
        @Max(value = 1000000, message = "Слишком большая цена") Integer reward,
        @Min(value = 0, message = "Сумма не может быть отрицательной")
        @Max(value = 1000000, message = "Слишком большая сумма") Integer budget,
        Boolean allowOffers
) {}
