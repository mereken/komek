package com.komek.dto;

import com.komek.model.Mode;
import jakarta.validation.constraints.NotNull;

public record ModeRequest(@NotNull(message = "Выберите режим") Mode mode) {}
