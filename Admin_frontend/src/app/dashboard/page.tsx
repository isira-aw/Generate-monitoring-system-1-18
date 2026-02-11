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
        },
        {
          label: 'Total Devices',
          value: stats.totalDevices,
          icon: Monitor,
        },
        {
          label: 'Active Devices',
          value: stats.activeDevices,
          icon: Wifi,
        },
        {
          label: 'Licensed Devices',
          value: stats.licensedDevices,
          icon: KeyRound,
        },
      ]
    : [];

  return (
    <ProtectedLayout>
      <div>
        <h1 className="text-2xl font-bold text-[#1E40AF] mb-1">Dashboard</h1>
        <p className="text-gray-600 mb-8">Overview of the monitoring system</p>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
                <div className="h-12 w-12 bg-gray-200 rounded-lg mb-4" />
                <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
                <div className="h-8 bg-gray-200 rounded w-16" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <div className="w-12 h-12 bg-[#1E40AF] rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-sm text-gray-500 mb-1">{card.label}</p>
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
