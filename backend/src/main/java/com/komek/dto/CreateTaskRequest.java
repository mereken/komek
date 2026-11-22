package com.komek.dto;

import com.komek.model.Category;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;

/** fromLocation is required for the categories with two addresses (checked in TaskService). */
public record CreateTaskRequest(
        @NotNull(message = "Выберите, что нужно сделать") Category category,
        @Size(max = 120, message = "Название слишком длинное") String title,
        @Size(max = 200, message = "Адрес слишком длинный") String fromLocation,
        @NotBlank(message = "Укажите адрес") @Size(max = 200, message = "Адрес слишком длинный") String location,
        @NotNull(message = "Укажите время") LocalDateTime deadline,
        @Size(max = 2000, message = "Комментарий слишком длинный") String description,
        @NotNull(message = "Укажите цену")
        @Min(value = 100, message = "Минимальная цена — 100 ₸")
        @Max(value = 1000000, message = "Слишком большая цена") Integer reward
) {}
