package com.feedback.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * US-017: participants enrolled in a program who have not submitted feedback.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DefaulterResponse {

    private String trainingProgramId;

    private String programName;

    private int enrolledCount;

    private int submittedCount;

    private int defaulterCount;

    private List<ParticipantSummary> defaulters;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ParticipantSummary {

        private String participantId;

        private String username;

        private String email;
    }
}
