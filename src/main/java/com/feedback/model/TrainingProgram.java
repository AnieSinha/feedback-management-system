package com.feedback.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "training_programs")
public class TrainingProgram {

    @Id
    private String id;

    private String programName;

    private String description;

    private String coordinatorId;

    private LocalDate startDate;

    private LocalDate endDate;

    private Integer maxParticipants;

    private String status; // e.g., UPCOMING, ONGOING, COMPLETED

    @Builder.Default
    private List<String> participantIds = new ArrayList<>();
}
