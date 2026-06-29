package com.feedback.repository;

import com.feedback.model.TrainingProgram;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TrainingProgramRepository extends MongoRepository<TrainingProgram, String> {

    List<TrainingProgram> findByCoordinatorId(String coordinatorId);

    boolean existsByProgramName(String programName);
}
