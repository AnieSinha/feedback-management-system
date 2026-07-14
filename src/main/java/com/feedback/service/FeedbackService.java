package com.feedback.service;

import com.feedback.dto.FeedbackRequest;
import com.feedback.dto.FeedbackResponse;
import com.feedback.exception.FeedbackAlreadySubmittedException;
import com.feedback.exception.ResourceNotFoundException;
import com.feedback.model.Course;
import com.feedback.model.Feedback;
import com.feedback.model.TrainingProgram;
import com.feedback.model.User;
import com.feedback.repository.CourseRepository;
import com.feedback.repository.FeedbackRepository;
import com.feedback.repository.TrainingProgramRepository;
import com.feedback.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FeedbackService {

    private final FeedbackRepository feedbackRepository;
    private final TrainingProgramRepository trainingProgramRepository;
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;

    // US-015: Submit Feedback — the participant is taken from the JWT, never the body
    public FeedbackResponse submitFeedback(FeedbackRequest request, String participantEmail) {
        User participant = findUserByEmail(participantEmail);

        TrainingProgram program = trainingProgramRepository.findById(request.getTrainingProgramId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Training program not found with id: " + request.getTrainingProgramId()));

        Course course = courseRepository.findById(request.getCourseId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Course not found with id: " + request.getCourseId()));

        if (program.getParticipantIds() == null || !program.getParticipantIds().contains(participant.getId())) {
            throw new AccessDeniedException("You are not enrolled in training program: " + program.getProgramName());
        }

        boolean alreadySubmitted = feedbackRepository.existsByParticipantIdAndTrainingProgramIdAndCourseId(
                participant.getId(), request.getTrainingProgramId(), request.getCourseId());
        if (alreadySubmitted) {
            throw new FeedbackAlreadySubmittedException(
                    "Feedback already submitted for this course in this training program");
        }

        Feedback feedback = Feedback.builder()
                .participantId(participant.getId())
                .trainingProgramId(request.getTrainingProgramId())
                .courseId(request.getCourseId())
                .rating(request.getRating())
                .comments(request.getComments())
                .submittedAt(LocalDateTime.now())
                .build();

        return toResponse(feedbackRepository.save(feedback), participant, program, course);
    }

    // US-018: Update Feedback — a participant may revise only their own entry
    public FeedbackResponse updateFeedback(String id, FeedbackRequest request, String participantEmail) {
        User participant = findUserByEmail(participantEmail);
        Feedback feedback = findFeedbackById(id);

        if (!feedback.getParticipantId().equals(participant.getId())) {
            throw new AccessDeniedException("You can only update your own feedback");
        }

        // The program and course a feedback belongs to are fixed at submission time.
        feedback.setRating(request.getRating());
        feedback.setComments(request.getComments());
        feedback.setUpdatedAt(LocalDateTime.now());

        return toResponse(feedbackRepository.save(feedback));
    }

    // US-015: a participant reviews what they have already submitted
    public List<FeedbackResponse> getMyFeedback(String participantEmail) {
        User participant = findUserByEmail(participantEmail);
        return toResponses(feedbackRepository.findByParticipantId(participant.getId()));
    }

    public FeedbackResponse getFeedbackById(String id) {
        return toResponse(findFeedbackById(id));
    }

    // US-016: View Feedback Reports, optionally narrowed to a program and/or course
    public List<FeedbackResponse> getFeedback(String trainingProgramId, String courseId) {
        List<Feedback> feedbacks;

        if (trainingProgramId != null && courseId != null) {
            feedbacks = feedbackRepository.findByTrainingProgramIdAndCourseId(trainingProgramId, courseId);
        } else if (trainingProgramId != null) {
            feedbacks = feedbackRepository.findByTrainingProgramId(trainingProgramId);
        } else if (courseId != null) {
            feedbacks = feedbackRepository.findByCourseId(courseId);
        } else {
            feedbacks = feedbackRepository.findAll();
        }

        return toResponses(feedbacks);
    }

    public void deleteFeedback(String id) {
        if (!feedbackRepository.existsById(id)) {
            throw new ResourceNotFoundException("Feedback not found with id: " + id);
        }
        feedbackRepository.deleteById(id);
    }

    private Feedback findFeedbackById(String id) {
        return feedbackRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback not found with id: " + id));
    }

    private User findUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));
    }

    private FeedbackResponse toResponse(Feedback feedback) {
        return toResponses(List.of(feedback)).get(0);
    }

    private FeedbackResponse toResponse(Feedback feedback, User participant, TrainingProgram program, Course course) {
        return FeedbackResponse.builder()
                .id(feedback.getId())
                .participantId(feedback.getParticipantId())
                .participantName(participant != null ? participant.getUsername() : null)
                .trainingProgramId(feedback.getTrainingProgramId())
                .programName(program != null ? program.getProgramName() : null)
                .courseId(feedback.getCourseId())
                .courseName(course != null ? course.getCourseName() : null)
                .rating(feedback.getRating())
                .comments(feedback.getComments())
                .submittedAt(feedback.getSubmittedAt())
                .updatedAt(feedback.getUpdatedAt())
                .build();
    }

    /**
     * Resolves participant, program and course names for a batch of feedback in three
     * queries rather than three per row.
     */
    private List<FeedbackResponse> toResponses(List<Feedback> feedbacks) {
        if (feedbacks.isEmpty()) {
            return List.of();
        }

        Map<String, User> users = userRepository.findAllById(feedbacks.stream()
                .map(Feedback::getParticipantId).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(User::getId, Function.identity()));
        Map<String, TrainingProgram> programs = trainingProgramRepository.findAllById(feedbacks.stream()
                .map(Feedback::getTrainingProgramId).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(TrainingProgram::getId, Function.identity()));
        Map<String, Course> courses = courseRepository.findAllById(feedbacks.stream()
                .map(Feedback::getCourseId).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(Course::getId, Function.identity()));

        return feedbacks.stream()
                .map(feedback -> toResponse(
                        feedback,
                        users.get(feedback.getParticipantId()),
                        programs.get(feedback.getTrainingProgramId()),
                        courses.get(feedback.getCourseId())))
                .toList();
    }
}
