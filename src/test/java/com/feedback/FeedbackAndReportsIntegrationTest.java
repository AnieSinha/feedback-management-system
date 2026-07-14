package com.feedback;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.feedback.model.Role;
import com.feedback.repository.CourseRepository;
import com.feedback.repository.FeedbackRepository;
import com.feedback.repository.TrainingProgramRepository;
import com.feedback.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Drives US-015 through US-020 over real HTTP against an embedded MongoDB,
 * using real JWTs issued by /auth/login.
 */
@SpringBootTest
@AutoConfigureMockMvc
class FeedbackAndReportsIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private TrainingProgramRepository trainingProgramRepository;

    @Autowired
    private FeedbackRepository feedbackRepository;

    private String adminToken;
    private String coordinatorToken;
    private String aliceToken;
    private String bobToken;

    private String aliceId;
    private String bobId;
    private String programId;
    private String courseId;

    @BeforeEach
    void setUp() throws Exception {
        feedbackRepository.deleteAll();
        trainingProgramRepository.deleteAll();
        courseRepository.deleteAll();
        userRepository.deleteAll();

        adminToken = register("admin", "admin@test.com", Role.ADMIN);
        coordinatorToken = register("coord", "coord@test.com", Role.COORDINATOR);
        aliceToken = register("alice", "alice@test.com", Role.PARTICIPANT);
        bobToken = register("bob", "bob@test.com", Role.PARTICIPANT);

        aliceId = userRepository.findByEmail("alice@test.com").orElseThrow().getId();
        bobId = userRepository.findByEmail("bob@test.com").orElseThrow().getId();

        courseId = json(mockMvc.perform(post("/course")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                        "courseName", "Spring Boot",
                        "description", "Backend fundamentals",
                        "duration", 40))))
                .andExpect(status().isCreated())
                .andReturn()).get("id").asText();

        programId = json(mockMvc.perform(post("/training-programs")
                .header("Authorization", "Bearer " + coordinatorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                        "programName", "Java Bootcamp",
                        "description", "12 week program",
                        "coordinatorId", "coord-1",
                        "startDate", "2026-01-01",
                        "endDate", "2027-01-01",
                        "maxParticipants", 10))))
                .andExpect(status().isCreated())
                .andReturn()).get("id").asText();

        // US-017: both participants are enrolled; only Alice will submit feedback.
        enroll(aliceId);
        enroll(bobId);
    }

    @Test
    void participantSubmitsFeedbackAndAdminSeesItInReports() throws Exception {
        // US-015
        String feedbackId = json(mockMvc.perform(post("/feedback")
                .header("Authorization", "Bearer " + aliceToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(feedbackBody(5, "Excellent course")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.rating").value(5))
                .andExpect(jsonPath("$.participantName").value("alice"))
                .andExpect(jsonPath("$.courseName").value("Spring Boot"))
                .andExpect(jsonPath("$.programName").value("Java Bootcamp"))
                .andReturn()).get("id").asText();

        assertThat(feedbackRepository.findById(feedbackId)).isPresent();

        // US-016: admin reads the feedback report
        mockMvc.perform(get("/feedback").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].comments").value("Excellent course"));

        // US-016: filtered by program and course
        mockMvc.perform(get("/feedback")
                .param("trainingProgramId", programId)
                .param("courseId", courseId)
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void duplicateFeedbackForSameCourseIsRejected() throws Exception {
        submitAsAlice(4, "Good");

        mockMvc.perform(post("/feedback")
                .header("Authorization", "Bearer " + aliceToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(feedbackBody(2, "Changed my mind")))
                .andExpect(status().isConflict());
    }

    @Test
    void unenrolledParticipantCannotSubmitFeedback() throws Exception {
        mockMvc.perform(delete("/training-programs/" + programId + "/participants/" + bobId)
                .header("Authorization", "Bearer " + coordinatorToken))
                .andExpect(status().isOk());

        mockMvc.perform(post("/feedback")
                .header("Authorization", "Bearer " + bobToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(feedbackBody(3, "Not enrolled")))
                .andExpect(status().isForbidden());
    }

    @Test
    void ratingOutsideOneToFiveIsRejected() throws Exception {
        mockMvc.perform(post("/feedback")
                .header("Authorization", "Bearer " + aliceToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(feedbackBody(6, "Too high")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void participantUpdatesOwnFeedbackButNotSomeoneElses() throws Exception {
        String feedbackId = submitAsAlice(2, "Confusing at first");

        // US-018: the author revises their own entry
        mockMvc.perform(put("/feedback/" + feedbackId)
                .header("Authorization", "Bearer " + aliceToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(feedbackBody(5, "Made sense after week 2")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rating").value(5))
                .andExpect(jsonPath("$.comments").value("Made sense after week 2"))
                .andExpect(jsonPath("$.updatedAt").exists());

        // US-018: Bob may not touch Alice's feedback
        mockMvc.perform(put("/feedback/" + feedbackId)
                .header("Authorization", "Bearer " + bobToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(feedbackBody(1, "Sabotage")))
                .andExpect(status().isForbidden());

        assertThat(feedbackRepository.findById(feedbackId).orElseThrow().getRating()).isEqualTo(5);
    }

    @Test
    void defaultersReportListsEnrolledParticipantsWhoDidNotSubmit() throws Exception {
        submitAsAlice(4, "Solid");

        // US-017: Alice submitted, Bob did not
        mockMvc.perform(get("/reports/defaulters/" + programId)
                .header("Authorization", "Bearer " + coordinatorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enrolledCount").value(2))
                .andExpect(jsonPath("$.submittedCount").value(1))
                .andExpect(jsonPath("$.defaulterCount").value(1))
                .andExpect(jsonPath("$.defaulters.length()").value(1))
                .andExpect(jsonPath("$.defaulters[0].username").value("bob"))
                .andExpect(jsonPath("$.defaulters[0].email").value("bob@test.com"));
    }

    @Test
    void trainingSummaryReportsResponseRateAndAverageRating() throws Exception {
        submitAsAlice(4, "Solid");

        // US-019: 1 of 2 enrolled responded -> 50% response rate, avg 4.0
        mockMvc.perform(get("/reports/training-summary")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].programName").value("Java Bootcamp"))
                .andExpect(jsonPath("$[0].enrolledCount").value(2))
                .andExpect(jsonPath("$[0].respondentCount").value(1))
                .andExpect(jsonPath("$[0].defaulterCount").value(1))
                .andExpect(jsonPath("$[0].responseRate").value(50.0))
                .andExpect(jsonPath("$[0].averageRating").value(4.0));
    }

    @Test
    void courseAnalyticsAggregatesRatings() throws Exception {
        submitAsAlice(5, "Great");
        submitAsBob(2, "Too fast");

        // US-020: avg (5+2)/2 = 3.5, one of two ratings is >= 4 -> 50% satisfaction
        mockMvc.perform(get("/reports/course-analytics/" + courseId)
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.courseName").value("Spring Boot"))
                .andExpect(jsonPath("$.totalFeedback").value(2))
                .andExpect(jsonPath("$.averageRating").value(3.5))
                .andExpect(jsonPath("$.highestRating").value(5))
                .andExpect(jsonPath("$.lowestRating").value(2))
                .andExpect(jsonPath("$.satisfactionRate").value(50.0))
                .andExpect(jsonPath("$.ratingDistribution.2").value(1))
                .andExpect(jsonPath("$.ratingDistribution.5").value(1))
                .andExpect(jsonPath("$.ratingDistribution.3").value(0));
    }

    @Test
    void courseAnalyticsHandlesCourseWithNoFeedback() throws Exception {
        mockMvc.perform(get("/reports/course-analytics/" + courseId)
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalFeedback").value(0))
                .andExpect(jsonPath("$.averageRating").value(0.0))
                .andExpect(jsonPath("$.satisfactionRate").value(0.0))
                .andExpect(jsonPath("$.highestRating").doesNotExist());
    }

    @Test
    void participantCannotReadFeedbackReports() throws Exception {
        mockMvc.perform(get("/feedback").header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/reports/training-summary").header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/reports/course-analytics").header("Authorization", "Bearer " + coordinatorToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void reportsRejectUnauthenticatedCallers() throws Exception {
        mockMvc.perform(get("/reports/training-summary")).andExpect(status().isForbidden());
        mockMvc.perform(get("/feedback")).andExpect(status().isForbidden());
    }

    @Test
    void unknownProgramInDefaultersReportReturnsNotFound() throws Exception {
        mockMvc.perform(get("/reports/defaulters/does-not-exist")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNotFound());
    }

    // ---- helpers ----

    private String register(String username, String email, Role role) throws Exception {
        MvcResult result = mockMvc.perform(post("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                        "username", username,
                        "email", email,
                        "password", "password123",
                        "role", role.name()))))
                .andExpect(status().isOk())
                .andReturn();
        return json(result).get("token").asText();
    }

    private void enroll(String participantId) throws Exception {
        mockMvc.perform(post("/training-programs/" + programId + "/participants/" + participantId)
                .header("Authorization", "Bearer " + coordinatorToken))
                .andExpect(status().isOk());
    }

    private String feedbackBody(int rating, String comments) throws Exception {
        return objectMapper.writeValueAsString(Map.of(
                "trainingProgramId", programId,
                "courseId", courseId,
                "rating", rating,
                "comments", comments));
    }

    private String submitAsAlice(int rating, String comments) throws Exception {
        return submit(aliceToken, rating, comments);
    }

    private String submitAsBob(int rating, String comments) throws Exception {
        return submit(bobToken, rating, comments);
    }

    private String submit(String token, int rating, String comments) throws Exception {
        return json(mockMvc.perform(post("/feedback")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(feedbackBody(rating, comments)))
                .andExpect(status().isCreated())
                .andReturn()).get("id").asText();
    }

    private JsonNode json(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }
}
