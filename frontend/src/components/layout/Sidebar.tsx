'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Shield,
  FileCheck,
  Users,
  FilePlus,
  ScrollText,
  Activity,
  Lock,
  Cpu,
  Radio,
  RefreshCw,
  Key,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navSections = [
  {
    label: 'PKI Core',
    items: [
      { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/cas', icon: Shield, label: 'Certificate Authorities' },
      { href: '/certificates', icon: FileCheck, label: 'Certificates' },
      { href: '/endentities', icon: Users, label: 'End Entities' },
      { href: '/enrollment', icon: FilePlus, label: 'Enrollment' },
      { href: '/crl', icon: ScrollText, label: 'CRL Management' },
      { href: '/health', icon: Activity, label: 'Health Monitor' },
    ],
  },
  {
    label: 'IoT Fleet',
    items: [
      { href: '/iot-devices', icon: Cpu, label: 'IoT Devices' },
      { href: '/iot-protocols', icon: Radio, label: 'IoT Protocols' },
      { href: '/clm', icon: RefreshCw, label: 'Cert Lifecycle (CLM)' },
    ],
  },
  {
    label: 'Cloud Security',
    items: [
      { href: '/aws-kms', icon: Key, label: 'AWS KMS / CloudHSM' },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-slate-900 border-r border-slate-800">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600">
          <Lock className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="text-sm font-bold text-white">EJBCA PKI</div>
          <div className="text-xs text-slate-500">Management Console</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {navSections.map(section => (
          <div key={section.label}>
            <div className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
              {section.label}
            </div>
            <div className="space-y-0.5">
              {section.items.map(({ href, icon: Icon, label }) => {
                const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      active
                        ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    )}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-800">
        <div className="text-xs text-slate-600">EJBCA Community Edition</div>
        <div className="text-xs text-slate-700">PKI Management UI v1.0</div>
      </div>
    </aside>
  );
}
