package com.komek.dto;

import com.komek.model.Category;
import com.komek.model.TaskStatus;
import java.time.LocalDateTime;

/**
 * owner = the viewer is the requester. myPrice = the viewer's own response price (if any).
 * Addresses: fromLocation is the first point (pickup / shop), location is the main or last point.
 * fromDetails / locationDetails (entrance, floor, ...) are filled only for the requester and the chosen runner.
 * startAt: optional start of a time window; deadline is the end of the window or the "do it by" time.
 * budget = money the runner must spend (a purchase); it is handed over as an advance when the work starts.
 * allowOffers = runners may propose their own price; false = fixed price.
 * changedSinceResponse = the viewer responded earlier and the order was edited after that.
 * updates = notifications about this order the viewer has not seen yet.
 * rating = requester's rating of the runner, requesterRating = runner's rating of the requester.
 * awaitingConfirmation = the runner reported "done", the requester has not confirmed yet.
 * commission / payout = split of the reward (what the platform keeps / what the runner earns).
 */
public record TaskDto(Long id, String title, String description, Category category,
                      String fromLocation, String fromDetails, String location, String locationDetails,
                      LocalDateTime startAt, LocalDateTime deadline, int reward, int budget, boolean allowOffers,
                      TaskStatus status, LocalDateTime createdAt,
                      boolean owner, PersonDto requester, PersonDto runner, long responseCount,
                      Integer myPrice, Integer rating, Integer requesterRating,
                      boolean awaitingConfirmation, int commissionPercent, int commission, int payout,
                      PaymentInfoDto payment,
                      boolean changedSinceResponse, String lastChange, LocalDateTime editedAt, long updates) {}
