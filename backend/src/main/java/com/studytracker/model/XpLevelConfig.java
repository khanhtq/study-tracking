package com.studytracker.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "xp_level_config")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class XpLevelConfig {

    @Id
    private Integer level;

    @Column(nullable = false)
    private Integer xpRequired;
}
