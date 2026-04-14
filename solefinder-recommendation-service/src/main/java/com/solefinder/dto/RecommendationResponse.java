package com.solefinder.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class RecommendationResponse {
    private Integer id;
    private String name;
    private Double score;
    private String reason;
}
