/**
 * Geocoding gratuito via Nominatim (OpenStreetMap).
 * Política de uso: máx. 1 req/s — chamamos só em onBlur do endereço.
 * @see https://operations.osmfoundation.org/policies/nominatim/
 */

const USER_AGENT = "OxenteExpress/1.0 (frontend; cadastro e perfil)";

export type GeocodeResult = { lat: number; lon: number; displayName?: string };

export async function geocodeAddressToLatLon(address: string): Promise<GeocodeResult | null> {
  const q = address.trim();
  if (q.length < 4) return null;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "0");

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "Accept-Language": "pt-BR,pt;q=0.9",
      "User-Agent": USER_AGENT,
    },
  });

  if (!res.ok) return null;
  const data = (await res.json()) as { lat?: string; lon?: string; display_name?: string }[];
  const first = data[0];
  if (!first?.lat || !first?.lon) return null;
  const lat = parseFloat(first.lat);
  const lon = parseFloat(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon, displayName: first.display_name };
}

/** Formato enviado ao backend: `lat,lon` */
export function formatCoordinates(lat: number, lon: number): string {
  return `${lat},${lon}`;
}
