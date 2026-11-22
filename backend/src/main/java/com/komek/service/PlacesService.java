package com.komek.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.komek.dto.PlaceDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Address suggestions as you type. Real places from OpenStreetMap, found through Photon (a search-as-you-type
 * geocoder). Results are limited to the Almaty area and ranked by closeness to the city centre, so "мега"
 * gives the shopping centres of Almaty. If the service does not answer, the list is simply empty and the user
 * can type the address by hand.
 */
@Service
public class PlacesService {
    private static final Logger log = LoggerFactory.getLogger(PlacesService.class);

    private static final double CENTER_LAT = 43.238;
    private static final double CENTER_LON = 76.945;
    private static final String BBOX = "76.70,43.05,77.25,43.45"; // minLon,minLat,maxLon,maxLat around Almaty
    private static final long TTL_MS = 10 * 60 * 1000L;
    private static final int MAX_RESULTS = 7;

    private record Cached(List<PlaceDto> items, long at) {}

    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
    private final ObjectMapper mapper = new ObjectMapper();
    private final Map<String, Cached> cache = new ConcurrentHashMap<>();
    private final String baseUrl;
    private final String userAgent;

    public PlacesService(@Value("${app.places.url}") String baseUrl,
                         @Value("${app.places.user-agent}") String userAgent) {
        this.baseUrl = baseUrl;
        this.userAgent = userAgent;
    }

    public List<PlaceDto> suggest(String q) {
        String query = q == null ? "" : q.trim();
        if (query.length() < 2) return List.of();
        if (query.length() > 80) query = query.substring(0, 80);

        String key = query.toLowerCase(Locale.ROOT);
        long now = System.currentTimeMillis();
        Cached hit = cache.get(key);
        if (hit != null && now - hit.at() < TTL_MS) return hit.items();

        try {
            String url = baseUrl + "?q=" + URLEncoder.encode(query, StandardCharsets.UTF_8)
                    + "&limit=10&lat=" + CENTER_LAT + "&lon=" + CENTER_LON + "&bbox=" + BBOX;
            HttpRequest req = HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofSeconds(4))
                    .header("User-Agent", userAgent)
                    .header("Accept", "application/json")
                    .GET().build();
            HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() != 200) {
                log.warn("Places lookup answered HTTP {}", res.statusCode());
                return List.of();
            }
            List<PlaceDto> items = parse(res.body());
            if (cache.size() > 500) cache.clear();
            cache.put(key, new Cached(items, now));
            return items;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return List.of();
        } catch (Exception e) {
            log.warn("Places lookup failed: {}", e.toString());
            return List.of();
        }
    }

    private List<PlaceDto> parse(String body) throws Exception {
        Map<String, PlaceDto> unique = new LinkedHashMap<>();
        for (JsonNode f : mapper.readTree(body).path("features")) {
            JsonNode p = f.path("properties");
            String name = text(p, "name");
            String street = join(" ", text(p, "street"), text(p, "housenumber"));
            String city = text(p, "city").isEmpty() ? text(p, "locality") : text(p, "city");

            String title = name.isEmpty() ? street : name;
            if (title.isEmpty()) continue;

            List<String> parts = new ArrayList<>();
            if (!name.isEmpty() && !street.isEmpty() && !street.equalsIgnoreCase(name)) parts.add(street);
            String district = text(p, "district");
            if (!district.isEmpty() && !district.equalsIgnoreCase(title)) parts.add(district);
            if (!city.isEmpty() && !city.equalsIgnoreCase(title)) parts.add(city);
            String subtitle = String.join(", ", parts);

            String full = subtitle.isEmpty() ? title : title + ", " + subtitle;
            JsonNode c = f.path("geometry").path("coordinates");
            Double lon = c.size() == 2 ? c.get(0).asDouble() : null;
            Double lat = c.size() == 2 ? c.get(1).asDouble() : null;
            unique.putIfAbsent(full.toLowerCase(Locale.ROOT), new PlaceDto(title, subtitle, full, lat, lon));
            if (unique.size() >= MAX_RESULTS) break;
        }
        return new ArrayList<>(unique.values());
    }

    private static String text(JsonNode node, String field) {
        JsonNode v = node.path(field);
        return v.isMissingNode() || v.isNull() ? "" : v.asText("").trim();
    }

    private static String join(String sep, String a, String b) {
        if (a.isEmpty()) return b;
        if (b.isEmpty()) return a;
        return a + sep + b;
    }
}
