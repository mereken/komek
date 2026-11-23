package com.komek.repo;

import com.komek.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findTop50ByUserIdOrderByIdDesc(Long userId);

    long countByUserIdAndAreaAndReadAtIsNull(Long userId, String area);

    long countByUserIdAndReadAtIsNull(Long userId);

    long countByUserIdAndTaskIdAndReadAtIsNull(Long userId, Long taskId);

    /** Orders / tasks that have something new for the user in this area. */
    @Query("select distinct n.task.id from Notification n "
            + "where n.user.id = :uid and n.area = :area and n.readAt is null and n.task is not null")
    List<Long> unreadTaskIds(@Param("uid") Long uid, @Param("area") String area);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update Notification n set n.readAt = :now where n.user.id = :uid and n.readAt is null")
    int markAllRead(@Param("uid") Long uid, @Param("now") LocalDateTime now);

    /** Opening an order marks its order/task notifications as read (wallet ones are read in the wallet). */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update Notification n set n.readAt = :now "
            + "where n.user.id = :uid and n.task.id = :taskId and n.area <> 'PROFILE' and n.readAt is null")
    int markTaskRead(@Param("uid") Long uid, @Param("taskId") Long taskId, @Param("now") LocalDateTime now);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update Notification n set n.readAt = :now where n.user.id = :uid and n.area = :area and n.readAt is null")
    int markAreaRead(@Param("uid") Long uid, @Param("area") String area, @Param("now") LocalDateTime now);
}
