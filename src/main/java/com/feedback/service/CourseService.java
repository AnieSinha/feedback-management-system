package com.feedback.service;

import com.feedback.dto.CourseRequest;
import com.feedback.model.Course;
import com.feedback.repository.CourseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CourseService {

    private final CourseRepository courseRepository;

    public Course addCourse(CourseRequest request) {
        Course course = Course.builder()
                .courseName(request.getCourseName())
                .description(request.getDescription())
                .duration(request.getDuration())
                .build();

        return courseRepository.save(course);
    }
}
