package com.komek.dto;

import jakarta.validation.constraints.*;

/** price is optional: when empty the runner agrees to the requester's price. */
public record OfferRequest(
        @Min(value = 100, message = "Минимальная цена — 100 ₸")
        @Max(value = 1000000, message = "Слишком большая цена") Integer price
) {}
