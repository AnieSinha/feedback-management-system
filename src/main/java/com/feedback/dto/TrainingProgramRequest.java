package com.feedback.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class TrainingProgramRequest {

    @NotBlank(message = "Program name is required")
    private String programName;

    @NotBlank(message = "Description is required")
    private String description;

    @NotBlank(message = "Coordinator ID is required")
    private String coordinatorId;

    @NotNull(message = "Start date is required")
    private LocalDate startDate;

    @NotNull(message = "End date is required")
    @Future(message = "End date must be in the future")
    private LocalDate endDate;

    @NotNull(message = "Max participants is required")
    @Min(value = 1, message = "Max participants must be at least 1")
    private Integer maxParticipants;

    private String status; // UPCOMING, ONGOING, COMPLETED
}
