package com.solefinder.model;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class Shoe {
    private Integer id;
    private String name;
    private String brand;
    private String category;
    private Integer price;
    private Double rating;
    private Integer popularity;
}
