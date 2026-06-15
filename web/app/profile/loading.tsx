export default function ProfileLoading() {
  return (
    <div className="h-dvh flex items-start justify-center px-3 py-2 overflow-hidden">
      <div className="w-full max-w-[390px] h-full flex flex-col overflow-hidden">

        {/* Header skeleton */}
        <div className="flex items-center justify-between px-4 py-3 bg-white rounded-2xl shadow-sm mb-3">
          <div className="h-6 w-24 bg-gray-200 rounded-full animate-pulse" />
          <div className="h-8 w-16 bg-gray-200 rounded-full animate-pulse" />
        </div>

        <div className="flex-1 overflow-hidden space-y-3">
          {/* Avatar + name card */}
          <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-full bg-gray-200 animate-pulse" />
            <div className="h-5 w-32 bg-gray-200 rounded-full animate-pulse" />
            <div className="h-3.5 w-20 bg-gray-100 rounded-full animate-pulse" />
          </div>

          {/* Stats row */}
          <div className="bg-white rounded-2xl shadow-sm p-4 flex justify-around">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <div className="h-6 w-8 bg-gray-200 rounded-full animate-pulse" />
                <div className="h-3 w-14 bg-gray-100 rounded-full animate-pulse" />
              </div>
            ))}
          </div>

          {/* Info rows */}
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm px-4 py-3 flex items-center justify-between">
              <div className="h-4 w-28 bg-gray-200 rounded-full animate-pulse" />
              <div className="h-4 w-16 bg-gray-100 rounded-full animate-pulse" />
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
