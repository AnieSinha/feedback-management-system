package com.feedback.service;

import com.feedback.dto.TrainingProgramRequest;
import com.feedback.exception.ResourceNotFoundException;
import com.feedback.model.TrainingProgram;
import com.feedback.repository.TrainingProgramRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TrainingProgramService {

    private final TrainingProgramRepository trainingProgramRepository;

    // US-011: Create Training Program
    public TrainingProgram createProgram(TrainingProgramRequest request) {
        TrainingProgram program = TrainingProgram.builder()
                .programName(request.getProgramName())
                .description(request.getDescription())
                .coordinatorId(request.getCoordinatorId())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .maxParticipants(request.getMaxParticipants())
                .status(request.getStatus() != null ? request.getStatus() : "UPCOMING")
                .build();

        return trainingProgramRepository.save(program);
    }

    // US-014: View all Training Programs
    public List<TrainingProgram> getAllPrograms() {
        return trainingProgramRepository.findAll();
    }

    // US-014: View Training Program by ID
    public TrainingProgram getProgramById(String id) {
        return trainingProgramRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Training program not found with id: " + id));
    }

    // US-014: View Training Programs by Coordinator
    public List<TrainingProgram> getProgramsByCoordinator(String coordinatorId) {
        return trainingProgramRepository.findByCoordinatorId(coordinatorId);
    }

    // US-012: Modify Training Program
    public TrainingProgram updateProgram(String id, TrainingProgramRequest request) {
        TrainingProgram program = trainingProgramRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Training program not found with id: " + id));

        program.setProgramName(request.getProgramName());
        program.setDescription(request.getDescription());
        program.setCoordinatorId(request.getCoordinatorId());
        program.setStartDate(request.getStartDate());
        program.setEndDate(request.getEndDate());
        program.setMaxParticipants(request.getMaxParticipants());
        if (request.getStatus() != null) {
            program.setStatus(request.getStatus());
        }

        return trainingProgramRepository.save(program);
    }

    // US-013: Delete Training Program
    public void deleteProgram(String id) {
        if (!trainingProgramRepository.existsById(id)) {
            throw new ResourceNotFoundException("Training program not found with id: " + id);
        }
        trainingProgramRepository.deleteById(id);
    }
}
