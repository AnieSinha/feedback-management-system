package com.feedback.repository;

import com.feedback.model.Course;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CourseRepository extends MongoRepository<Course, String> {

    boolean existsByCourseName(String courseName);
}
