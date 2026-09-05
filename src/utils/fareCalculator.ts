import type { AmbulanceType, Priority } from "@prisma/client";

/**
 * Pricing configuration constants (in BDT)
 */
export const BASE_FARES: Record<AmbulanceType, number> = {
  BASIC: 800,
  ADVANCED_LIFE_SUPPORT: 1200,
  INTENSIVE_CARE: 2000,
};

export const PRIORITY_SURCHARGES: Record<Priority, number> = {
  LOW: 0,
  MEDIUM: 50,
  HIGH: 100,
  CRITICAL: 200,
};

export const RATE_PER_KM = 40; // 40 BDT per kilometer
export const MINIMUM_DISTANCE_KM = 2.0; // Default minimum trip distance

export interface FareCalculationInput {
  ambulanceType: AmbulanceType;
  priority: Priority;
  pickupLat?: number | null;
  pickupLng?: number | null;
  hospitalLat?: number | null;
  hospitalLng?: number | null;
}

export interface FareBreakdown {
  ambulanceType: AmbulanceType;
  baseFare: number;
  priority: Priority;
  prioritySurcharge: number;
  distanceKm: number;
  ratePerKm: number;
  distanceFare: number;
  totalFare: number;
}

/**
 * Calculates the great-circle distance between two points on the Earth's surface
 * using the Haversine formula.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371; // Earth's radius in kilometers

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

/**
 * Computes an itemized fare breakdown for an ambulance emergency dispatch trip.
 */
export function calculateTripFare(input: FareCalculationInput): FareBreakdown {
  const baseFare = BASE_FARES[input.ambulanceType] ?? BASE_FARES.BASIC;
  const prioritySurcharge =
    PRIORITY_SURCHARGES[input.priority] ?? PRIORITY_SURCHARGES.HIGH;

  let distanceKm = MINIMUM_DISTANCE_KM;

  if (
    input.pickupLat != null &&
    input.pickupLng != null &&
    input.hospitalLat != null &&
    input.hospitalLng != null
  ) {
    const rawDistance = calculateHaversineDistance(
      input.pickupLat,
      input.pickupLng,
      input.hospitalLat,
      input.hospitalLng,
    );
    distanceKm = Math.max(rawDistance, MINIMUM_DISTANCE_KM);
  }

  const distanceFare = Math.round(distanceKm * RATE_PER_KM);
  const totalFare = baseFare + distanceFare + prioritySurcharge;

  return {
    ambulanceType: input.ambulanceType,
    baseFare,
    priority: input.priority,
    prioritySurcharge,
    distanceKm,
    ratePerKm: RATE_PER_KM,
    distanceFare,
    totalFare,
  };
}
