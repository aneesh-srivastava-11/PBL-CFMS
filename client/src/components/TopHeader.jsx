import { Search, Bell, User as UserIcon, ChevronDown } from "lucide-react";

export default function TopHeader({ user, title }) {
    return (
        <header className="bg-white shadow-sm border-b border-gray-200 h-16 flex items-center justify-between px-6 sticky top-0 z-10 w-full">
            {/* Left: Search Bar (Cosmetic) */}
            <div className="flex-1 max-w-xl">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 border border-orange-200 rounded-full leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 sm:text-sm"
                        placeholder="Search..."
                    />
                </div>
            </div>

            {/* Right: User Profile & Actions */}
            <div className="flex items-center space-x-6 ml-4">
                {/* Notifications */}
                <button className="text-gray-500 hover:text-orange-600 transition relative">
                    <Bell className="h-6 w-6" />
                    <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                </button>

                {/* User Info */}
                <div className="flex items-center space-x-3 pl-6 border-l border-gray-200">
                    <div className="text-right hidden md:block">
                        <div className="text-sm font-bold text-orange-600">
                            {user?.id || 'ID: 2427030086'} <span className="text-gray-400 mx-1">=</span> <span className="text-gray-800 uppercase">{user?.name}</span>
                        </div>
                        <div className="text-xs text-gray-500 uppercase">{user?.role}</div>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                        <UserIcon className="h-5 w-5" />
                    </div>
                </div>
            </div>
        </header>
    );
}
