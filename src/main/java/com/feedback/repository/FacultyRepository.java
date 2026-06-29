package com.feedback.repository;

import com.feedback.model.Faculty;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface FacultyRepository extends MongoRepository<Faculty, String> {

    Optional<Faculty> findByEmail(String email);

    boolean existsByEmail(String email);
}
