import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-72" />
                </div>
                <Skeleton className="h-10 w-36" />
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="rounded-xl border border-border bg-card p-5">
                        <div className="flex items-center justify-between">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-8 w-8 rounded-lg" />
                        </div>
                        <Skeleton className="mt-3 h-7 w-16" />
                        <Skeleton className="mt-2 h-3 w-32" />
                    </div>
                ))}
            </div>

            {/* Content area */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6">
                    <Skeleton className="h-5 w-40 mb-4" />
                    <Skeleton className="h-64 w-full" />
                </div>
                <div className="rounded-xl border border-border bg-card p-6">
                    <Skeleton className="h-5 w-36 mb-4" />
                    <div className="space-y-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center gap-3">
                                <Skeleton className="h-9 w-9 rounded-full" />
                                <div className="flex-1 space-y-1.5">
                                    <Skeleton className="h-3.5 w-3/4" />
                                    <Skeleton className="h-3 w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
