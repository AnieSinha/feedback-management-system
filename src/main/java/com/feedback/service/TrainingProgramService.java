package com.feedback.service;

import com.feedback.dto.TrainingProgramRequest;
import com.feedback.exception.ResourceNotFoundException;
import com.feedback.model.Role;
import com.feedback.model.TrainingProgram;
import com.feedback.model.User;
import com.feedback.repository.TrainingProgramRepository;
import com.feedback.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TrainingProgramService {

    private final TrainingProgramRepository trainingProgramRepository;
    private final UserRepository userRepository;

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
                .participantIds(new ArrayList<>())
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

    // US-017: Enroll a participant so they can be tracked in the defaulters report
    public TrainingProgram enrollParticipant(String programId, String participantId) {
        TrainingProgram program = getProgramById(programId);

        User participant = userRepository.findById(participantId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + participantId));

        if (participant.getRole() != Role.PARTICIPANT) {
            throw new IllegalArgumentException("User " + participantId + " is not a participant");
        }

        if (program.getParticipantIds() == null) {
            program.setParticipantIds(new ArrayList<>());
        }

        if (program.getParticipantIds().contains(participantId)) {
            return program;
        }

        if (program.getParticipantIds().size() >= program.getMaxParticipants()) {
            throw new IllegalArgumentException("Training program has reached its maximum of "
                    + program.getMaxParticipants() + " participants");
        }

        program.getParticipantIds().add(participantId);
        return trainingProgramRepository.save(program);
    }

    // US-017: Remove a participant from a program
    public TrainingProgram unenrollParticipant(String programId, String participantId) {
        TrainingProgram program = getProgramById(programId);

        if (program.getParticipantIds() == null || !program.getParticipantIds().remove(participantId)) {
            throw new ResourceNotFoundException(
                    "Participant " + participantId + " is not enrolled in program " + programId);
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
