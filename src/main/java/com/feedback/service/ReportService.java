package com.feedback.service;

import com.feedback.dto.CourseAnalyticsResponse;
import com.feedback.dto.DefaulterResponse;
import com.feedback.dto.TrainingSummaryResponse;
import com.feedback.exception.ResourceNotFoundException;
import com.feedback.model.Course;
import com.feedback.model.Feedback;
import com.feedback.model.TrainingProgram;
import com.feedback.repository.CourseRepository;
import com.feedback.repository.FeedbackRepository;
import com.feedback.repository.TrainingProgramRepository;
import com.feedback.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final FeedbackRepository feedbackRepository;
    private final TrainingProgramRepository trainingProgramRepository;
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;

    // US-017: View Defaulters Report for a single training program
    public DefaulterResponse getDefaulters(String trainingProgramId) {
        TrainingProgram program = trainingProgramRepository.findById(trainingProgramId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Training program not found with id: " + trainingProgramId));

        List<String> enrolled = program.getParticipantIds() == null ? List.of() : program.getParticipantIds();

        Set<String> respondents = feedbackRepository.findByTrainingProgramId(trainingProgramId).stream()
                .map(Feedback::getParticipantId)
                .collect(Collectors.toSet());

        List<String> defaulterIds = enrolled.stream()
                .filter(participantId -> !respondents.contains(participantId))
                .toList();

        List<DefaulterResponse.ParticipantSummary> defaulters = userRepository.findAllById(defaulterIds).stream()
                .map(user -> DefaulterResponse.ParticipantSummary.builder()
                        .participantId(user.getId())
                        .username(user.getUsername())
                        .email(user.getEmail())
                        .build())
                .sorted(Comparator.comparing(DefaulterResponse.ParticipantSummary::getUsername,
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();

        return DefaulterResponse.builder()
                .trainingProgramId(program.getId())
                .programName(program.getProgramName())
                .enrolledCount(enrolled.size())
                .submittedCount(enrolled.size() - defaulterIds.size())
                .defaulterCount(defaulterIds.size())
                .defaulters(defaulters)
                .build();
    }

    // US-019: Training Summary Report across every program
    public List<TrainingSummaryResponse> getTrainingSummary() {
        Map<String, List<Feedback>> feedbackByProgram = feedbackRepository.findAll().stream()
                .collect(Collectors.groupingBy(Feedback::getTrainingProgramId));

        return trainingProgramRepository.findAll().stream()
                .map(program -> buildSummary(program, feedbackByProgram.getOrDefault(program.getId(), List.of())))
                .toList();
    }

    // US-019: Training Summary Report for one program
    public TrainingSummaryResponse getTrainingSummary(String trainingProgramId) {
        TrainingProgram program = trainingProgramRepository.findById(trainingProgramId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Training program not found with id: " + trainingProgramId));

        return buildSummary(program, feedbackRepository.findByTrainingProgramId(trainingProgramId));
    }

    private TrainingSummaryResponse buildSummary(TrainingProgram program, List<Feedback> feedbacks) {
        int enrolledCount = program.getParticipantIds() == null ? 0 : program.getParticipantIds().size();

        long respondentCount = feedbacks.stream()
                .map(Feedback::getParticipantId)
                .distinct()
                .count();

        double averageRating = feedbacks.stream()
                .mapToInt(Feedback::getRating)
                .average()
                .orElse(0.0);

        double responseRate = enrolledCount == 0 ? 0.0 : (respondentCount * 100.0) / enrolledCount;

        return TrainingSummaryResponse.builder()
                .trainingProgramId(program.getId())
                .programName(program.getProgramName())
                .status(program.getStatus())
                .startDate(program.getStartDate())
                .endDate(program.getEndDate())
                .maxParticipants(program.getMaxParticipants() == null ? 0 : program.getMaxParticipants())
                .enrolledCount(enrolledCount)
                .feedbackCount(feedbacks.size())
                .respondentCount((int) respondentCount)
                .defaulterCount(enrolledCount - (int) respondentCount)
                .responseRate(round(responseRate))
                .averageRating(round(averageRating))
                .build();
    }

    // US-020: Course Feedback Analytics for every course
    public List<CourseAnalyticsResponse> getCourseAnalytics() {
        Map<String, List<Feedback>> feedbackByCourse = feedbackRepository.findAll().stream()
                .collect(Collectors.groupingBy(Feedback::getCourseId));

        return courseRepository.findAll().stream()
                .map(course -> buildAnalytics(course, feedbackByCourse.getOrDefault(course.getId(), List.of())))
                .toList();
    }

    // US-020: Course Feedback Analytics for one course
    public CourseAnalyticsResponse getCourseAnalytics(String courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found with id: " + courseId));

        return buildAnalytics(course, feedbackRepository.findByCourseId(courseId));
    }

    private CourseAnalyticsResponse buildAnalytics(Course course, List<Feedback> feedbacks) {
        Map<Integer, Long> countsByRating = feedbacks.stream()
                .collect(Collectors.groupingBy(Feedback::getRating, Collectors.counting()));

        // Always report all five buckets so a chart has a stable x-axis.
        Map<Integer, Long> distribution = new LinkedHashMap<>();
        for (int rating = 1; rating <= 5; rating++) {
            distribution.put(rating, countsByRating.getOrDefault(rating, 0L));
        }

        double averageRating = feedbacks.stream().mapToInt(Feedback::getRating).average().orElse(0.0);

        long satisfied = feedbacks.stream().filter(feedback -> feedback.getRating() >= 4).count();
        double satisfactionRate = feedbacks.isEmpty() ? 0.0 : (satisfied * 100.0) / feedbacks.size();

        return CourseAnalyticsResponse.builder()
                .courseId(course.getId())
                .courseName(course.getCourseName())
                .totalFeedback(feedbacks.size())
                .averageRating(round(averageRating))
                .highestRating(feedbacks.stream().map(Feedback::getRating).max(Integer::compareTo).orElse(null))
                .lowestRating(feedbacks.stream().map(Feedback::getRating).min(Integer::compareTo).orElse(null))
                .ratingDistribution(distribution)
                .satisfactionRate(round(satisfactionRate))
                .build();
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
