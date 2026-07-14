package com.feedback.controller;

import com.feedback.dto.FeedbackRequest;
import com.feedback.dto.FeedbackResponse;
import com.feedback.service.FeedbackService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
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
@RequestMapping("/feedback")
@RequiredArgsConstructor
public class FeedbackController {

    private final FeedbackService feedbackService;

    // US-015: Submit Feedback — PARTICIPANT only
    @PostMapping
    @PreAuthorize("hasRole('PARTICIPANT')")
    public ResponseEntity<FeedbackResponse> submitFeedback(
            @Valid @RequestBody FeedbackRequest request,
            Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(feedbackService.submitFeedback(request, authentication.getName()));
    }

    // US-015: a participant reviews their own submissions
    @GetMapping("/my")
    @PreAuthorize("hasRole('PARTICIPANT')")
    public ResponseEntity<List<FeedbackResponse>> getMyFeedback(Authentication authentication) {
        return ResponseEntity.ok(feedbackService.getMyFeedback(authentication.getName()));
    }

    // US-018: Update Feedback — the author may revise only their own entry
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('PARTICIPANT')")
    public ResponseEntity<FeedbackResponse> updateFeedback(
            @PathVariable String id,
            @Valid @RequestBody FeedbackRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(feedbackService.updateFeedback(id, request, authentication.getName()));
    }

    // US-016: View Feedback Reports — ADMIN or COORDINATOR
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'COORDINATOR')")
    public ResponseEntity<List<FeedbackResponse>> getFeedback(
            @RequestParam(required = false) String trainingProgramId,
            @RequestParam(required = false) String courseId) {
        return ResponseEntity.ok(feedbackService.getFeedback(trainingProgramId, courseId));
    }

    // US-016: View a single feedback entry — ADMIN or COORDINATOR
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'COORDINATOR')")
    public ResponseEntity<FeedbackResponse> getFeedbackById(@PathVariable String id) {
        return ResponseEntity.ok(feedbackService.getFeedbackById(id));
    }

    // Housekeeping for moderation — ADMIN only
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteFeedback(@PathVariable String id) {
        feedbackService.deleteFeedback(id);
        return ResponseEntity.noContent().build();
    }
}
