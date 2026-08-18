package com.studytracker.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "group_countdown_links",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_group_preset", columnNames = {"group_id", "preset_exam_id"}),
                @UniqueConstraint(name = "uq_group_custom", columnNames = {"group_id", "custom_countdown_id"})
        },
        indexes = {
                @Index(name = "idx_group_countdown_links_group_id", columnList = "group_id"),
                @Index(name = "idx_group_countdown_links_preset", columnList = "preset_exam_id"),
                @Index(name = "idx_group_countdown_links_custom", columnList = "custom_countdown_id")
        })
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GroupCountdownLink {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "group_id", nullable = false)
    private ChatGroup group;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "preset_exam_id")
    private SystemPresetExam presetExam;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "custom_countdown_id")
    private CountdownEvent customCountdown;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Column(name = "last_daily_notified_at")
    private Instant lastDailyNotifiedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
