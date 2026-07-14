package com.feedback.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * US-020: aggregated feedback analytics for a single course.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseAnalyticsResponse {

    private String courseId;

    private String courseName;

    private int totalFeedback;

    private double averageRating;

    private Integer highestRating;

    private Integer lowestRating;

    /** Rating value (1-5) to the number of times it was given. */
    private Map<Integer, Long> ratingDistribution;

    /** Share of ratings that are 4 or 5, as a percentage. */
    private double satisfactionRate;
}
