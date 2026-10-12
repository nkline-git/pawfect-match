// Search-radius slider helpers, shared by the Filters panel and the inline
// location editor on the browse page.
//
// The slider covers 10–500 mi in 10 mi steps, plus one extra notch past 500
// that means "Any distance" (stored as RADIUS_ANY, the same nationwide value
// used when a guest has no location). Without that notch, a 2000 mi search
// showed as a slider pinned at 500 labelled "2000 miles", and once moved there
// was no way back to nationwide.

export const RADIUS_MIN  = 10
export const RADIUS_MAX  = 500
export const RADIUS_STEP = 10
export const RADIUS_ANY  = 2000

/** Slider position for the "Any distance" notch. */
export const SLIDER_ANY = RADIUS_MAX + RADIUS_STEP

export function radiusToSlider(radius: number): number {
  if (radius >= RADIUS_ANY) return SLIDER_ANY
  return Math.min(Math.max(radius, RADIUS_MIN), RADIUS_MAX)
}

export function sliderToRadius(value: number): number {
  return value > RADIUS_MAX ? RADIUS_ANY : value
}

export function formatRadius(radius: number): string {
  return radius >= RADIUS_ANY ? 'Any distance' : `${radius} mi`
}
