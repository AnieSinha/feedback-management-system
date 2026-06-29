package com.feedback.controller;

import com.feedback.dto.TrainingProgramRequest;
import com.feedback.model.TrainingProgram;
import com.feedback.service.TrainingProgramService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/training-programs")
@RequiredArgsConstructor
public class TrainingProgramController {

    private final TrainingProgramService trainingProgramService;

    // US-011: Create Training Program — COORDINATOR or ADMIN
    @PostMapping
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    public ResponseEntity<TrainingProgram> createProgram(
            @Valid @RequestBody TrainingProgramRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(trainingProgramService.createProgram(request));
    }

    // US-014: View all Training Programs — any authenticated user
    @GetMapping
    public ResponseEntity<List<TrainingProgram>> getAllPrograms() {
        return ResponseEntity.ok(trainingProgramService.getAllPrograms());
    }

    // US-014: View Training Program by ID — any authenticated user
    @GetMapping("/{id}")
    public ResponseEntity<TrainingProgram> getProgramById(@PathVariable String id) {
        return ResponseEntity.ok(trainingProgramService.getProgramById(id));
    }

    // US-014: View Training Programs by Coordinator — any authenticated user
    @GetMapping("/coordinator/{coordinatorId}")
    public ResponseEntity<List<TrainingProgram>> getProgramsByCoordinator(
            @PathVariable String coordinatorId) {
        return ResponseEntity.ok(trainingProgramService.getProgramsByCoordinator(coordinatorId));
    }

    // US-012: Modify Training Program — COORDINATOR or ADMIN
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    public ResponseEntity<TrainingProgram> updateProgram(
            @PathVariable String id,
            @Valid @RequestBody TrainingProgramRequest request) {
        return ResponseEntity.ok(trainingProgramService.updateProgram(id, request));
    }

    // US-013: Delete Training Program — COORDINATOR or ADMIN
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    public ResponseEntity<Void> deleteProgram(@PathVariable String id) {
        trainingProgramService.deleteProgram(id);
        return ResponseEntity.noContent().build();
    }
}
