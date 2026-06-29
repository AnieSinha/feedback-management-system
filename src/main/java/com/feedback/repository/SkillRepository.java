package com.feedback.repository;

import com.feedback.model.Skill;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SkillRepository extends MongoRepository<Skill, String> {

    List<Skill> findByFacultyId(String facultyId);

    void deleteByFacultyId(String facultyId);
}
