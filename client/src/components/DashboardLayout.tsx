import type { ReactNode } from 'react';
import Sidebar from './Sidebar';

interface DashboardLayoutProps {
    children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    return (
        <div className="flex h-screen bg-gray-50">
            <Sidebar />
            <main className="flex-1 overflow-y-auto lg:ml-64 transition-all duration-300">
                <div className="p-6 lg:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
