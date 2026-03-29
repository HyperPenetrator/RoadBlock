export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
}

export class GeocodingService {
  private static readonly NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/search';

  /**
   * Search for coordinates of a place name using Nominatim API.
   * @param query The place name to search for
   */
  static async search(query: string): Promise<GeocodeResult | null> {
    if (!query || query.trim().length === 0) return null;

    const url = `${this.NOMINATIM_BASE_URL}?q=${encodeURIComponent(query)}&format=json&limit=1`;

    try {
      const response = await fetch(url, {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'RoadFireWall-App' // Nominatim requires a user agent
        }
      });

      if (!response.ok) {
        throw new Error(`Geocoding error: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data || data.length === 0) {
        return null;
      }

      const result = data[0];
      return {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        displayName: result.display_name
      };
    } catch (error) {
      console.error('Failed to geocode location:', error);
      throw error;
    }
  }
}
