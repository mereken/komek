package com.komek.dto;

/** Numbers for the tab bar. orders/tasks = how many orders/tasks need attention (news or a rating to give). */
public record NotifSummary(long orders, long tasks, long profile, long unread) {}
