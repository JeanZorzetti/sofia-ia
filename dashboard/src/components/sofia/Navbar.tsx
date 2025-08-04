import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Settings, User, LogOut, CreditCard } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  user?: { email: string; name?: string };
  onLogout?: () => void;
}

export const Navbar = ({ activeTab, onTabChange, user, onLogout }: NavbarProps) => {
  const menuItems = [
    { id: 'overview', label: 'Dashboard' },
    { id: 'sdr-config', label: 'Configurações' },
    { id: 'workflows', label: 'Workflows' },
    { id: 'billing', label: 'Billing' },
  ];

  return (
    <nav className="navbar-glass sticky top-0 z-50 h-16 flex items-center justify-between px-6">
      {/* Logo */}
      <div className="logo-sofia text-foreground">
        SOFIA IA
      </div>

      {/* Menu Items */}
      <div className="hidden md:flex items-center space-x-8">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`
              font-light tracking-wider-sofia transition-all duration-300 ease-smooth
              ${activeTab === item.id 
                ? 'text-foreground border-b border-primary' 
                : 'text-foreground-secondary hover:text-foreground'
              }
            `}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* User Menu */}
      <div className="flex items-center space-x-4">
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="" alt={user.name || user.email} />
                  <AvatarFallback className="bg-secondary text-secondary-foreground">
                    {(user.name || user.email).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 glass-card border-glass-border" align="end">
              <DropdownMenuItem className="flex items-center space-x-2 text-foreground-secondary">
                <User className="h-4 w-4" />
                <span>{user.email}</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onTabChange('billing')}
                className="flex items-center space-x-2 hover:bg-secondary"
              >
                <CreditCard className="h-4 w-4" />
                <span>Billing</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onTabChange('sdr-config')}
                className="flex items-center space-x-2 hover:bg-secondary"
              >
                <Settings className="h-4 w-4" />
                <span>Configurações</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={onLogout}
                className="flex items-center space-x-2 hover:bg-destructive text-destructive-foreground"
              >
                <LogOut className="h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button variant="outline" className="button-luxury">
            Entrar
          </Button>
        )}
      </div>
    </nav>
  );
};