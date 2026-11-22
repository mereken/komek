package com.komek.dto;

/** ok = false means the bank declined the payment (the order stays unpaid, the requester can try again). */
public record PayResult(boolean ok, String message, TaskDto task) {}
