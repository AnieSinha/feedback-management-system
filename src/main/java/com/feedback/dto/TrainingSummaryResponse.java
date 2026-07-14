package com.feedback.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * US-019: one row of the training summary report — participation and feedback
 * health for a single program.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrainingSummaryResponse {

    private String trainingProgramId;

    private String programName;

    private String status;

    private LocalDate startDate;

    private LocalDate endDate;

    private int maxParticipants;

    private int enrolledCount;

    private int feedbackCount;

    private int respondentCount;

    private int defaulterCount;

    /** Percentage of enrolled participants who submitted at least one feedback. */
    private double responseRate;

    /** Average of every rating submitted for this program; 0.0 when there is none. */
    private double averageRating;
}
