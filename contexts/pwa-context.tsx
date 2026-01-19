'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface PwaContextType {
    canInstall: boolean;
    promptInstall: () => Promise<void>;
    isInstalled: boolean;
}

const PwaContext = createContext<PwaContextType | undefined>(undefined);

export function PwaProvider({ children }: { children: React.ReactNode }) {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        const handleBeforeInstallPrompt = (e: Event) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e);
            console.log('beforeinstallprompt event fired');
        };

        const handleAppInstalled = () => {
            setIsInstalled(true);
            setDeferredPrompt(null);
            console.log('PWA was installed');
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
        }

        // Register service worker
        if ('serviceWorker' in navigator && window.location.hostname !== 'localhost') {
            navigator.serviceWorker.register('/sw.js').then((registration) => {
                console.log('SW registered:', registration.scope);
            }).catch((err) => {
                console.error('SW registration failed:', err);
            });
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const promptInstall = async () => {
        if (!deferredPrompt) {
            console.log('No install prompt available');
            return;
        }

        // Show the install prompt
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);

        // We've used the prompt, and can't use it again, throw it away
        setDeferredPrompt(null);
    };

    return (
        <PwaContext.Provider value={{ canInstall: !!deferredPrompt, promptInstall, isInstalled }}>
            {children}
        </PwaContext.Provider>
    );
}

export function usePwa() {
    const context = useContext(PwaContext);
    if (context === undefined) {
        throw new Error('usePwa must be used within a PwaProvider');
    }
    return context;
}
