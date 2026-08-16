package com.studytracker.repository;

import com.studytracker.model.GroupInviteLink;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GroupInviteLinkRepository extends JpaRepository<GroupInviteLink, UUID> {

    Optional<GroupInviteLink> findByCodeAndIsRevokedFalse(String code);

    Optional<GroupInviteLink> findByCode(String code);

    boolean existsByCode(String code);

    @Query("SELECT il FROM GroupInviteLink il JOIN FETCH il.createdBy cb WHERE il.group.id = :groupId AND il.isRevoked = false ORDER BY il.createdAt DESC")
    List<GroupInviteLink> findActiveByGroupId(@Param("groupId") UUID groupId);
}
