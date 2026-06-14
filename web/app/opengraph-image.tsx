import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Pawfect Match — Find Your Perfect Rescue Pet'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #e05a4e 0%, #b84a3e 60%, #8b3530 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Soft decorative circles */}
        <div style={{
          position: 'absolute', top: -120, right: -120,
          width: 500, height: 500,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute', bottom: -80, left: -80,
          width: 350, height: 350,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
          display: 'flex',
        }} />

        {/* Paw icon */}
        <div style={{
          fontSize: 110,
          marginBottom: 28,
          display: 'flex',
          filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.25))',
        }}>
          🐾
        </div>

        {/* Title */}
        <div style={{
          color: 'white',
          fontSize: 76,
          fontWeight: 800,
          letterSpacing: '-1px',
          textShadow: '0 2px 12px rgba(0,0,0,0.3)',
          display: 'flex',
        }}>
          Pawfect Match
        </div>

        {/* Tagline */}
        <div style={{
          color: 'rgba(255,255,255,0.82)',
          fontSize: 34,
          marginTop: 20,
          fontWeight: 400,
          display: 'flex',
        }}>
          Swipe to find your perfect rescue pet
        </div>

        {/* Bottom badge */}
        <div style={{
          position: 'absolute',
          bottom: 44,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'rgba(255,255,255,0.14)',
          borderRadius: 40,
          padding: '10px 28px',
        }}>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 22, display: 'flex' }}>
            Dogs · Cats · Rabbits · and more
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
