/**
 * Geocoding gratuito via Nominatim (OpenStreetMap).
 * Política de uso: máx. 1 req/s — chamamos só em onBlur do endereço.
 * @see https://operations.osmfoundation.org/policies/nominatim/
 */

const USER_AGENT = "OxenteExpress/1.0 (frontend; cadastro e perfil)";

export type NominatimAddressDetails = Record<string, string>;

export type GeocodeResult = {
  lat: number;
  lon: number;
  displayName?: string;
  formattedAddress?: string;
};

function formatAddressFromDetails(details: NominatimAddressDetails, displayName?: string): string {
  if (!details || Object.keys(details).length === 0) {
    return displayName?.trim() ?? "";
  }

  const street =
    details.road ||
    details.pedestrian ||
    details.cycleway ||
    details.path ||
    details.footway ||
    details.residential ||
    details.neighbourhood ||
    details.suburb ||
    details.village ||
    details.town ||
    details.hamlet;
  const number = details.house_number || details.housenumber;
  const neighborhood =
    details.neighbourhood ||
    details.suburb ||
    details.quarter ||
    details.village ||
    details.hamlet;
  const city = details.city || details.town || details.village || details.county;
  const state =
    details.state_code || details.state || details.region || details.state_district || details.county;

  const parts = [];
  if (street) {
    parts.push(number ? `${street}, ${number}` : street);
  } else if (number) {
    parts.push(number);
  }
  if (neighborhood && neighborhood !== street) {
    parts.push(neighborhood);
  }
  if (city && city !== neighborhood) {
    parts.push(city);
  }

  let formatted = parts.join(", ");
  if (formatted && state) {
    formatted += ` - ${state}`;
  }

  return formatted.trim() || (displayName?.trim() ?? "");
}

export async function geocodeAddressToLatLon(address: string): Promise<GeocodeResult | null> {
  const q = address.trim();
  if (q.length < 4) return null;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "1");

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "Accept-Language": "pt-BR,pt;q=0.9",
      "User-Agent": USER_AGENT,
    },
  });

  if (!res.ok) return null;
  const data = (await res.json()) as { lat?: string; lon?: string; display_name?: string; address?: NominatimAddressDetails }[];
  const first = data[0];
  if (!first?.lat || !first?.lon) return null;
  const lat = parseFloat(first.lat);
  const lon = parseFloat(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  return {
    lat,
    lon,
    displayName: first.display_name,
    formattedAddress: formatAddressFromDetails(first.address ?? {}, first.display_name),
  };
}

/** Formato enviado ao backend: `lat,lon` */
export function formatCoordinates(lat: number, lon: number): string {
  return `${lat},${lon}`;
}
