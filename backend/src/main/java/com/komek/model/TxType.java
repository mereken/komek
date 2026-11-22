package com.komek.model;

/** Wallet history rows. TOPUP/REFUND/PAYOUT add points, WITHDRAWAL/PAYMENT subtract them. */
public enum TxType { TOPUP, WITHDRAWAL, PAYMENT, REFUND, PAYOUT }
