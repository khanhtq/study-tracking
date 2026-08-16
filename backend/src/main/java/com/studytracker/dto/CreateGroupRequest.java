package com.studytracker.dto;

import com.studytracker.model.GroupJoinPolicy;
import com.studytracker.model.GroupPrivacy;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateGroupRequest {

    @NotBlank(message = "Tên nhóm không được để trống")
    @Size(min = 2, max = 100, message = "Tên nhóm phải từ 2 đến 100 ký tự")
    private String name;

    @Size(max = 500, message = "Mô tả nhóm tối đa 500 ký tự")
    private String description;

    @NotNull(message = "Chế độ quyền riêng tư không được để trống")
    private GroupPrivacy privacy;

    @NotNull(message = "Chế độ tham gia không được để trống")
    private GroupJoinPolicy joinPolicy;

    private Integer maxMembers;

    private String avatarUrl;

    private String coverUrl;
}
