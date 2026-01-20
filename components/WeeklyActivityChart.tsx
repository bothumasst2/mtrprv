import { useState, useMemo } from "react"
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    XAxis,
    YAxis,
    Tooltip,
} from "recharts"
import { endOfWeek, format, eachWeekOfInterval, subWeeks, startOfWeek } from "date-fns"
import { ChartContainer } from "@/components/ui/chart"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

interface WeeklyActivityChartProps {
    logs: Array<{
        date: string
        distance: number
        training_type: string
    }>
}

export function WeeklyActivityChart({ logs }: WeeklyActivityChartProps) {
    const [selectedWeekIndex, setSelectedWeekIndex] = useState<number | null>(null)

    const chartData = useMemo(() => {
        const now = new Date()
        const weeks = eachWeekOfInterval(
            {
                start: subWeeks(now, 11),
                end: now,
            },
            { weekStartsOn: 1 }
        )

        return weeks.map((weekStart) => {
            const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })

            const weeklyLogs = logs.filter((log) => {
                const logDate = new Date(log.date)
                return logDate >= weekStart && logDate <= weekEnd
            })

            const totalDistance = weeklyLogs.reduce((sum, log) => sum + log.distance, 0)

            return {
                week: format(weekStart, "MMM"),
                weekLabel: format(weekStart, "d MMM"),
                weekRange: `${format(weekStart, "d")} - ${format(weekEnd, "d MMMM")}`,
                distance: Number(totalDistance.toFixed(1)),
                activities: weeklyLogs.length,
            }
        })
    }, [logs])

    const activeWeek = selectedWeekIndex !== null ? chartData[selectedWeekIndex] : chartData[chartData.length - 1]

    const chartConfig = {
        distance: {
            label: "Distance",
            color: "#fc4c02",
        },
    }

    const handleChartClick = (state: any) => {
        if (state && state.activeTooltipIndex !== undefined) {
            setSelectedWeekIndex(state.activeTooltipIndex)
        }
    }

    return (
        <Card className="bg-[#1f1f1f] border-none shadow-sm rounded-lg overflow-hidden">
            <CardHeader className="pb-2 pt-4 px-4">
                <div className="space-y-5">
                    <div className="flex flex-col">
                        <h2 className="text-lg font-bold text-white transition-opacity duration-200">
                            {activeWeek?.weekRange}
                        </h2>
                    </div>

                    <div className="flex gap-8">
                        <div className="space-y-1">
                            <p className="text-[10px] text-gray-400  font-medium tracking-wider">Distance</p>
                            <p className="text-2xl font-bold text-strava tabular-nums">
                                {activeWeek?.distance} <span className="text-sm font-normal text-gray-400">km</span>
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] text-gray-400 font-medium tracking-wider">Activities</p>
                            <p className="text-2xl font-bold text-strava tabular-nums">
                                {activeWeek?.activities}
                            </p>
                        </div>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="px-0 pb-0">
                <div className="h-[220px] w-full mt-4 mb-4">
                    <ChartContainer config={chartConfig} className="w-full h-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                data={chartData}
                                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                                onClick={handleChartClick}
                            >
                                <defs>
                                    <linearGradient id="colorDistance" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#fc4c02" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#fc4c02" stopOpacity={0.05} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid
                                    vertical={true}
                                    horizontal={true}
                                    strokeDasharray="0"
                                    stroke="#333"
                                    opacity={0.5}
                                />
                                <XAxis
                                    dataKey="weekRange"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#888', fontSize: 10 }}
                                    tickFormatter={(val, index) => {
                                        // Only show the label if it's the first occurrence of that month in the current view
                                        const dateStr = chartData[index]?.week
                                        const prevDateStr = index > 0 ? chartData[index - 1]?.week : null
                                        return dateStr !== prevDateStr ? dateStr : ""
                                    }}
                                    interval={0}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#888', fontSize: 10 }}
                                    tickFormatter={(val) => `${val} km`}
                                    dx={-10}
                                />
                                <Tooltip
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload
                                            return (
                                                <div className="bg-[#1a1a1a] border border-[#333] p-3 rounded shadow-xl">
                                                    <p className="text-[10px] text-gray-400 mb-1">{data.weekRange}</p>
                                                    <p className="text-sm font-bold">
                                                        <span className="text-[#fc4c02]">{data.distance} km</span>
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 mt-1">{data.activities} Activites</p>
                                                </div>
                                            )
                                        }
                                        return null
                                    }}
                                    cursor={{ stroke: '#fc4c02', strokeWidth: 1.5 }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="distance"
                                    stroke="#fc4c02"
                                    strokeWidth={2.5}
                                    fillOpacity={1}
                                    fill="url(#colorDistance)"
                                    dot={({ cx, cy, index }) => (
                                        <circle
                                            key={`dot-${index}`}
                                            cx={cx}
                                            cy={cy}
                                            r={index === (selectedWeekIndex ?? chartData.length - 1) ? 6 : 4}
                                            fill="#fc4c02"
                                            stroke={index === (selectedWeekIndex ?? chartData.length - 1) ? "#fff" : "none"}
                                            strokeWidth={2}
                                        />
                                    )}
                                    activeDot={{ r: 6, fill: "#fc4c02", stroke: "#fff", strokeWidth: 2 }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </div>
            </CardContent>

            <style>{`
                .recharts-wrapper,
                .recharts-wrapper *,
                .recharts-surface,
                .recharts-surface *,
                svg,
                svg * {
                    outline: none !important;
                }
                
                .recharts-wrapper:focus,
                .recharts-surface:focus,
                svg:focus {
                    outline: none !important;
                }

                * {
                    -webkit-tap-highlight-color: transparent;
                }
            `}</style>
        </Card>
    )
}