package com.feedback.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * US-016: a single feedback entry enriched with the human-readable names an
 * admin needs, so the reporting UI does not have to resolve IDs itself.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeedbackResponse {

    private String id;

    private String participantId;

    private String participantName;

    private String trainingProgramId;

    private String programName;

    private String courseId;

    private String courseName;

    private Integer rating;

    private String comments;

    private LocalDateTime submittedAt;

    private LocalDateTime updatedAt;
}
