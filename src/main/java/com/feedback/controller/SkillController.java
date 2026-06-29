package com.feedback.controller;

import com.feedback.dto.SkillRequest;
import com.feedback.model.Skill;
import com.feedback.service.SkillService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class SkillController {

    private final SkillService skillService;

    @PostMapping("/faculty/{facultyId}/skills")
    public ResponseEntity<Skill> addSkill(@PathVariable String facultyId,
                                          @Valid @RequestBody SkillRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(skillService.addSkill(facultyId, request));
    }

    @GetMapping("/faculty/{facultyId}/skills")
    public ResponseEntity<List<Skill>> getSkillsByFaculty(@PathVariable String facultyId) {
        return ResponseEntity.ok(skillService.getSkillsByFaculty(facultyId));
    }

    @PutMapping("/skills/{id}")
    public ResponseEntity<Skill> updateSkill(@PathVariable String id,
                                              @Valid @RequestBody SkillRequest request) {
        return ResponseEntity.ok(skillService.updateSkill(id, request));
    }

    @DeleteMapping("/skills/{id}")
    public ResponseEntity<Void> deleteSkill(@PathVariable String id) {
        skillService.deleteSkill(id);
        return ResponseEntity.noContent().build();
    }
}
