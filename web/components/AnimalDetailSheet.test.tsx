import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AnimalDetailSheet, { shortBreed, formatAge } from './AnimalDetailSheet'
import type { UnifiedPet, PetPreferences } from '@/types'

function makeAnimal(overrides: Partial<UnifiedPet> = {}): UnifiedPet {
  return {
    id: 'a1', name: 'Buddy', type: 'dog', breed: 'Golden Retriever', age: '2 Years',
    gender: 'Male', size: 'Large', description: 'Loves fetch.',
    photo: null, photos: [], url: '/pets/a1',
    orgUrl: null, orgEmail: null, orgPhone: null,
    city: 'Wichita, KS', orgName: 'Heartland Paws', tags: ['Friendly', 'Male'],
    isLocal: true,
    ...overrides,
  }
}

describe('shortBreed', () => {
  it('returns null for null input', () => {
    expect(shortBreed(null)).toBeNull()
  })
  it('trims a slash-qualified breed', () => {
    expect(shortBreed('Domestic Short Hair / Mixed (short coat)')).toBe('Domestic Short Hair')
  })
  it('trims an RG compound breed with a dash', () => {
    expect(shortBreed('Parakeet - Other')).toBe('Parakeet')
  })
  it('leaves a simple breed untouched', () => {
    expect(shortBreed('Beagle')).toBe('Beagle')
  })
})

describe('formatAge', () => {
  it('returns null for null input', () => {
    expect(formatAge(null)).toBeNull()
  })
  it('formats years and months', () => {
    expect(formatAge('6 Years 1 Month')).toBe('6yr 1mo')
  })
  it('formats years only when months is zero', () => {
    expect(formatAge('3 Years 0 Months')).toBe('3yr')
  })
  it('formats months only', () => {
    expect(formatAge('5 Months')).toBe('5mo')
  })
  it('formats weeks for very young animals', () => {
    expect(formatAge('3 Weeks')).toBe('3wk')
  })
  it('falls back to the raw string when nothing matches', () => {
    expect(formatAge('Puppy')).toBe('Puppy')
  })
})

