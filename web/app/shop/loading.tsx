export default function ShopLoading() {
  return (
    <div className="h-dvh flex items-start justify-center px-3 py-2 overflow-hidden">
      <div className="w-full max-w-[390px] h-full flex flex-col overflow-hidden">

        {/* Header skeleton */}
        <div className="flex items-center justify-between px-4 py-3 bg-white rounded-2xl shadow-sm mb-3">
          <div className="h-6 w-24 bg-gray-200 rounded-full animate-pulse" />
          <div className="h-8 w-32 bg-gray-200 rounded-full animate-pulse" />
        </div>

        {/* Search bar skeleton */}
        <div className="h-10 bg-white rounded-2xl shadow-sm mb-3 animate-pulse" />

        {/* Store card skeletons */}
        <div className="flex-1 space-y-3 overflow-hidden">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {/* Banner */}
              <div className="h-20 bg-gray-200 animate-pulse" />
              <div className="p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-gray-200 animate-pulse flex-shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-4 w-32 bg-gray-200 rounded-full animate-pulse" />
                    <div className="h-3 w-20 bg-gray-100 rounded-full animate-pulse" />
                  </div>
                </div>
                {i === 0 && (
                  <div className="h-3 w-full bg-gray-100 rounded-full animate-pulse" />
                )}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
