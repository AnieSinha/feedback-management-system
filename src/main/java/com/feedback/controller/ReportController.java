package com.feedback.controller;

import com.feedback.dto.CourseAnalyticsResponse;
import com.feedback.dto.DefaulterResponse;
import com.feedback.dto.TrainingSummaryResponse;
import com.feedback.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    // US-017: View Defaulters Report — ADMIN or COORDINATOR
    @GetMapping("/defaulters/{trainingProgramId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'COORDINATOR')")
    public ResponseEntity<DefaulterResponse> getDefaulters(@PathVariable String trainingProgramId) {
        return ResponseEntity.ok(reportService.getDefaulters(trainingProgramId));
    }

    // US-019: Training Summary Report for all programs — ADMIN only
    @GetMapping("/training-summary")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<TrainingSummaryResponse>> getTrainingSummary() {
        return ResponseEntity.ok(reportService.getTrainingSummary());
    }

    // US-019: Training Summary Report for one program — ADMIN or COORDINATOR
    @GetMapping("/training-summary/{trainingProgramId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'COORDINATOR')")
    public ResponseEntity<TrainingSummaryResponse> getTrainingSummary(@PathVariable String trainingProgramId) {
        return ResponseEntity.ok(reportService.getTrainingSummary(trainingProgramId));
    }

    // US-020: Course Feedback Analytics for all courses — ADMIN only
    @GetMapping("/course-analytics")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<CourseAnalyticsResponse>> getCourseAnalytics() {
        return ResponseEntity.ok(reportService.getCourseAnalytics());
    }

    // US-020: Course Feedback Analytics for one course — ADMIN only
    @GetMapping("/course-analytics/{courseId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CourseAnalyticsResponse> getCourseAnalytics(@PathVariable String courseId) {
        return ResponseEntity.ok(reportService.getCourseAnalytics(courseId));
    }
}