describe('AnimalDetailSheet', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders name, breed, gender, and size', () => {
    render(<AnimalDetailSheet animal={makeAnimal()} onClose={vi.fn()} />)
    expect(screen.getByText('Buddy')).toBeInTheDocument()
    expect(screen.getByText('Golden Retriever · Male · Large')).toBeInTheDocument()
  })

  it('shows the species emoji fallback when there are no photos', () => {
    render(<AnimalDetailSheet animal={makeAnimal({ isLocal: true, photos: [], photo: null })} onClose={vi.fn()} />)
    expect(screen.getByText('🐾')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('renders a photo when the animal has one, using it as the image src', () => {
    render(<AnimalDetailSheet animal={makeAnimal({ photo: 'https://example.com/buddy.jpg' })} onClose={vi.fn()} />)
    const img = screen.getByRole('img', { name: 'Buddy' })
    // unoptimized -> next/image passes the src straight through, no /_next/image proxy
    expect(img).toHaveAttribute('src', 'https://example.com/buddy.jpg')
  })

  it('shows next/prev arrows and a counter only with multiple photos, and paging updates the counter', async () => {
    const user = userEvent.setup()
    render(<AnimalDetailSheet
      animal={makeAnimal({ photos: ['https://x/1.jpg', 'https://x/2.jpg', 'https://x/3.jpg'] })}
      onClose={vi.fn()}
    />)
    expect(screen.getByText('1 / 3')).toBeInTheDocument()

    const nextButtons = screen.getAllByRole('button').filter(b => b.querySelector('svg.lucide-chevron-right'))
    await user.click(nextButtons[0])
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
  })

  it('does not show paging controls for a single photo', () => {
    render(<AnimalDetailSheet animal={makeAnimal({ photos: ['https://x/1.jpg'] })} onClose={vi.fn()} />)
    expect(screen.queryByText(/^\d+ \/ \d+$/)).not.toBeInTheDocument()
  })

  it('local pets get a "Full profile & apply" link pointing at animal.url', () => {
    render(<AnimalDetailSheet animal={makeAnimal({ isLocal: true, url: '/pets/a1' })} onClose={vi.fn()} />)
    const link = screen.getByRole('link', { name: /Full profile & apply/ })
    expect(link).toHaveAttribute('href', '/pets/a1')
  })

  it('RG pets with an orgUrl get a "Visit ...\'s website" link instead', () => {
    render(<AnimalDetailSheet
      animal={makeAnimal({ isLocal: false, orgUrl: 'rescuesite.org', orgName: 'Rescue Site' })}
      onClose={vi.fn()}
    />)
    const link = screen.getByRole('link', { name: /Visit Rescue Site's website/ })
    expect(link).toHaveAttribute('href', 'https://rescuesite.org')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('RG pets with no contact info at all fall back to a "contact them" message', () => {
    render(<AnimalDetailSheet
      animal={makeAnimal({ isLocal: false, orgUrl: null, orgEmail: null, orgPhone: null, orgName: 'Mystery Rescue' })}
      onClose={vi.fn()}
    />)
    expect(screen.getAllByText('Mystery Rescue').length).toBeGreaterThan(0)
    expect(screen.getByText(/Contact them to inquire about Buddy/)).toBeInTheDocument()
  })

  it('RG pets with an email get a mailto link', () => {
    render(<AnimalDetailSheet
      animal={makeAnimal({ isLocal: false, orgEmail: 'adopt@rescue.org', orgName: 'Rescue' })}
      onClose={vi.fn()}
    />)
    const link = screen.getByRole('link', { name: /Email Rescue/ })
    expect(link.getAttribute('href')).toMatch(/^mailto:adopt@rescue\.org/)
  })

  it('shows a "why this is a match" banner when preferences match, and hides it otherwise', () => {
    const prefs: PetPreferences = {
      species: ['dog'], breeds: [], size: ['Large'], age: [], energy: [],
      good_with_kids: null, good_with_dogs: null, good_with_cats: null, housing: null,
    }
    const { rerender } = render(
      <AnimalDetailSheet animal={makeAnimal({ type: 'dog', size: 'Large' })} onClose={vi.fn()} prefs={prefs} />
    )
    expect(screen.getByText(/Why Buddy is a great match for you/)).toBeInTheDocument()
    expect(screen.getByText('📏 Large size — your pick')).toBeInTheDocument()

    rerender(<AnimalDetailSheet animal={makeAnimal({ type: 'dog', size: 'Large' })} onClose={vi.fn()} prefs={null} />)
    expect(screen.queryByText(/Why Buddy is a great match for you/)).not.toBeInTheDocument()
  })

  it('calls onClose when the X (close) button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const { container } = render(<AnimalDetailSheet animal={makeAnimal()} onClose={onClose} />)

    const closeBtn = Array.from(container.querySelectorAll('button')).find(b => b.querySelector('svg.lucide-x'))!
    await user.click(closeBtn)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when the backdrop is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const { container } = render(<AnimalDetailSheet animal={makeAnimal()} onClose={onClose} />)

    // The outermost fixed-position element is the click-to-dismiss backdrop
    await user.click(container.firstElementChild as HTMLElement)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('clicking inside the sheet content does not close it (stopPropagation)', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<AnimalDetailSheet animal={makeAnimal()} onClose={onClose} />)
    await user.click(screen.getByText('Buddy'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('lazy-fetches extra photos for a non-local animal with none cached, and renders them once loaded', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: async () => ({ photos: ['https://cdn.rescuegroups.org/1.jpg', 'https://cdn.rescuegroups.org/2.jpg'] }),
    }))
    render(<AnimalDetailSheet animal={makeAnimal({ isLocal: false, photos: [], photo: null })} onClose={vi.fn()} />)

    await waitFor(() => expect(screen.getByText('1 / 2')).toBeInTheDocument())
  })

  it('does not fetch extra photos when initialPhotos are already provided', () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    render(
      <AnimalDetailSheet
        animal={makeAnimal({ isLocal: false, photos: [], photo: null })}
        initialPhotos={['https://cdn.rescuegroups.org/cached.jpg']}
        onClose={vi.fn()}
      />
    )
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
