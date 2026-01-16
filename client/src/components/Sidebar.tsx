import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    ChefHat,
    Users,
    Package,
    Mail,
    BarChart3,
    ChevronDown,
    ChevronRight,
    Menu,
    X,
    LogOut,
    UserCircle,
} from 'lucide-react';
import { useAuth } from '../modules/auth/contexts/AuthContext';

interface NavItem {
    name: string;
    path: string;
    icon: React.ComponentType<{ className?: string }>;
    children?: NavItem[];
}

const navigationItems: NavItem[] = [
    {
        name: 'Overview',
        path: '/dashboard/overview',
        icon: LayoutDashboard,
    },
    {
        name: 'Chefs',
        path: '/dashboard/chefs',
        icon: ChefHat,
        children: [
            { name: 'List', path: '/dashboard/chefs/list', icon: ChefHat },
            { name: 'Map', path: '/dashboard/chefs/map', icon: ChefHat },
        ],
    },
    {
        name: 'Clients',
        path: '/dashboard/clients',
        icon: Users,
    },
    {
        name: 'Orders',
        path: '/dashboard/orders',
        icon: Package,
    },
    {
        name: 'Email Campaigns',
        path: '/dashboard/campaigns',
        icon: Mail,
        children: [
            { name: 'Campaigns', path: '/dashboard/campaigns/list', icon: Mail },
            { name: 'Templates', path: '/dashboard/campaigns/templates', icon: Mail },
            { name: 'Segments', path: '/dashboard/campaigns/segments', icon: Mail },
        ],
    },
    {
        name: 'KPIs',
        path: '/dashboard/kpis',
        icon: BarChart3,
        children: [
            { name: 'All', path: '/dashboard/kpis/all', icon: BarChart3 },
            { name: 'Amsterdam', path: '/dashboard/kpis/amsterdam', icon: BarChart3 },
            { name: 'Enschede', path: '/dashboard/kpis/enschede', icon: BarChart3 },
            { name: 'Utrecht', path: '/dashboard/kpis/utrecht', icon: BarChart3 },
        ],
    },
];

export default function Sidebar() {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [expandedItems, setExpandedItems] = useState<string[]>(['Chefs', 'Email Campaigns', 'KPIs']);
    const location = useLocation();
    const { user, signOut } = useAuth();

    const toggleExpanded = (itemName: string) => {
        setExpandedItems(prev =>
            prev.includes(itemName)
                ? prev.filter(name => name !== itemName)
                : [...prev, itemName]
        );
    };

    const isActive = (path: string) => {
        return location.pathname === path || location.pathname.startsWith(path + '/');
    };

    const NavItemComponent = ({ item, isChild = false }: { item: NavItem; isChild?: boolean }) => {
        const active = isActive(item.path);
        const hasChildren = item.children && item.children.length > 0;
        const isExpanded = expandedItems.includes(item.name);
        const Icon = item.icon;

        // If item has children and sidebar is not collapsed, make it a toggle button
        if (hasChildren && !isCollapsed) {
            return (
                <div>
                    <button
                        onClick={() => toggleExpanded(item.name)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${active
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                            }`}
                    >
                        <div className="flex items-center">
                            <Icon className="w-5 h-5 flex-shrink-0" />
                            <span className="ml-3">{item.name}</span>
                        </div>
                        {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                        ) : (
                            <ChevronRight className="w-4 h-4" />
                        )}
                    </button>
                    {isExpanded && (
                        <div className="mt-1 space-y-1">
                            {item.children!.map((child) => (
                                <NavItemComponent key={child.path} item={child} isChild />
                            ))}
                        </div>
                    )}
                </div>
            );
        }

        // No children or collapsed - render as link
        return (
            <Link
                to={item.path}
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center px-3 py-2 rounded-lg transition-colors ${active
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    } ${isChild ? 'ml-6 text-sm' : ''}`}
            >
                <Icon className={`${isCollapsed ? 'w-6 h-6' : 'w-5 h-5'} flex-shrink-0`} />
                {!isCollapsed && <span className="ml-3">{item.name}</span>}
            </Link>
        );
    };

    return (
        <>
            {/* Mobile Menu Button */}
            <button
                onClick={() => setIsMobileOpen(!isMobileOpen)}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gray-800 text-white rounded-lg"
            >
                {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 h-full bg-gray-800 text-white transition-all duration-300 z-40 ${isCollapsed ? 'w-16' : 'w-64'
                    } ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="flex items-center justify-center h-16 border-b border-gray-700">
                        {isCollapsed ? (
                            <ChefHat className="w-8 h-8 text-blue-500" />
                        ) : (
                            <h1 className="text-xl font-bold">Hyperzod CRM</h1>
                        )}
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto py-4 px-2">
                        <div className="space-y-1">
                            {navigationItems.map((item) => (
                                <NavItemComponent key={item.path} item={item} />
                            ))}
                        </div>
                    </nav>

                    {/* User Profile & Logout */}
                    <div className="border-t border-gray-700 p-2">
                        <div className={`flex items-center px-3 py-2 text-gray-300 rounded-lg ${isCollapsed ? 'justify-center' : ''}`}>
                            <UserCircle className={`${isCollapsed ? 'w-6 h-6' : 'w-5 h-5'} flex-shrink-0`} />
                            {!isCollapsed && (
                                <div className="ml-3 flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">{user?.email}</p>
                                    <p className="text-xs text-gray-500 truncate">Admin</p>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={signOut}
                            className={`flex items-center w-full px-3 py-2 text-red-400 hover:bg-gray-700 hover:text-red-300 rounded-lg transition-colors mt-1 ${isCollapsed ? 'justify-center' : ''}`}
                            title="Sign Out"
                        >
                            <LogOut className={`${isCollapsed ? 'w-6 h-6' : 'w-5 h-5'} flex-shrink-0`} />
                            {!isCollapsed && <span className="ml-3">Sign Out</span>}
                        </button>
                    </div>

                    {/* Collapse Button */}
                    <div className="hidden lg:block border-t border-gray-700 p-2">
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="w-full flex items-center justify-center px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                        >
                            {isCollapsed ? (
                                <ChevronRight className="w-5 h-5" />
                            ) : (
                                <>
                                    <ChevronRight className="w-5 h-5 rotate-180" />
                                    <span className="ml-2">Collapse</span>
                                </>
                            )}
                        </button>
                    </div>
                </div >
            </aside >
        </>
    );
}
