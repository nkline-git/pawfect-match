export default function SavedLoading() {
  return (
    <div className="h-dvh flex items-start justify-center px-3 py-2 overflow-hidden">
      <div className="w-full max-w-[390px] h-full flex flex-col overflow-hidden">

        {/* Header skeleton */}
        <div className="flex items-center justify-between px-4 py-3 bg-white rounded-2xl shadow-sm mb-3">
          <div className="h-6 w-32 bg-gray-200 rounded-full animate-pulse" />
          <div className="h-7 w-7 bg-gray-200 rounded-full animate-pulse" />
        </div>

        {/* Card skeletons */}
        <div className="flex-1 space-y-3 overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm overflow-hidden flex">
              <div className="w-24 h-24 flex-shrink-0 bg-gray-200 animate-pulse" />
              <div className="flex-1 px-3 py-2.5 space-y-2">
                <div className="h-4 w-24 bg-gray-200 rounded-full animate-pulse" />
                <div className="h-3 w-36 bg-gray-100 rounded-full animate-pulse" />
                <div className="h-3 w-20 bg-gray-100 rounded-full animate-pulse" />
                <div className="flex gap-2 mt-1">
                  <div className="h-6 w-14 bg-gray-200 rounded-full animate-pulse" />
                  <div className="h-6 w-16 bg-gray-100 rounded-full animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
