package com.komek.dto;

import com.komek.model.Category;
import com.komek.model.TaskStatus;
import java.time.LocalDateTime;

/**
 * owner = the viewer is the requester. myPrice = the viewer's own response price (if any).
 * responseCount = number of responses. rating = requester's rating of the runner (after DONE),
 * requesterRating = runner's rating of the requester (after DONE).
 * awaitingConfirmation = the runner reported "done" and the requester has not confirmed yet.
 * commission / payout = split of the current price (what the platform keeps / what the runner gets).
 * payment = null until the requester pays.
 */
public record TaskDto(Long id, String title, String description, Category category,
                      String fromLocation, String location,
                      LocalDateTime deadline, int reward, TaskStatus status, LocalDateTime createdAt,
                      boolean owner, PersonDto requester, PersonDto runner, long responseCount,
                      Integer myPrice, Integer rating, Integer requesterRating,
                      boolean awaitingConfirmation, int commissionPercent, int commission, int payout,
                      PaymentInfoDto payment) {}
