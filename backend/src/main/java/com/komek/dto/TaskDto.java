package com.komek.dto;

import com.komek.model.Category;
import com.komek.model.TaskStatus;
import java.time.LocalDateTime;

/**
 * owner = the viewer is the requester. myPrice = the viewer's own response price (if any).
 * responseCount = number of responses. rating = requester's rating of the runner (after DONE).
 */
public record TaskDto(Long id, String title, String description, Category category, String location,
                      LocalDateTime deadline, int reward, TaskStatus status, LocalDateTime createdAt,
                      boolean owner, PersonDto requester, PersonDto runner, long responseCount,
                      Integer myPrice, Integer rating) {}
