'use client';

import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, MessageSquare, ArrowLeftRight, CheckCircle, TrendingUp } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useSidebar } from '../components/SidebarContext';
import { useActivity } from '../components/ActivityContext';

function useCountUp(target: number, duration = 1200): number {
    const [value, setValue] = useState(0);
    useEffect(() => {
        if (!target) return;
        const start = Date.now();
        const tick = () => {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // cubic ease-out
            setValue(Math.round(target * eased));
            if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }, [target, duration]);
    return value;
}

const TREND = [42, 58, 51, 70, 63, 82, 91];
const TREND_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function AreaChart({ data, days }: { data: number[]; days: string[] }) {
    const max = Math.max(...data);
    const range = max || 1;
    const width = 520, height = 200, padL = 24, padR = 12, padT = 12, padB = 24;
    const innerW = width - padL - padR;
    const innerH = height - padT - padB;
    const step = innerW / (data.length - 1);
    const px = (i: number) => padL + i * step;
    const py = (v: number) => padT + (1 - v / range) * innerH;
    const line = data.map((v, i) => `${i === 0 ? 'M' : 'L'}${px(i)},${py(v)}`).join(' ');
    const area = `${line} L${px(data.length - 1)},${padT + innerH} L${padL},${padT + innerH} Z`;
    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-56">
            <defs>
                <linearGradient id="dashArea" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
            </defs>
            {[0.25, 0.5, 0.75, 1].map((f, i) => {
                const y = padT + (1 - f) * innerH;
                return <line key={i} x1={padL} y1={y} x2={width - padR} y2={y} stroke="#f3f4f6" strokeDasharray="3 3" />;
            })}
            <path d={area} fill="url(#dashArea)" />
            <path d={line} fill="none" stroke="#7c3aed" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            {data.map((v, i) => {
                const last = i === data.length - 1;
                return <circle key={i} cx={px(i)} cy={py(v)} r={last ? 5 : 3} fill="white" stroke="#7c3aed" strokeWidth={2} />;
            })}
            {days.map((d, i) => (
                <text key={d} x={px(i)} y={height - 6} textAnchor="middle" fontSize="10" fill="#9ca3af">{d}</text>
            ))}
        </svg>
    );
}

