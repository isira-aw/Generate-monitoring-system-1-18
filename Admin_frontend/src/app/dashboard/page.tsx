'use client';

import React, { useEffect, useState } from 'react';
import ProtectedLayout from '@/components/ProtectedLayout';
import { statsApi } from '@/lib/api';
import { Users, Monitor, Wifi, KeyRound } from 'lucide-react';

interface Stats {
  totalAdmins: number;
  totalDevices: number;
  activeDevices: number;
  licensedDevices: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await statsApi.getDashboard();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = stats
    ? [
        {
          label: 'Total Admins',
          value: stats.totalAdmins,
          icon: Users,
          bgColor: 'bg-[#1E40AF]/10',
          textColor: 'text-[#1E40AF]',
        },
        {
          label: 'Total Devices',
          value: stats.totalDevices,
          icon: Monitor,
          bgColor: 'bg-[#1E40AF]/10',
          textColor: 'text-[#1E40AF]',
        },
        {
          label: 'Active Devices',
          value: stats.activeDevices,
          icon: Wifi,
          bgColor: 'bg-[#1E40AF]/10',
          textColor: 'text-[#1E40AF]',
        },
        {
          label: 'Licensed Devices',
          value: stats.licensedDevices,
          icon: KeyRound,
          bgColor: 'bg-[#1E40AF]/10',
          textColor: 'text-[#1E40AF]',
        },
      ]
    : [];

  return (
    <ProtectedLayout>
      <div>
        <h1 className="text-2xl font-bold text-[#1E40AF] mb-1">Dashboard</h1>
        <p className="text-black/60 mb-8">Overview of the monitoring system</p>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm animate-pulse border border-[#1E40AF]/20">
                <div className="h-12 w-12 bg-[#d9d9d9] rounded-lg mb-4" />
                <div className="h-4 bg-[#d9d9d9] rounded w-24 mb-2" />
                <div className="h-8 bg-[#d9d9d9] rounded w-16" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="bg-white rounded-xl p-6 shadow-sm border border-[#1E40AF]/20">
                  <div className={`w-12 h-12 ${card.bgColor} rounded-lg flex items-center justify-center mb-4`}>
                    <Icon className={`w-6 h-6 ${card.textColor}`} />
                  </div>
                  <p className="text-sm text-black/60 mb-1">{card.label}</p>
                  <p className="text-3xl font-bold text-[#1E40AF]">{card.value}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}
