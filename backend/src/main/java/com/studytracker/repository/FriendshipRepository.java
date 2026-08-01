package com.studytracker.repository;

import com.studytracker.model.Friendship;
import com.studytracker.model.FriendshipStatus;
import com.studytracker.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FriendshipRepository extends JpaRepository<Friendship, UUID> {

    @Query("SELECT f FROM Friendship f WHERE " +
           "(f.requester.id = :u1Id AND f.addressee.id = :u2Id) OR " +
           "(f.requester.id = :u2Id AND f.addressee.id = :u1Id)")
    Optional<Friendship> findBetweenUserIds(@Param("u1Id") UUID u1Id, @Param("u2Id") UUID u2Id);

    @Query("SELECT f FROM Friendship f WHERE " +
           "(f.requester.id = :userId OR f.addressee.id = :userId) AND f.status = :status")
    List<Friendship> findAllByUserIdAndStatus(@Param("userId") UUID userId, @Param("status") FriendshipStatus status);

    @Query("SELECT f FROM Friendship f WHERE f.addressee.id = :userId AND f.status = :status ORDER BY f.createdAt DESC")
    List<Friendship> findByAddresseeIdAndStatus(@Param("userId") UUID userId, @Param("status") FriendshipStatus status);

    @Query("SELECT f FROM Friendship f WHERE f.requester.id = :userId AND f.status = :status ORDER BY f.createdAt DESC")
    List<Friendship> findByRequesterIdAndStatus(@Param("userId") UUID userId, @Param("status") FriendshipStatus status);

    @Query("SELECT COUNT(f) > 0 FROM Friendship f WHERE " +
           "((f.requester.id = :u1Id AND f.addressee.id = :u2Id) OR " +
           " (f.requester.id = :u2Id AND f.addressee.id = :u1Id)) AND " +
           "f.status = 'ACCEPTED'")
    boolean isFriends(@Param("u1Id") UUID u1Id, @Param("u2Id") UUID u2Id);

    @Query("SELECT COUNT(f) FROM Friendship f WHERE f.addressee.id = :userId AND f.status = :status")
    long countByAddresseeIdAndStatus(@Param("userId") UUID userId, @Param("status") FriendshipStatus status);
}
