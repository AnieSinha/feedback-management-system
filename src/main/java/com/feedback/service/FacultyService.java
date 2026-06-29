package com.feedback.service;

import com.feedback.dto.FacultyRequest;
import com.feedback.exception.EmailAlreadyExistsException;
import com.feedback.exception.ResourceNotFoundException;
import com.feedback.model.Faculty;
import com.feedback.repository.FacultyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class FacultyService {

    private final FacultyRepository facultyRepository;

    public Faculty addFaculty(FacultyRequest request) {
        if (facultyRepository.existsByEmail(request.getEmail())) {
            throw new EmailAlreadyExistsException("Faculty with email already exists: " + request.getEmail());
        }

        Faculty faculty = Faculty.builder()
                .facultyName(request.getFacultyName())
                .email(request.getEmail())
                .department(request.getDepartment())
                .experience(request.getExperience())
                .build();

        return facultyRepository.save(faculty);
    }

    public List<Faculty> getAllFaculty() {
        return facultyRepository.findAll();
    }

    public Faculty getFacultyById(String id) {
        return facultyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Faculty not found with id: " + id));
    }

    public Faculty updateFaculty(String id, FacultyRequest request) {
        Faculty faculty = facultyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Faculty not found with id: " + id));

        if (!faculty.getEmail().equals(request.getEmail())
                && facultyRepository.existsByEmail(request.getEmail())) {
            throw new EmailAlreadyExistsException("Email already in use: " + request.getEmail());
        }

        faculty.setFacultyName(request.getFacultyName());
        faculty.setEmail(request.getEmail());
        faculty.setDepartment(request.getDepartment());
        faculty.setExperience(request.getExperience());

        return facultyRepository.save(faculty);
    }

    public void deleteFaculty(String id) {
        if (!facultyRepository.existsById(id)) {
            throw new ResourceNotFoundException("Faculty not found with id: " + id);
        }
        facultyRepository.deleteById(id);
    }
}
