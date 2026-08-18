package com.studytracker.repository;

import com.studytracker.model.GroupCountdownLink;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GroupCountdownLinkRepository extends JpaRepository<GroupCountdownLink, UUID> {

    @Query("SELECT gcl FROM GroupCountdownLink gcl " +
           "LEFT JOIN FETCH gcl.presetExam " +
           "LEFT JOIN FETCH gcl.customCountdown " +
           "WHERE gcl.group.id = :groupId " +
           "ORDER BY gcl.createdAt DESC")
    List<GroupCountdownLink> findByGroupIdWithDetails(@Param("groupId") UUID groupId);

    Optional<GroupCountdownLink> findByGroupIdAndPresetExamId(UUID groupId, Long presetExamId);

    Optional<GroupCountdownLink> findByGroupIdAndCustomCountdownId(UUID groupId, UUID customCountdownId);

    @Query("SELECT gcl FROM GroupCountdownLink gcl " +
           "JOIN FETCH gcl.group g " +
           "LEFT JOIN FETCH gcl.presetExam pe " +
           "LEFT JOIN FETCH gcl.customCountdown ce " +
           "WHERE g.deletedAt IS NULL AND g.isArchived = false")
    List<GroupCountdownLink> findAllActiveLinksWithDetails();

    void deleteByGroupId(UUID groupId);
}
