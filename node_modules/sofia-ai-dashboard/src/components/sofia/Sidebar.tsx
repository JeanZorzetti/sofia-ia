import React from 'react';
import { 
  BarChart3, 
  Settings, 
  MessageSquare, 
  Database, 
  TrendingUp, 
  FileText,
  Coins,
  Zap
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tokensUsed?: number;
  tokensLimit?: number;
}

export const Sidebar = ({ activeTab, onTabChange, tokensUsed = 12450, tokensLimit = 15000 }: SidebarProps) => {
  const menuItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'sdr-config', label: 'SDR Config', icon: Settings },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
    { id: 'crm', label: 'CRM', icon: Database },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'templates', label: 'Templates', icon: FileText },
    { id: 'workflows', label: 'Workflows', icon: Zap },
    { id: 'billing', label: 'Billing', icon: Coins },
  ];

  const tokenPercentage = (tokensUsed / tokensLimit) * 100;

  return (
    <div className="glass-card h-full w-64 p-6 flex flex-col space-y-6">
      {/* Menu Items */}
      <div className="space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`
                w-full flex items-center space-x-3 px-4 py-3 rounded-lg
                transition-all duration-300 ease-smooth font-light tracking-wide-sofia
                ${isActive 
                  ? 'bg-secondary text-foreground' 
                  : 'text-foreground-secondary hover:bg-secondary/50 hover:text-foreground'
                }
              `}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Token Usage */}
      <div className="mt-auto">
        <div className="glass-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-light text-foreground-secondary">Tokens</span>
            <span className="text-sm font-light text-foreground">
              {tokensUsed.toLocaleString()}/{tokensLimit.toLocaleString()}
            </span>
          </div>
          <Progress 
            value={tokenPercentage} 
            className="h-2 bg-background-tertiary"
          />
          <div className="text-xs text-foreground-tertiary">
            {(100 - tokenPercentage).toFixed(1)}% disponível
          </div>
        </div>
      </div>
    </div>
  );
};