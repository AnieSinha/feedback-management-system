package com.feedback.repository;

import com.feedback.model.Feedback;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FeedbackRepository extends MongoRepository<Feedback, String> {

    List<Feedback> findByParticipantId(String participantId);

    List<Feedback> findByTrainingProgramId(String trainingProgramId);

    List<Feedback> findByCourseId(String courseId);

    List<Feedback> findByTrainingProgramIdAndCourseId(String trainingProgramId, String courseId);

    boolean existsByParticipantIdAndTrainingProgramIdAndCourseId(
            String participantId, String trainingProgramId, String courseId);
}
