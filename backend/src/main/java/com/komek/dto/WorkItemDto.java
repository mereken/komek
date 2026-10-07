package com.komek.dto;

/** One row of the runner's "Задания" list: either an assigned task or a response of mine. */
public record WorkItemDto(TaskDto task, Integer myPrice, boolean response) {}
