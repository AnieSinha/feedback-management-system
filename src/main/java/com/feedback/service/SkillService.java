package com.feedback.service;

import com.feedback.dto.SkillRequest;
import com.feedback.exception.ResourceNotFoundException;
import com.feedback.model.Skill;
import com.feedback.repository.FacultyRepository;
import com.feedback.repository.SkillRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SkillService {

    private final SkillRepository skillRepository;
    private final FacultyRepository facultyRepository;

    public Skill addSkill(String facultyId, SkillRequest request) {
        if (!facultyRepository.existsById(facultyId)) {
            throw new ResourceNotFoundException("Faculty not found with id: " + facultyId);
        }

        Skill skill = Skill.builder()
                .skillName(request.getSkillName())
                .level(request.getLevel())
                .facultyId(facultyId)
                .build();

        return skillRepository.save(skill);
    }

    public List<Skill> getSkillsByFaculty(String facultyId) {
        if (!facultyRepository.existsById(facultyId)) {
            throw new ResourceNotFoundException("Faculty not found with id: " + facultyId);
        }

        return skillRepository.findByFacultyId(facultyId);
    }

    public Skill updateSkill(String id, SkillRequest request) {
        Skill skill = skillRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Skill not found with id: " + id));

        skill.setSkillName(request.getSkillName());
        skill.setLevel(request.getLevel());

        return skillRepository.save(skill);
    }

    public void deleteSkill(String id) {
        if (!skillRepository.existsById(id)) {
            throw new ResourceNotFoundException("Skill not found with id: " + id);
        }
        skillRepository.deleteById(id);
    }
}
