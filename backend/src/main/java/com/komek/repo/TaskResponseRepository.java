package com.komek.repo;

import com.komek.model.TaskResponse;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TaskResponseRepository extends JpaRepository<TaskResponse, Long> {
    List<TaskResponse> findByTaskId(Long taskId);
    Optional<TaskResponse> findByTaskIdAndRunnerId(Long taskId, Long runnerId);
    long countByTaskId(Long taskId);
    List<TaskResponse> findByRunnerIdOrderByCreatedAtDesc(Long runnerId);
}
