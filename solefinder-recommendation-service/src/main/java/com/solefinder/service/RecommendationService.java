package com.solefinder.service;

import com.solefinder.dto.RecommendationRequest;
import com.solefinder.dto.RecommendationResponse;
import com.solefinder.model.Shoe;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;

@Service
public class RecommendationService {

    private final List<Shoe> shoes = List.of(
            new Shoe(1, "Air Max 270", "Nike", "Running", 150, 4.5, 85),
            new Shoe(2, "Pegasus Turbo Next", "Nike", "Running", 190, 4.8, 93),
            new Shoe(3, "Ultraboost Light", "Adidas", "Running", 180, 4.7, 88),
            new Shoe(4, "NMD S1", "Adidas", "Lifestyle", 170, 4.4, 80),
            new Shoe(5, "Gel-Kayano 30", "ASICS", "Running", 160, 4.9, 91),
            new Shoe(6, "Nimbus 26", "ASICS", "Running", 170, 4.8, 89),
            new Shoe(7, "Fresh Foam X 1080v13", "New Balance", "Running", 165, 4.7, 86),
            new Shoe(8, "FuelCell Rebel v4", "New Balance", "Training", 140, 4.6, 84),
            new Shoe(9, "Cloudmonster", "On", "Running", 175, 4.7, 90),
            new Shoe(10, "Cloudnova Form", "On", "Lifestyle", 180, 4.5, 82),
            new Shoe(11, "Metcon 9", "Nike", "Training", 150, 4.6, 87),
            new Shoe(12, "Nano X4", "Reebok", "Training", 140, 4.4, 78),
            new Shoe(13, "Endorphin Speed 4", "Saucony", "Running", 170, 4.8, 88),
            new Shoe(14, "Clifton 9", "Hoka", "Running", 145, 4.7, 87),
            new Shoe(15, "Ghost 16", "Brooks", "Running", 140, 4.6, 83),
            new Shoe(16, "530", "New Balance", "Lifestyle", 110, 4.5, 92)
    );

    public List<RecommendationResponse> recommend(RecommendationRequest request) {
        return shoes.stream()
                .map(shoe -> toRecommendation(shoe, request))
                .sorted(Comparator.comparing(RecommendationResponse::getScore).reversed())
                .limit(6)
                .toList();
    }

    private RecommendationResponse toRecommendation(Shoe shoe, RecommendationRequest request) {
        double score = 0;
        score += shoe.getRating() * 20;
        score += shoe.getPopularity() * 0.5;

        if (matches(shoe.getBrand(), request.getBrand())) {
            score += 12;
        }

        if (matches(shoe.getCategory(), request.getCategory())) {
            score += 10;
        }

        if (shoe.getPrice() > request.getBudget()) {
            score -= Math.min(25, (shoe.getPrice() - request.getBudget()) * 0.35);
        } else {
            score += Math.min(8, (request.getBudget() - shoe.getPrice()) * 0.08);
        }

        double normalized = Math.max(0, Math.min(100, score / 1.45));
        normalized = Math.round(normalized * 10.0) / 10.0;

        return new RecommendationResponse(
                shoe.getId(),
                shoe.getName(),
                normalized,
                buildReason(shoe, request)
        );
    }

    private boolean matches(String candidate, String requested) {
        if (requested == null || requested.isBlank()) {
            return false;
        }
        return candidate.equalsIgnoreCase(requested.trim());
    }

    private String buildReason(Shoe shoe, RecommendationRequest request) {
        StringBuilder builder = new StringBuilder();
        builder.append("Rated ").append(shoe.getRating()).append(" with popularity ").append(shoe.getPopularity());

        if (matches(shoe.getBrand(), request.getBrand())) {
            builder.append(", brand matched");
        }

        if (matches(shoe.getCategory(), request.getCategory())) {
            builder.append(", category matched");
        }

        if (shoe.getPrice() <= request.getBudget()) {
            builder.append(", within budget");
        } else {
            builder.append(", slightly above budget");
        }

        return builder.toString();
    }
}
