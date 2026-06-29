package com.feedback.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SkillRequest {

    @NotBlank(message = "Skill name is required")
    private String skillName;

    @NotBlank(message = "Skill level is required")
    private String level;
}
