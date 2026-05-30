"""
TradeNexus — Google Routes API v2 Client.

Provides route computations, distances, and travel durations using Google's
modern Directions v2 endpoint: https://routes.googleapis.com/directions/v2:computeRoutes
Includes a robust deterministic fallback for development when API keys are absent.
"""

import httpx
from core.config import get_settings


class MapsClient:
    """Client for Google Routes API v2."""

    BASE_URL = "https://routes.googleapis.com/directions/v2:computeRoutes"

    def __init__(self):
        settings = get_settings()
        self.api_key = settings.GOOGLE_ROUTES_API_KEY

    async def compute_route(self, origin: str, destination: str) -> dict:
        """
        Compute direct routing metrics between origin and destination Mandis.
        Uses Google Routes API v2 or falls back to a deterministic calculation.
        """
        if not self.api_key:
            return self._fallback_route(origin, destination)

        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": self.api_key,
            "X-Goog-FieldMask": "routes.duration,routes.distanceMeters",
        }

        payload = {
            "origin": {
                "address": f"{origin}, India"
            },
            "destination": {
                "address": f"{destination}, India"
            },
            "travelMode": "DRIVE",
            "routingPreference": "TRAFFIC_AWARE",
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(self.BASE_URL, headers=headers, json=payload)
                if response.status_code != 200:
                    print(f"[MapsClient] Google Routes API returned {response.status_code}, falling back...")
                    return self._fallback_route(origin, destination)
                
                data = response.json()
                if "routes" in data and len(data["routes"]) > 0:
                    route = data["routes"][0]
                    # Parse duration (e.g. "7200s") and distance (meters)
                    duration_str = route.get("duration", "0s")
                    duration_seconds = int(duration_str.rstrip("s"))
                    distance_meters = route.get("distanceMeters", 0)
                    
                    return {
                        "distance_km": round(distance_meters / 1000.0, 1),
                        "duration_hours": round(duration_seconds / 3600.0, 1),
                        "source": "google_routes_v2"
                    }
                else:
                    return self._fallback_route(origin, destination)
        except Exception as e:
            print(f"[MapsClient] Error contacting Google Routes API: {e}, falling back...")
            return self._fallback_route(origin, destination)

    def _fallback_route(self, origin: str, destination: str) -> dict:
        """
        Deterministic fallback routing calculator.
        Looks up known Indian corridors or uses a deterministic string hash distance generator.
        """
        # Dictionary of standard coordinates / mock distances for seed corridors
        known_routes = {
            ("nagpur", "ahmedabad"): (900.0, 18.0),
            ("indore", "mumbai"): (600.0, 12.0),
            ("lucknow", "delhi"): (500.0, 9.5),
            ("guntur", "chennai"): (450.0, 8.0),
            ("jaipur", "delhi"): (280.0, 5.5),
            ("nashik", "mumbai"): (180.0, 4.0),
            ("hubli", "mumbai"): (560.0, 10.5),
            ("nizamabad", "mumbai"): (680.0, 13.0),
            ("rajkot", "mumbai"): (660.0, 12.5),
            ("patna", "kolkata"): (580.0, 11.5),
            ("ludhiana", "delhi"): (320.0, 6.0),
            ("pune", "bengaluru"): (840.0, 16.0),
            ("madurai", "kochi"): (340.0, 7.0),
            ("junagadh", "jodhpur"): (480.0, 9.0),
            ("ujjain", "ahmedabad"): (420.0, 8.5),
        }

        orig_clean = origin.strip().lower()
        dest_clean = destination.strip().lower()

        # Direct exact or reverse lookup
        if (orig_clean, dest_clean) in known_routes:
            dist, dur = known_routes[(orig_clean, dest_clean)]
        elif (dest_clean, orig_clean) in known_routes:
            dist, dur = known_routes[(dest_clean, orig_clean)]
        else:
            # Generate deterministic values based on char values to prevent non-reproducible runs
            sum_chars = sum(ord(c) for c in (orig_clean + dest_clean))
            dist = float((sum_chars % 800) + 150)  # Between 150km and 950km
            dur = float(round(dist / 50.0, 1))      # Average speed 50 km/h

        return {
            "distance_km": dist,
            "duration_hours": dur,
            "source": "deterministic_fallback"
        }
