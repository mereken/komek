package com.komek.web;

import com.komek.dto.PlaceDto;
import com.komek.service.PlacesService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/places")
public class PlacesController {
    private final PlacesService places;

    public PlacesController(PlacesService places) { this.places = places; }

    @GetMapping("/suggest")
    public List<PlaceDto> suggest(@RequestParam(name = "q", defaultValue = "") String q) { return places.suggest(q); }
}
