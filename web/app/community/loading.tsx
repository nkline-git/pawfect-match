export default function CommunityLoading() {
  return (
    <div className="h-dvh flex items-start justify-center px-3 py-2 overflow-hidden">
      <div className="w-full max-w-[390px] h-full flex flex-col overflow-hidden">

        {/* Header skeleton */}
        <div className="flex items-center justify-between px-4 py-3 bg-white rounded-2xl shadow-sm mb-3">
          <div className="h-6 w-28 bg-gray-200 rounded-full animate-pulse" />
          <div className="h-8 w-24 bg-gray-200 rounded-full animate-pulse" />
        </div>

        {/* Post skeletons */}
        <div className="flex-1 space-y-3 overflow-hidden">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
              {/* Author row */}
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3.5 w-24 bg-gray-200 rounded-full animate-pulse" />
                  <div className="h-3 w-16 bg-gray-100 rounded-full animate-pulse" />
                </div>
              </div>
              {/* Content lines */}
              <div className="space-y-2">
                <div className="h-3.5 w-full bg-gray-100 rounded-full animate-pulse" />
                <div className="h-3.5 w-5/6 bg-gray-100 rounded-full animate-pulse" />
                {i === 0 && <div className="h-3.5 w-2/3 bg-gray-100 rounded-full animate-pulse" />}
              </div>
              {/* Reactions row */}
              <div className="flex gap-3">
                <div className="h-6 w-14 bg-gray-100 rounded-full animate-pulse" />
                <div className="h-6 w-14 bg-gray-100 rounded-full animate-pulse" />
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
