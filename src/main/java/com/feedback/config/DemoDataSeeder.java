package com.feedback.config;

import com.feedback.model.Course;
import com.feedback.model.Faculty;
import com.feedback.model.Feedback;
import com.feedback.model.Role;
import com.feedback.model.TrainingProgram;
import com.feedback.model.User;
import com.feedback.repository.CourseRepository;
import com.feedback.repository.FacultyRepository;
import com.feedback.repository.FeedbackRepository;
import com.feedback.repository.TrainingProgramRepository;
import com.feedback.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Populates a demo dataset so the dashboard and analytics are not empty on first run.
 * Off unless app.seed-demo-data=true, and it never touches a database that already has users.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "app.seed-demo-data", havingValue = "true")
@RequiredArgsConstructor
public class DemoDataSeeder implements CommandLineRunner {

    private static final String DEMO_PASSWORD = "password123";

    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final FacultyRepository facultyRepository;
    private final TrainingProgramRepository trainingProgramRepository;
    private final FeedbackRepository feedbackRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (userRepository.count() > 0) {
            log.info("Demo data already present, skipping seed.");
            return;
        }

        User admin = saveUser("admin", "admin@demo.com", Role.ADMIN);
        User coordinator = saveUser("coordinator", "coordinator@demo.com", Role.COORDINATOR);
        User alice = saveUser("Alice Kumar", "alice@demo.com", Role.PARTICIPANT);
        User bob = saveUser("Bob Sharma", "bob@demo.com", Role.PARTICIPANT);
        User chitra = saveUser("Chitra Rao", "chitra@demo.com", Role.PARTICIPANT);
        User dev = saveUser("Dev Patel", "dev@demo.com", Role.PARTICIPANT);

        facultyRepository.saveAll(List.of(
                Faculty.builder().facultyName("Dr. Meera Iyer").email("meera@demo.com")
                        .department("Computer Science").experience(12).build(),
                Faculty.builder().facultyName("Prof. Arjun Nair").email("arjun@demo.com")
                        .department("Information Technology").experience(8).build()));

        Course springBoot = saveCourse("Spring Boot Fundamentals", "REST APIs, dependency injection, data access", 40);
        Course java = saveCourse("Core Java", "OOP, collections, streams, concurrency", 60);
        Course mongo = saveCourse("MongoDB Essentials", "Documents, indexes, aggregation pipelines", 24);

        TrainingProgram bootcamp = trainingProgramRepository.save(TrainingProgram.builder()
                .programName("Java Backend Bootcamp")
                .description("Twelve week intensive backend engineering program")
                .coordinatorId(coordinator.getId())
                .startDate(LocalDate.now().minusWeeks(6))
                .endDate(LocalDate.now().plusWeeks(6))
                .maxParticipants(20)
                .status("ONGOING")
                .participantIds(new ArrayList<>(List.of(alice.getId(), bob.getId(), chitra.getId(), dev.getId())))
                .build());

        TrainingProgram dataTrack = trainingProgramRepository.save(TrainingProgram.builder()
                .programName("Data Engineering Track")
                .description("Databases and pipelines for backend engineers")
                .coordinatorId(coordinator.getId())
                .startDate(LocalDate.now().plusWeeks(2))
                .endDate(LocalDate.now().plusWeeks(14))
                .maxParticipants(15)
                .status("UPCOMING")
                .participantIds(new ArrayList<>(List.of(alice.getId(), bob.getId())))
                .build());

        // Alice, Bob and Chitra responded; Dev is a defaulter so the report has something to show.
        feedbackRepository.saveAll(List.of(
                feedback(alice, bootcamp, springBoot, 5, "Clear explanations and great hands-on labs."),
                feedback(bob, bootcamp, springBoot, 4, "Solid content, wanted more time on security."),
                feedback(chitra, bootcamp, springBoot, 2, "Paced too fast for beginners."),
                feedback(alice, bootcamp, java, 5, "The streams module was excellent."),
                feedback(bob, bootcamp, java, 3, "Good, but the concurrency section was rushed."),
                feedback(chitra, bootcamp, mongo, 4, "Aggregation pipelines finally clicked."),
                feedback(alice, dataTrack, mongo, 5, "Best database course I have taken.")));

        log.info("""

                ================= DEMO DATA SEEDED =================
                  UI:      http://localhost:8080
                  Login with password '{}' as any of:
                    admin@demo.com        (ADMIN)
                    coordinator@demo.com  (COORDINATOR)
                    alice@demo.com        (PARTICIPANT, has submitted feedback)
                    dev@demo.com          (PARTICIPANT, a defaulter)
                ===================================================
                """, DEMO_PASSWORD);
    }

    private User saveUser(String username, String email, Role role) {
        return userRepository.save(User.builder()
                .username(username)
                .email(email)
                .password(passwordEncoder.encode(DEMO_PASSWORD))
                .role(role)
                .build());
    }

    private Course saveCourse(String name, String description, int duration) {
        return courseRepository.save(Course.builder()
                .courseName(name)
                .description(description)
                .duration(duration)
                .build());
    }

    private Feedback feedback(User participant, TrainingProgram program, Course course, int rating, String comments) {
        return Feedback.builder()
                .participantId(participant.getId())
                .trainingProgramId(program.getId())
                .courseId(course.getId())
                .rating(rating)
                .comments(comments)
                .submittedAt(LocalDateTime.now().minusDays(rating))
                .build();
    }
}
