import os
import httpx
from dotenv import load_dotenv

load_dotenv()

AMAP_KEY = os.getenv("AMAP_API_KEY")

async def search_poi(keywords: str, city: str = "", api_key: str = None):
    """
    Search for a place (Point of Interest) by keyword and optional city.
    """
    # Use passed key if available, else default
    key_to_use = api_key if api_key else AMAP_KEY
    
    url = "https://restapi.amap.com/v3/place/text"
    params = {
        "key": key_to_use,
        "keywords": keywords,
        "city": city,
        "offset": 5,  # Return top 5 results
        "page": 1,
        "extensions": "all"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, params=params)
            data = response.json()
            if data["status"] == "1" and int(data["count"]) > 0:
                results = []
                for poi in data["pois"]:
                    results.append({
                        "name": poi["name"],
                        "address": poi["address"],
                        "location": poi["location"], # lng,lat
                        "type": poi["type"],
                        "tel": poi.get("tel", "N/A")
                    })
                return results
            else:
                return []
        except Exception as e:
            print(f"Error calling Amap API: {e}")
            return []

async def search_nearby(location: str, keywords: str = "", radius: int = 1000, api_key: str = None):
    """
    Search for places around a specific coordinate (lng,lat).
    Useful for finding 'parking', 'hotel' near a spot.
    """
    # Use passed key if available, else default
    key_to_use = api_key if api_key else AMAP_KEY
    
    url = "https://restapi.amap.com/v3/place/around"
    params = {
        "key": key_to_use,
        "location": location,
        "keywords": keywords,
        "radius": radius,
        "offset": 5,
        "page": 1,
        "extensions": "all"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, params=params)
            data = response.json()
            if data["status"] == "1" and int(data["count"]) > 0:
                results = []
                for poi in data["pois"]:
                    results.append({
                        "name": poi["name"],
                        "address": poi["address"],
                        "location": poi["location"],
                        "type": poi["type"],
                        "distance": poi.get("distance", 0)
                    })
                return results
            else:
                return []
        except Exception as e:
            print(f"Error calling Amap Nearby API: {e}")
            return []
