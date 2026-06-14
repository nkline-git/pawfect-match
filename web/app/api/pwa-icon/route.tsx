import { ImageResponse } from 'next/og'
import { type NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const size = Math.min(512, Math.max(16, parseInt(searchParams.get('size') ?? '192', 10)))

  const radius = Math.round(size * 0.22)
  const emojiSize = Math.round(size * 0.58)

  return new ImageResponse(
    (
      <div
        style={{
          background: '#e05a4e',
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radius,
        }}
      >
        <div style={{ fontSize: emojiSize, display: 'flex' }}>🐾</div>
      </div>
    ),
    { width: size, height: size },
  )
}
