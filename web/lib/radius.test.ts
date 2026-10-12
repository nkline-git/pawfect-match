import { describe, it, expect } from 'vitest'
import { radiusToSlider, sliderToRadius, formatRadius, RADIUS_ANY, SLIDER_ANY } from './radius'

describe('radius slider helpers', () => {
  it('maps the nationwide radius to the "Any distance" notch and back', () => {
    expect(radiusToSlider(RADIUS_ANY)).toBe(SLIDER_ANY)
    expect(sliderToRadius(SLIDER_ANY)).toBe(RADIUS_ANY)
  })

  it('passes ordinary radii straight through', () => {
    expect(radiusToSlider(100)).toBe(100)
    expect(sliderToRadius(100)).toBe(100)
    expect(sliderToRadius(500)).toBe(500)
  })

  it('clamps out-of-range radii (e.g. 600 mi from "expand search") onto the slider', () => {
    expect(radiusToSlider(600)).toBe(500)
    expect(radiusToSlider(0)).toBe(10)
  })

  it('formats nationwide as "Any distance" and everything else in miles', () => {
    expect(formatRadius(RADIUS_ANY)).toBe('Any distance')
    expect(formatRadius(250)).toBe('250 mi')
    expect(formatRadius(600)).toBe('600 mi')
  })
})
