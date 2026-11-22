package com.komek.model;

/** PAID = money is reserved for the order. RELEASED = paid out to the runner. REFUNDED = returned to the requester. */
public enum PaymentStatus { PAID, RELEASED, REFUNDED, FAILED }
