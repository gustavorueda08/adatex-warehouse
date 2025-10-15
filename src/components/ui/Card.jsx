"use client";

// Skeleton Loading Components
function SkeletonLine({ className = "" }) {
  return (
    <div
      className={`animate-pulse bg-zinc-700/50 rounded ${className}`}
      style={{
        backgroundImage:
          "linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s infinite",
      }}
    />
  );
}

function SkeletonCircle({ className = "" }) {
  return (
    <div
      className={`animate-pulse bg-zinc-700/50 rounded-full ${className}`}
      style={{
        backgroundImage:
          "linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s infinite",
      }}
    />
  );
}

export default function Card({ children, className = "", loading = false, ...props }) {
  return (
    <div
      className={`bg-zinc-800 rounded-lg border border-zinc-700 shadow-sm ${className}`}
      {...props}
    >
      {loading ? <CardSkeleton /> : children}
      <style jsx global>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
      `}</style>
    </div>
  );
}

export function CardHeader({ children, className = "", loading = false, ...props }) {
  if (loading) {
    return (
      <div className={`p-6 pb-4 ${className}`} {...props}>
        <SkeletonLine className="h-6 w-1/3 mb-2" />
        <SkeletonLine className="h-4 w-1/2" />
      </div>
    );
  }

  return (
    <div className={`p-6 pb-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = "", loading = false, ...props }) {
  if (loading) {
    return <SkeletonLine className={`h-6 w-32 ${className}`} />;
  }

  return (
    <h3 className={`text-xl font-semibold text-white ${className}`} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className = "", loading = false, ...props }) {
  if (loading) {
    return <SkeletonLine className={`h-4 w-48 mt-1 ${className}`} />;
  }

  return (
    <p className={`text-sm text-gray-400 mt-1 ${className}`} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ children, className = "", loading = false, ...props }) {
  if (loading) {
    return (
      <div className={`p-6 pt-0 ${className}`} {...props}>
        <div className="space-y-3">
          <SkeletonLine className="h-8 w-2/3" />
          <SkeletonLine className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 pt-0 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = "", loading = false, ...props }) {
  if (loading) {
    return (
      <div className={`p-6 pt-0 flex items-center gap-2 ${className}`} {...props}>
        <SkeletonLine className="h-10 w-24" />
        <SkeletonLine className="h-10 w-24" />
      </div>
    );
  }

  return (
    <div className={`p-6 pt-0 flex items-center gap-2 ${className}`} {...props}>
      {children}
    </div>
  );
}

// Skeleton completo para Card
function CardSkeleton() {
  return (
    <div className="p-6">
      <div className="space-y-4">
        <SkeletonLine className="h-6 w-1/3" />
        <SkeletonLine className="h-8 w-2/3" />
        <SkeletonLine className="h-4 w-1/2" />
      </div>
    </div>
  );
}

// Skeleton específico para stat cards
export function StatCardSkeleton() {
  return (
    <div className="p-6">
      <div className="flex flex-row items-center justify-between pb-2">
        <SkeletonLine className="h-4 w-24" />
        <SkeletonCircle className="h-4 w-4" />
      </div>
      <div className="mt-4">
        <SkeletonLine className="h-8 w-32 mb-2" />
        <SkeletonLine className="h-3 w-40" />
      </div>
    </div>
  );
}

// Skeleton para listas (ventas recientes, productos)
export function ListCardSkeleton({ items = 5 }) {
  return (
    <div className="p-6">
      <div className="space-y-2 mb-4">
        <SkeletonLine className="h-6 w-1/3" />
        <SkeletonLine className="h-4 w-1/2" />
      </div>
      <div className="space-y-4 mt-6">
        {Array.from({ length: items }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <SkeletonCircle className="h-9 w-9" />
              <div className="space-y-2 flex-1">
                <SkeletonLine className="h-4 w-1/3" />
                <SkeletonLine className="h-3 w-1/4" />
              </div>
            </div>
            <SkeletonLine className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Skeleton para productos top con barras de progreso
export function TopProductsSkeleton({ items = 4 }) {
  return (
    <div className="p-6">
      <div className="space-y-2 mb-4">
        <SkeletonLine className="h-6 w-1/3" />
        <SkeletonLine className="h-4 w-2/3" />
      </div>
      <div className="space-y-4 mt-6">
        {Array.from({ length: items }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center justify-between">
              <SkeletonLine className="h-4 w-1/3" />
              <SkeletonLine className="h-4 w-16" />
            </div>
            <div className="flex items-center gap-2">
              <SkeletonLine className="h-2 flex-1" />
              <SkeletonLine className="h-3 w-12" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
