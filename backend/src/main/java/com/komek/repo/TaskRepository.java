package com.komek.repo;

import com.komek.model.Category;
import com.komek.model.Task;
import com.komek.model.TaskStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface TaskRepository extends JpaRepository<Task, Long> {

    List<Task> findByRequesterIdAndStatusInOrderByUpdatedAtDesc(Long requesterId, Collection<TaskStatus> statuses);

    List<Task> findByRunnerIdAndStatusInOrderByUpdatedAtDesc(Long runnerId, Collection<TaskStatus> statuses);

    long countByRunnerIdAndStatus(Long runnerId, TaskStatus status);

    /** Row lock for actions that move money (pay, confirm, cancel). */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from Task t where t.id = :id")
    Optional<Task> lockById(@Param("id") Long id);

    /** Feed for runners: open, not mine, deadline not passed, optional category + text search. */
    @Query("""
            select t from Task t
            where t.status = :status and t.requester.id <> :uid and t.deadline > :now
              and t.category in :cats
              and (lower(t.title) like :q or lower(t.location) like :q or lower(t.description) like :q
                   or lower(coalesce(t.fromLocation, '')) like :q)
            order by t.createdAt desc
            """)
    List<Task> feed(@Param("status") TaskStatus status, @Param("uid") Long uid,
                    @Param("now") LocalDateTime now, @Param("cats") Collection<Category> cats,
                    @Param("q") String q);

    /** One row: [average rating, number of ratings] of the tasks this user performed (rated by requesters). */
    @Query("select avg(t.rating), count(t.rating) from Task t where t.runner.id = :uid and t.rating is not null")
    List<Object[]> ratingStats(@Param("uid") Long uid);

    /** One row: [average rating, number of ratings] this user got as a requester (rated by runners). */
    @Query("select avg(t.requesterRating), count(t.requesterRating) from Task t "
            + "where t.requester.id = :uid and t.requesterRating is not null")
    List<Object[]> requesterRatingStats(@Param("uid") Long uid);
}
