package com.feedback.service;

import com.feedback.dto.CourseRequest;
import com.feedback.exception.ResourceNotFoundException;
import com.feedback.model.Course;
import com.feedback.repository.CourseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CourseService {

    private final CourseRepository courseRepository;

    // US-007: Add Course
    public Course addCourse(CourseRequest request) {
        Course course = Course.builder()
                .courseName(request.getCourseName())
                .description(request.getDescription())
                .duration(request.getDuration())
                .build();

        return courseRepository.save(course);
    }

    // US-010: View all Courses
    public List<Course> getAllCourses() {
        return courseRepository.findAll();
    }

    // US-010: View Course by ID
    public Course getCourseById(String id) {
        return courseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found with id: " + id));
    }

    // US-008: Update Course
    public Course updateCourse(String id, CourseRequest request) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found with id: " + id));

        course.setCourseName(request.getCourseName());
        course.setDescription(request.getDescription());
        course.setDuration(request.getDuration());

        return courseRepository.save(course);
    }

    // US-009: Delete Course
    public void deleteCourse(String id) {
        if (!courseRepository.existsById(id)) {
            throw new ResourceNotFoundException("Course not found with id: " + id);
        }
        courseRepository.deleteById(id);
    }
}