export default function DashboardPage() {
    const { toggle } = useSidebar();
    const [metrics, setMetrics] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('today');
    const [latestBooking, setLatestBooking] = useState<any>(null);

    const { activity } = useActivity();

    useEffect(() => {
        const booking = activity.find(a => a.type === 'booking_created');
        if (booking) setLatestBooking(booking.payload);
    }, [activity]);

    useEffect(() => {
        fetchMetrics();
    }, [period]);

    const fetchMetrics = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/analytics/overview?period=${period}`);
            const data = await res.json();
            setMetrics(data.metrics);
        } catch (error) {
            console.error('Failed to fetch metrics', error);
        } finally {
            setLoading(false);
        }
    };

    const animTotalConversations = useCountUp(metrics?.totalConversations ?? 0);
    const animActiveHandoffs = useCountUp(metrics?.activeHandoffs ?? 0);
    const animAiResolutionRate = useCountUp(metrics?.aiResolutionRate ?? 0);
    const animAvgIntentScore = useCountUp(metrics?.avgIntentScore ?? 0);

    const stats = [
        {
            title: 'Total Conversations',
            value: animTotalConversations,
            sub: 'In selected period',
            icon: MessageSquare,
            iconBg: 'bg-violet-100 text-violet-600',
        },
        {
            title: 'Active Handoffs',
            value: animActiveHandoffs,
            sub: 'Awaiting action',
            icon: ArrowLeftRight,
            iconBg: 'bg-amber-100 text-amber-600',
        },
        {
            title: 'AI Resolution Rate',
            value: `${animAiResolutionRate}%`,
            sub: 'Without human help',
            icon: CheckCircle,
            iconBg: 'bg-emerald-100 text-emerald-600',
        },
        {
            title: 'Avg Intent Score',
            value: animAvgIntentScore,
            sub: 'Sales potential',
            icon: TrendingUp,
            iconBg: 'bg-indigo-100 text-indigo-600',
        },
    ];

    return (
        <div>
            <PageHeader
                title="Dashboard"
                subtitle="Overview of your assistant's performance"
                toggleSidebar={toggle}
                actions={
                    <Select value={period} onValueChange={setPeriod}>
                        <SelectTrigger className="w-[160px] bg-white border-gray-200 rounded-lg">
                            <SelectValue placeholder="Period" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="7d">Last 7 days</SelectItem>
                            <SelectItem value="30d">Last 30 days</SelectItem>
                        </SelectContent>
                    </Select>
                }
            />

            {loading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
                </div>
            ) : (
                <>
                    {latestBooking && (
                        <div className="mb-4 bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-4 flex items-center justify-between animate-pulse">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shrink-0">
                                    <span className="text-white text-lg font-bold">✓</span>
                                </div>
                                <div>
                                    <p className="font-bold text-emerald-800">New Booking Confirmed!</p>
                                    <p className="text-sm text-emerald-600">
                                        {latestBooking.bookingNumber} — {latestBooking.serviceName} — {latestBooking.customerName}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setLatestBooking(null)}
                                className="text-emerald-400 hover:text-emerald-600 text-xl font-bold ml-4"
                                aria-label="Close"
                            >
                                ✕
                            </button>
                        </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
                        {stats.map((s) => {
                            const Icon = s.icon;
                            return (
                                <div
                                    key={s.title}
                                    className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="text-sm text-gray-500 font-medium">{s.title}</div>
                                        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${s.iconBg}`}>
                                            <Icon className="h-4 w-4" />
                                        </div>
                                    </div>
                                    <div className="text-3xl font-bold text-gray-900 tracking-tight">{s.value}</div>
                                    <div className="text-xs text-gray-500 mt-1">{s.sub}</div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="grid gap-4 lg:grid-cols-3">
                        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Overview</h2>
                                    <p className="text-xs text-gray-500">Conversation trend for the selected period</p>
                                </div>
                            </div>
                            <AreaChart data={TREND} days={TREND_DAYS} />
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                            <div className="mb-4">
                                <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
                                <p className="text-xs text-gray-500">Latest system updates</p>
                            </div>
                            <div className="space-y-4">
                                {activity.length === 0 ? (
                                    <div className="flex items-start gap-3">
                                        <div className="h-2 w-2 rounded-full bg-emerald-500 mt-2 shrink-0" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">System Ready</p>
                                            <p className="text-xs text-gray-500">Dashboard ready — waiting for activity</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {activity.slice(0, 8).map((item) => {
                                            const configs: Record<string, { dot: string; icon: string; label: string | ((p: any) => string) }> = {
                                                new_chat: { dot: 'bg-violet-500', icon: '💬', label: 'New customer started a chat' },
                                                booking_created: { dot: 'bg-emerald-500', icon: '📅', label: (p: any) => `Booking: ${p.bookingNumber} — ${p.serviceName}` },
                                                escalation: { dot: 'bg-red-500', icon: '🚨', label: (p: any) => `Escalation: customer ${p.mood}` },
                                            };
                                            const cfg = configs[item.type];
                                            if (!cfg) return null;
                                            const label = typeof cfg.label === 'function' ? cfg.label(item.payload) : cfg.label;
                                            return (
                                                <div key={item.id} className="flex items-start gap-3">
                                                    <div className={`h-2 w-2 rounded-full ${cfg.dot} mt-2 shrink-0`} />
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">{cfg.icon} {label}</p>
                                                        <p className="text-xs text-gray-500">
                                                            {new Date(item.payload?.timestamp || Date.now()).toLocaleTimeString('en-US')}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
