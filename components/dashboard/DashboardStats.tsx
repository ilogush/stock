import React from 'react';
import {
  ArchiveBoxIcon,
  ArchiveBoxArrowDownIcon,
  TruckIcon,
  ShoppingCartIcon,
  BanknotesIcon,
  ChartBarIcon,
  UsersIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';

interface DashboardStatsProps {
  stats: Array<{
    title: string;
    value: string | number;
    icon: string;
    color: string;
    href?: string;
  }>;
  onStatClick?: (stat: any) => void;
}

const iconMap: Record<string, React.ComponentType<any>> = {
  ArchiveBoxIcon,
  ArchiveBoxArrowDownIcon,
  TruckIcon,
  ShoppingCartIcon,
  BanknotesIcon,
  ChartBarIcon,
  UsersIcon,
  CurrencyDollarIcon
};

export default function DashboardStats({ stats, onStatClick }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, index) => {
        const IconComponent = iconMap[stat.icon];
        
        return (
          <div
            key={index}
            className={`p-4 rounded-lg border border-gray-200 cursor-pointer ${
              onStatClick ? 'hover:bg-gray-50' : ''
            }`}
            onClick={() => onStatClick?.(stat)}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              {IconComponent && (
                <div className={`p-2 rounded-full ${stat.color}`}>
                  <IconComponent className="h-6 w-6 text-white" />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
