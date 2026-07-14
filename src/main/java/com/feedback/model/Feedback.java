package com.feedback.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "feedbacks")
public class Feedback {

    @Id
    private String id;

    private String participantId;

    private String trainingProgramId;

    private String courseId;

    private Integer rating; // 1-5

    private String comments;

    private LocalDateTime submittedAt;

    private LocalDateTime updatedAt;
}
