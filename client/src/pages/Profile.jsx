import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import TopHeader from '../components/TopHeader';
import { User, Phone, Mail, MapPin } from "lucide-react";

const Profile = () => {
    const { user, logout } = useContext(AuthContext);

    return (
        <div className="flex h-screen bg-gray-50 font-sans">
            <Sidebar user={user} onLogout={logout} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <TopHeader user={user} />

                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 md:p-6">
                    <div className="max-w-7xl mx-auto space-y-6">

                        {/* Top Card: Profile Header */}
                        <div className="bg-white shadow-sm border border-orange-200 rounded-lg overflow-hidden">
                            <div className="p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-8">
                                {/* Avatar */}
                                <div className="h-24 w-24 md:h-32 md:w-32 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 border-4 border-white shadow-sm flex-shrink-0">
                                    <User size={48} className="md:w-16 md:h-16" />
                                </div>

                                {/* Basic Info */}
                                <div className="flex-1 text-center md:text-left space-y-2 w-full">
                                    <span className="text-gray-500 text-xs md:text-sm uppercase tracking-wider">{user?.role}</span>
                                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 break-words">{user?.name}</h1>
                                    <div className="h-1 w-12 bg-orange-500 rounded mx-auto md:mx-0 my-2"></div>
                                    <div className="text-orange-600 font-semibold cursor-pointer hover:underline text-sm md:text-base">Profile</div>
                                </div>

                                {/* Contact Info (Right Side) */}
                                <div className="w-full md:w-auto space-y-3 py-2 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-2 md:pl-8 flex flex-col items-center md:items-start text-center md:text-left">
                                    <div className="flex items-center space-x-3 text-gray-600">
                                        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 flex-shrink-0">
                                            <Phone size={16} />
                                        </div>
                                        <span className="text-sm break-all">{user?.phone_number || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center space-x-3 text-gray-600">
                                        <div className="h-8 w-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 flex-shrink-0">
                                            <Mail size={16} />
                                        </div>
                                        <span className="text-sm break-all">{user?.email}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Card: General Information */}
                        <div className="bg-white shadow-sm border border-orange-200 rounded-lg p-4 md:p-6">
                            <h3 className="text-gray-600 font-medium mb-6 border-b pb-2">General Information</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 md:gap-y-8">
                                {/* Registration No */}
                                <div>
                                    <label className="block text-xs text-gray-500 font-medium uppercase mb-1">Registration No</label>
                                    <div className="border border-gray-200 rounded px-3 py-2 bg-gray-50 text-gray-700 text-sm break-words">
                                        {(() => {
                                            if (!user?.email) return 'N/A';
                                            const match = user.email.split('@')[0].match(/\d+/);
                                            return match ? match[0] : 'N/A';
                                        })()}
                                    </div>
                                </div>

                                {/* Name */}
                                <div>
                                    <label className="block text-xs text-gray-500 font-medium uppercase mb-1">Name</label>
                                    <div className="border border-gray-200 rounded px-3 py-2 bg-gray-50 text-gray-700 text-sm uppercase break-words">
                                        {user?.name}
                                    </div>
                                </div>

                                {/* Semester */}
                                <div>
                                    <label className="block text-xs text-gray-500 font-medium uppercase mb-1">Semester</label>
                                    <div className="border border-gray-200 rounded px-3 py-2 bg-gray-50 text-gray-700 text-sm">
                                        {user?.academic_semester || 'N/A'}
                                    </div>
                                </div>

                                {/* Section */}
                                <div>
                                    <label className="block text-xs text-gray-500 font-medium uppercase mb-1">Section</label>
                                    <div className="border border-gray-200 rounded px-3 py-2 bg-gray-50 text-gray-700 text-sm">
                                        {user?.section || 'N/A'}
                                    </div>
                                </div>

                                {/* Program */}
                                <div className="md:col-span-2">
                                    <label className="block text-xs text-gray-500 font-medium uppercase mb-1">Program</label>
                                    <div className="border border-gray-200 rounded px-3 py-2 bg-gray-50 text-gray-700 text-sm uppercase break-words">
                                        B.TECH IN COMPUTER SCIENCE & ENGINEERING (CSE)
                                    </div>
                                </div>

                                {/* Batch */}
                                <div>
                                    <label className="block text-xs text-gray-500 font-medium uppercase mb-1">Batch</label>
                                    <div className="border border-gray-200 rounded px-3 py-2 bg-gray-50 text-gray-700 text-sm">
                                        N/A
                                    </div>
                                </div>

                                {/* Gender */}
                                <div>
                                    <label className="block text-xs text-gray-500 font-medium uppercase mb-1">Gender</label>
                                    <div className="border border-gray-200 rounded px-3 py-2 bg-gray-50 text-gray-700 text-sm">
                                        N/A
                                    </div>
                                </div>

                                {/* Mobile No */}
                                <div>
                                    <label className="block text-xs text-gray-500 font-medium uppercase mb-1">Mobile No.</label>
                                    <div className="border border-gray-200 rounded px-3 py-2 bg-gray-50 text-gray-700 text-sm break-all">
                                        {user?.phone_number || 'N/A'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Coordinator Table */}
                        <div className="mt-8 border rounded-lg overflow-hidden overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <tbody className="bg-white divide-y divide-gray-200">
                                    <tr>
                                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">1</td>
                                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-700">Class Coordinator</td>
                                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-700">N/A</td>
                                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">N/A</td>
                                    </tr>
                                    <tr>
                                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">2</td>
                                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-700">Student Mentor</td>
                                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-700"></td>
                                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500"></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                    </div>
                </main>
            </div>
        </div>
    );
};

export default Profile;
