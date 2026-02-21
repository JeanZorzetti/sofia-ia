
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { DesktopService } from '@/services/desktop-service';

interface DesktopContextType {
    isDesktop: boolean;
    currentDirectory: string | null;
    selectDirectory: () => Promise<void>;
}

const DesktopContext = createContext<DesktopContextType>({
    isDesktop: false,
    currentDirectory: null,
    selectDirectory: async () => { },
});

export function DesktopProvider({ children }: { children: React.ReactNode }) {
    const [isDesktop, setIsDesktop] = useState(false);
    const [currentDirectory, setCurrentDirectory] = useState<string | null>(null);

    useEffect(() => {
        setIsDesktop(DesktopService.isDesktop());

        // Load last used directory from local storage
        const lastDir = localStorage.getItem('last_project_dir');
        if (lastDir) {
            setCurrentDirectory(lastDir);
        }
    }, []);

    const selectDirectory = async () => {
        const dir = await DesktopService.selectDirectory();
        if (dir) {
            setCurrentDirectory(dir);
            localStorage.setItem('last_project_dir', dir);
        }
    };

    return (
        <DesktopContext.Provider value={{ isDesktop, currentDirectory, selectDirectory }}>
            {children}
        </DesktopContext.Provider>
    );
}

export const useDesktop = () => useContext(DesktopContext);
