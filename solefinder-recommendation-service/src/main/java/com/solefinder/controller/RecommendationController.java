package com.solefinder.controller;

import com.solefinder.dto.RecommendationRequest;
import com.solefinder.dto.RecommendationResponse;
import com.solefinder.service.RecommendationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/recommend")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class RecommendationController {

    private final RecommendationService recommendationService;

    @PostMapping
    public List<RecommendationResponse> recommend(@Valid @RequestBody RecommendationRequest request) {
        return recommendationService.recommend(request);
    }
}
