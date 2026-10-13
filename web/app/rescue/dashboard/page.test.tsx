// Drives the rescue dashboard's edit-pet flow end to end against a fake
// Supabase client — the real page needs a rescue login, so this is what
// stands in for clicking through it by hand.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Pet, Rescue } from '@/types'

type Call = { table: string; op: 'select' | 'insert' | 'update' | 'delete'; payload?: unknown; eq: [string, unknown][] }

const h = vi.hoisted(() => ({
  calls: [] as Call[],
  uploads: [] as string[],
  refetch: () => {},
  pets: [] as Pet[],
  rescue: null as Rescue | null,
}))

vi.mock('@/lib/supabase/client', () => {
  // Chainable query builder that records what the page asked for and
  // resolves like a successful Supabase response when awaited.
  const from = (table: string) => {
    const call: Call = { table, op: 'select', eq: [] }
    h.calls.push(call)
    const b = {
      select: () => b,
      insert: (p: unknown) => { call.op = 'insert'; call.payload = p; return b },
      update: (p: unknown) => { call.op = 'update'; call.payload = p; return b },
      delete: () => { call.op = 'delete'; return b },
      eq: (k: string, v: unknown) => { call.eq.push([k, v]); return b },
      order: () => b,
      single: () => b,
      then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
        Promise.resolve({ data: [], error: null }).then(res, rej),
    }
    return b
  }
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'user-1' } } }), signOut: async () => ({}) },
    from,
    storage: {
      from: () => ({
        upload: async (path: string) => { h.uploads.push(path); return { error: null } },
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn.test/pet-photos/${path}` } }),
      }),
    },
  }
  return { createClient: () => client }
})

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }))
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: { src: string; alt: string }) => <img src={props.src} alt={props.alt} />,
}))
vi.mock('@/hooks/useRescue', () => ({
  useRescue: () => ({ rescue: h.rescue, loading: false, updateRescue: vi.fn() }),
}))
vi.mock('@/hooks/usePets', () => ({
  usePets: () => ({ pets: h.pets, loading: false, refetch: h.refetch }),
}))

import RescueDashboardPage from './page'

const RESCUE: Rescue = {
  id: 'rescue-1', user_id: 'user-1', name: 'Heartland Paws Rescue', city: 'Wichita, KS',
  mission: null, logo: '🧡', banner_gradient: '', phone: null, email: null, website: null,
  hours: null, appointment_required: false, animal_types: ['Dogs'],
  requirements: {} as Rescue['requirements'], fee_range: null, requirement_notes: null,
  ein: '12-3456789', verified: true, verified_at: null, published: true,
  stats: { animals: 3, placed: 47, apps: 0 } as Rescue['stats'],
  created_at: '', updated_at: '',
}

const MAPLE: Pet = {
  id: 'pet-maple', rescue_id: 'rescue-1', name: 'Maple', species: 'dog', breed: 'Beagle Mix',
  age: '2 years', gender: 'Female', size: 'Medium', energy: null, traits: ['Playful'],
  description: 'Loves walks.', fee: 15000,
  photos: ['https://cdn.test/pet-photos/maple-1.jpg', 'https://cdn.test/pet-photos/maple-2.jpg'],
  status: 'available', good_with: [], created_at: '', updated_at: '',
}

const writes = () => h.calls.filter(c => c.op !== 'select')

async function openEditor() {
  const user = userEvent.setup()
  render(<RescueDashboardPage />)
  await user.click(await screen.findByTitle('Edit this listing'))
  return user
}

beforeEach(() => {
  h.calls = []
  h.uploads = []
  h.refetch = vi.fn()
  h.pets = [MAPLE]
  h.rescue = RESCUE
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
})

describe('rescue dashboard — edit pet', () => {
  it('opens the form prefilled with the listing, including its existing photos', async () => {
    await openEditor()

    expect(screen.getByRole('heading', { name: 'Edit Maple' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Buddy')).toHaveValue('Maple')
    expect(screen.getByPlaceholderText('Golden Retriever')).toHaveValue('Beagle Mix')
    expect(screen.getAllByRole('button', { name: 'Remove photo' })).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument()
    // Batch-add is for new listings only
    expect(screen.queryByRole('button', { name: /Add & add another/ })).not.toBeInTheDocument()
  })

  it('saves changes as an UPDATE of that pet — no new row, no animal-count bump', async () => {
    const user = await openEditor()

    const breed = screen.getByPlaceholderText('Golden Retriever')
    await user.clear(breed)
    await user.type(breed, 'Beagle')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(h.refetch).toHaveBeenCalled())
    expect(writes()).toEqual([
      expect.objectContaining({
        table: 'pets',
        op: 'update',
        eq: [['id', 'pet-maple']],
        payload: expect.objectContaining({
          name: 'Maple',
          breed: 'Beagle',
          fee: 15000,
          traits: ['Playful'],
          photos: MAPLE.photos,
        }),
      }),
    ])
    // Form closes after saving
    expect(screen.queryByRole('heading', { name: 'Edit Maple' })).not.toBeInTheDocument()
  })

  it('removing an existing photo drops it from the saved listing', async () => {
    const user = await openEditor()

    await user.click(screen.getAllByRole('button', { name: 'Remove photo' })[0])
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(h.refetch).toHaveBeenCalled())
    expect(writes()[0].payload).toEqual(expect.objectContaining({ photos: [MAPLE.photos[1]] }))
  })

  it('new photos are uploaded and appended after the existing ones', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:preview-1')
    const user = await openEditor()

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(fileInput, { target: { files: [new File(['x'], 'new.jpg', { type: 'image/jpeg' })] } })
    expect(screen.getAllByRole('button', { name: 'Remove photo' })).toHaveLength(3)

    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(h.refetch).toHaveBeenCalled())
    expect(h.uploads).toHaveLength(1)
    expect(h.uploads[0]).toMatch(/^rescue-1\/\d+-0\.jpg$/)
    expect(writes()[0].payload).toEqual(expect.objectContaining({
      photos: [...MAPLE.photos, `https://cdn.test/pet-photos/${h.uploads[0]}`],
    }))
  })

  it('"Add new pet" after editing starts a blank listing that INSERTs and bumps the count', async () => {
    const user = await openEditor()
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(h.refetch).toHaveBeenCalled())
    h.calls = []

    await user.click(screen.getByRole('button', { name: /Add new pet/ }))
    expect(screen.getByRole('heading', { name: 'New pet listing' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Buddy')).toHaveValue('')

    await user.type(screen.getByPlaceholderText('Buddy'), 'Otis')
    await user.click(screen.getByRole('button', { name: 'Add & close' }))

    await waitFor(() => expect(writes()).toHaveLength(2))
    expect(writes()[0]).toEqual(expect.objectContaining({
      table: 'pets', op: 'insert',
      payload: expect.objectContaining({ name: 'Otis', rescue_id: 'rescue-1', status: 'available', photos: [] }),
    }))
    expect(writes()[1]).toEqual(expect.objectContaining({
      table: 'rescues', op: 'update',
      payload: { stats: expect.objectContaining({ animals: 4 }) },
    }))
  })

  it('closing the editor without saving writes nothing', async () => {
    const user = await openEditor()
    await user.clear(screen.getByPlaceholderText('Buddy'))
    // The close (X) button sits next to the form heading
    const heading = screen.getByRole('heading', { name: /Edit/ })
    await user.click(heading.parentElement!.querySelector('button')!)

    expect(screen.queryByRole('heading', { name: /Edit/ })).not.toBeInTheDocument()
    expect(writes()).toHaveLength(0)
  })
})
