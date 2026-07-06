'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Settings as SettingsIcon,
    Bell,
    Shield,
    Database,
    Bot,
    MessageSquare,
    Save,
    RefreshCw,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useSidebar } from '../components/SidebarContext';

function Pill({ tone, label }: { tone: 'success' | 'muted' | 'warning'; label: string }) {
    const map: Record<string, string> = {
        success: 'bg-emerald-100 text-emerald-700',
        muted: 'bg-gray-100 text-gray-600',
        warning: 'bg-amber-100 text-amber-700',
    };
    return <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${map[tone]}`}>{label}</span>;
}

function SectionCard({
    icon: Icon,
    title,
    description,
    children,
}: {
    icon: any;
    title: string;
    description: string;
    children: React.ReactNode;
}) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-start gap-3 mb-5">
                <div className="h-10 w-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                </div>
                <div>
                    <h3 className="font-bold text-gray-900">{title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{description}</p>
                </div>
            </div>
            <div className="space-y-4">{children}</div>
        </div>
    );
}

function ToggleRow({ title, desc, badge }: { title: string; desc: string; badge: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-3">
            <div>
                <p className="font-medium text-sm text-gray-900">{title}</p>
                <p className="text-xs text-gray-500">{desc}</p>
            </div>
            {badge}
        </div>
    );
}

export default function SettingsPage() {
    const { toggle } = useSidebar();
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setSaving(false);
    };

    return (
        <div>
            <PageHeader
                title="Settings"
                subtitle="Configure the dashboard and integrations"
                toggleSidebar={toggle}
                actions={
                    <Button onClick={handleSave} disabled={saving} className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg">
                        {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        Save Changes
                    </Button>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <SectionCard
                    icon={SettingsIcon}
                    title="General Settings"
                    description="Basic admin dashboard configuration"
                >
                    <div className="space-y-2">
                        <Label htmlFor="clinicName" className="text-xs text-gray-600">Business Name</Label>
                        <Input id="clinicName" defaultValue="Glow Aesthetics" className="bg-gray-50 border-gray-200 rounded-lg" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="timezone" className="text-xs text-gray-600">Timezone</Label>
                        <Input id="timezone" defaultValue="Asia/Jakarta (WIB)" disabled className="bg-gray-50 border-gray-200 rounded-lg" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="language" className="text-xs text-gray-600">Language</Label>
                        <Input id="language" defaultValue="English & Indonesian" disabled className="bg-gray-50 border-gray-200 rounded-lg" />
                    </div>
                </SectionCard>

                <SectionCard
                    icon={Bell}
                    title="Notifications"
                    description="Manage notification preferences"
                >
                    <ToggleRow title="New Handoff Alert" desc="Notify when a handoff is requested" badge={<Pill tone="success" label="On" />} />
                    <ToggleRow title="Escalation Alert" desc="Notify for escalated conversations" badge={<Pill tone="success" label="On" />} />
                    <ToggleRow title="Daily Summary" desc="Receive a daily analytics summary" badge={<Pill tone="muted" label="Off" />} />
                </SectionCard>

                <SectionCard
                    icon={Bot}
                    title="AI Configuration"
                    description="Configure AI chatbot behavior"
                >
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-600">AI Model</Label>
                        <div className="flex items-center gap-2">
                            <Input defaultValue="Claude 4.5 Haiku" disabled className="bg-gray-50 border-gray-200 rounded-lg" />
                            <Pill tone="success" label="Active" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-600">Auto-Handoff Threshold</Label>
                        <Input type="number" defaultValue="3" className="bg-gray-50 border-gray-200 rounded-lg" />
                        <p className="text-xs text-gray-500">Number of failures before suggesting a handoff</p>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-600">Response Style</Label>
                        <Input defaultValue="Professional & Friendly" disabled className="bg-gray-50 border-gray-200 rounded-lg" />
                    </div>
                </SectionCard>

                <SectionCard
                    icon={Shield}
                    title="Security"
                    description="Security and access settings"
                >
                    <ToggleRow title="Session Duration" desc="Auto logout after inactivity" badge={<Pill tone="muted" label="7 days" />} />
                    <ToggleRow title="Two-Factor Auth" desc="Extra security layer" badge={<Pill tone="warning" label="Not set" />} />
                    <ToggleRow title="Audit Logging" desc="Log all admin actions" badge={<Pill tone="success" label="On" />} />
                </SectionCard>

                <SectionCard
                    icon={Database}
                    title="Database"
                    description="Database connection info"
                >
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Status</span>
                        <Pill tone="success" label="Connected" />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Type</span>
                        <span className="text-gray-900">PostgreSQL 16</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Host</span>
                        <span className="font-mono text-xs text-gray-700">localhost:5433</span>
                    </div>
                </SectionCard>

                <SectionCard
                    icon={MessageSquare}
                    title="Integrations"
                    description="Connected service status"
                >
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-900">WhatsApp Business</span>
                        <Pill tone="muted" label="Not connected" />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-900">Pinecone (Vector DB)</span>
                        <Pill tone="success" label="Connected" />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-900">Anthropic API</span>
                        <Pill tone="success" label="Connected" />
                    </div>
                </SectionCard>
            </div>

            <div className="text-center text-xs text-gray-400 mt-6 space-y-0.5">
                <p>Some settings are read-only in demo mode.</p>
                <p>Contact an administrator to change system configuration.</p>
            </div>
        </div>
    );
}
