package com.solefinder.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RecommendationRequest {
    private String brand;
    private String category;

    @NotNull
    @Min(1)
    private Integer budget;
}
