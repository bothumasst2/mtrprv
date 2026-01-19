'use client';

import React, { useState, useEffect } from 'react';
import { usePwa } from '@/contexts/pwa-context';
import { useAuth } from '@/contexts/auth-context';
import { usePathname } from 'next/navigation';
import { X, Smartphone, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function InstallPrompt() {
    const { canInstall, promptInstall, isInstalled } = usePwa();
    const { user } = useAuth();
    const pathname = usePathname();
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        // Only show if user is logged in, can install, not installed yet, and on dashboard
        const isDashboard = pathname?.startsWith('/dashboard') || pathname?.startsWith('/coach/dashboard');

        if (user && canInstall && !isInstalled && isDashboard) {
            // Small delay for better UX
            const timer = setTimeout(() => {
                // Check if user has already dismissed it in this session
                const dismissed = sessionStorage.getItem('pwa-prompt-dismissed');
                if (!dismissed) {
                    setShowPrompt(true);
                }
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [user, canInstall, isInstalled, pathname]);

    const handleInstall = async () => {
        await promptInstall();
        setShowPrompt(false);
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        sessionStorage.setItem('pwa-prompt-dismissed', 'true');
    };

    if (!showPrompt) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center pointer-events-none">
            <div className="bg-background border border-border shadow-2xl rounded-2xl w-full max-w-md overflow-hidden pointer-events-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div className="bg-primary/10 p-3 rounded-xl">
                            <Smartphone className="w-6 h-6 text-primary" />
                        </div>
                        <button
                            onClick={handleDismiss}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <h3 className="text-md font-bold mb-1 tracking-tight">Install MTR Training App</h3>
                    <p className="text-muted-foreground text-[10px] leading-relaxed mb-4">
                        Pasang di home screen untuk akses cepat dan mudah ke menu latihan Anda setiap hari.
                    </p>

                    <div className="flex gap-2">
                        <Button
                            onClick={handleDismiss}
                            variant="outline"
                            className="flex-1 rounded-xl h-10 font-medium text-[11px]"
                        >
                            Nanti Saja
                        </Button>
                        <Button
                            onClick={handleInstall}
                            className="flex-1 rounded-xl h-10 font-semibold shadow-lg shadow-primary/20 text-[11px]"
                        >
                            <Download className="w-3 h-3 mr-1" />
                            Instal
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
