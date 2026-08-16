package com.studytracker.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "group_pinned_messages",
        uniqueConstraints = @UniqueConstraint(name = "uq_group_pinned_msg", columnNames = {"group_id", "message_id"}),
        indexes = {
                @Index(name = "idx_group_pinned_group", columnList = "group_id, pinned_at")
        })
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GroupPinnedMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "group_id", nullable = false)
    private ChatGroup group;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "message_id", nullable = false)
    private GroupMessage message;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "pinned_by", nullable = false)
    private User pinnedBy;

    @CreationTimestamp
    @Column(name = "pinned_at", updatable = false)
    private Instant pinnedAt;
}
