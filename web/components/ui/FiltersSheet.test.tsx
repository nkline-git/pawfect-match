import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FiltersSheet from './FiltersSheet'
import type { PetPreferences } from '@/types'

function setup(overrides: { initialPrefs?: PetPreferences | null; initialRadius?: number } = {}) {
  const onApply = vi.fn()
  const onClose = vi.fn()
  render(
    <FiltersSheet
      initialPrefs={overrides.initialPrefs ?? null}
      initialRadius={overrides.initialRadius ?? 100}
      onApply={onApply}
      onClose={onClose}
    />
  )
  return { onApply, onClose }
}

describe('FiltersSheet', () => {
  it('seeds the radius display from initialRadius', () => {
    setup({ initialRadius: 250 })
    expect(screen.getByText('250 mi')).toBeInTheDocument()
  })

  it('shows a nationwide (2000 mi) search as "Any distance" with the slider at its top notch', () => {
    setup({ initialRadius: 2000 })
    expect(screen.getByText('Any distance')).toBeInTheDocument()
    const slider = screen.getByRole('slider') as HTMLInputElement
    expect(slider.value).toBe(slider.max)
  })

  it('dragging the slider to the top notch applies a nationwide search', async () => {
    const user = userEvent.setup()
    const { onApply } = setup()
    const slider = screen.getByRole('slider') as HTMLInputElement
    fireEvent.change(slider, { target: { value: slider.max } })
    expect(screen.getByText('Any distance')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Show matching pets/ }))
    expect(onApply).toHaveBeenLastCalledWith(expect.anything(), 2000)
  })

  it('applies with no active filters shows plain "Show matching pets"', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Show matching pets' })).toBeInTheDocument()
  })

  it('toggling a size chip adds it to the active count and calls onApply with it', async () => {
    const user = userEvent.setup()
    const { onApply } = setup()

    await user.click(screen.getByRole('button', { name: /Small/ }))
    expect(screen.getByRole('button', { name: 'Show matching pets (1 filter)' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Show matching pets (1 filter)' }))
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ size: ['Small'] }),
      100
    )
  })

  it('clicking an active size chip again deselects it', async () => {
    const user = userEvent.setup()
    setup()

    const smallChip = screen.getByRole('button', { name: /Small/ })
    await user.click(smallChip)
    await user.click(smallChip)
    expect(screen.getByRole('button', { name: 'Show matching pets' })).toBeInTheDocument()
  })

  it('good-with fields are a null<->true toggle, not multi-value', async () => {
    const user = userEvent.setup()
    const { onApply } = setup()

    await user.click(screen.getByRole('button', { name: 'Kids' }))
    await user.click(screen.getByRole('button', { name: /Show matching pets/ }))
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ good_with_kids: true, good_with_dogs: null, good_with_cats: null }),
      100
    )
  })

  it('housing is single-select — picking a second option replaces the first', async () => {
    const user = userEvent.setup()
    const { onApply } = setup()

    await user.click(screen.getByRole('button', { name: 'Apartment' }))
    await user.click(screen.getByRole('button', { name: 'House with yard' }))
    await user.click(screen.getByRole('button', { name: /Show matching pets/ }))
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ housing: 'house' }), 100)
  })

  it('adding a breed via the quick-pick chips shows it as a removable chip', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(screen.getByRole('button', { name: '+ Golden Retriever' }))
    // The quick-pick chip disappears once selected (already-picked breeds are filtered out)...
    expect(screen.queryByRole('button', { name: '+ Golden Retriever' })).not.toBeInTheDocument()
    // ...and a removable chip with just the name appears instead
    expect(screen.getByText('Golden Retriever')).toBeInTheDocument()
  })

  it('typing a breed shows autocomplete suggestions, and Enter with none highlighted adds the raw text', async () => {
    const user = userEvent.setup()
    const { onApply } = setup()

    const input = screen.getByPlaceholderText(/Type a breed/i)
    await user.type(input, 'labra')
    expect(await screen.findByText('Labrador Retriever')).toBeInTheDocument()

    // Typing something with no real match and hitting Enter adds it verbatim
    await user.clear(input)
    await user.type(input, 'Some Rare Mix{Enter}')
    await user.click(screen.getByRole('button', { name: /Show matching pets/ }))
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ breeds: ['Some Rare Mix'] }), 100)
  })

  it('clicking a breed suggestion adds that breed and clears the input', async () => {
    const user = userEvent.setup()
    setup()

    const input = screen.getByPlaceholderText(/Type a breed/i)
    await user.type(input, 'labra')
    const suggestion = await screen.findByText('Labrador Retriever')
    await user.click(suggestion)

    expect(input).toHaveValue('')
    // Now shown as a removable chip
    const chips = screen.getAllByText('Labrador Retriever')
    expect(chips.length).toBeGreaterThan(0)
  })

  it('removing a breed chip takes it back out of prefs', async () => {
    const user = userEvent.setup()
    const { onApply } = setup()

    await user.click(screen.getByRole('button', { name: '+ Golden Retriever' }))
    const removeBtn = screen.getByText('Golden Retriever').closest('span')!.querySelector('button')!
    await user.click(removeBtn)

    await user.click(screen.getByRole('button', { name: /Show matching pets/ }))
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ breeds: [] }), 100)
  })

  it('Reset clears every field back to empty, including a non-default radius', async () => {
    const user = userEvent.setup()
    const { onApply } = setup({
      initialPrefs: { species: [], breeds: ['Poodle'], size: ['Large'], age: [], energy: [], good_with_kids: true, good_with_dogs: null, good_with_cats: null, housing: 'house' },
      initialRadius: 300,
    })

    expect(screen.getByRole('button', { name: 'Reset' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Reset' }))
    expect(screen.getByText('100 mi')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show matching pets' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Show matching pets' }))
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ breeds: [], size: [], housing: null, good_with_kids: null }),
      100
    )
  })

  it('Reset is disabled when nothing has changed from the defaults', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled()
  })

  it('moving the radius slider updates the displayed distance and the applied value', async () => {
    const user = userEvent.setup()
    const { onApply } = setup()

    fireEvent.change(screen.getByRole('slider'), { target: { value: '350' } })
    expect(screen.getByText('350 mi')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Show matching pets/ }))
    expect(onApply).toHaveBeenLastCalledWith(expect.anything(), 350)
  })

  it('calls onClose when the backdrop is clicked', async () => {
    const user = userEvent.setup()
    const { onClose } = setup()
    // The outer fixed-position backdrop is the ancestor of the "Filters" heading
    await user.click(screen.getByText('Filters').closest('.fixed')!)
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when the X button is clicked', async () => {
    const user = userEvent.setup()
    const { onClose } = setup()
    const closeButtons = screen.getAllByRole('button')
    // The X button is the one right next to the "Filters" heading — first button in the doc
    await user.click(closeButtons[0])
    expect(onClose).toHaveBeenCalled()
  })
})
