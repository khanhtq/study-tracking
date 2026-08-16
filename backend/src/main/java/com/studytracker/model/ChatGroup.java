package com.studytracker.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "chat_groups", indexes = {
        @Index(name = "idx_chat_groups_popularity", columnList = "privacy, popularity_score, member_count"),
        @Index(name = "idx_chat_groups_owner", columnList = "owner_id"),
        @Index(name = "idx_chat_groups_slug", columnList = "slug")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, unique = true, length = 120)
    private String slug;

    @Column(length = 500)
    private String description;

    @Column(name = "avatar_url", columnDefinition = "TEXT")
    private String avatarUrl;

    @Column(name = "cover_url", columnDefinition = "TEXT")
    private String coverUrl;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private GroupPrivacy privacy = GroupPrivacy.PUBLIC;

    @Enumerated(EnumType.STRING)
    @Column(name = "join_policy", nullable = false, length = 30)
    @Builder.Default
    private GroupJoinPolicy joinPolicy = GroupJoinPolicy.OPEN;

    @Column(name = "max_members")
    @Builder.Default
    private Integer maxMembers = 5000;

    @Column(name = "member_count", nullable = false)
    @Builder.Default
    private Integer memberCount = 1;

    @Column(name = "message_count", nullable = false)
    @Builder.Default
    private Long messageCount = 0L;

    @Column(name = "popularity_score", nullable = false)
    @Builder.Default
    private Double popularityScore = 0.0;

    @Column(name = "is_archived", nullable = false)
    @Builder.Default
    private Boolean isArchived = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deleted_by")
    private User deletedBy;
}
