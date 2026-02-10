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

                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
                    <div className="max-w-7xl mx-auto space-y-6">

                        {/* Top Card: Profile Header */}
                        <div className="bg-white shadow-sm border border-orange-200 rounded-lg overflow-hidden">
                            <div className="p-8 flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-8">
                                {/* Avatar */}
                                <div className="h-32 w-32 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 border-4 border-white shadow-sm">
                                    <User size={64} />
                                </div>

                                {/* Basic Info */}
                                <div className="flex-1 text-center md:text-left space-y-2">
                                    <span className="text-gray-500 text-sm uppercase tracking-wider">{user?.role}</span>
                                    <h1 className="text-2xl font-bold text-gray-900">{user?.name}</h1>
                                    <div className="h-1 w-12 bg-orange-500 rounded mx-auto md:mx-0 my-2"></div>
                                    <div className="text-orange-600 font-semibold cursor-pointer hover:underline">Profile</div>
                                </div>

                                {/* Contact Info (Right Side) */}
                                <div className="space-y-3 py-2 border-l border-gray-100 pl-8 md:block hidden">
                                    <div className="flex items-center space-x-3 text-gray-600">
                                        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                            <Phone size={16} />
                                        </div>
                                        <span className="text-sm">{user?.phone || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center space-x-3 text-gray-600">
                                        <div className="h-8 w-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-600">
                                            <Mail size={16} />
                                        </div>
                                        <span className="text-sm">{user?.email}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Card: General Information */}
                        <div className="bg-white shadow-sm border border-orange-200 rounded-lg p-6">
                            <h3 className="text-gray-600 font-medium mb-6 border-b pb-2">General Information</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                                {/* Registration No */}
                                <div>
                                    <label className="block text-xs text-gray-500 font-medium uppercase mb-1">Registration No</label>
                                    <div className="border border-gray-200 rounded px-3 py-2 bg-gray-50 text-gray-700 text-sm">
                                        {user?.id ? user.id : 'N/A'}
                                    </div>
                                </div>

                                {/* Name */}
                                <div>
                                    <label className="block text-xs text-gray-500 font-medium uppercase mb-1">Name</label>
                                    <div className="border border-gray-200 rounded px-3 py-2 bg-gray-50 text-gray-700 text-sm uppercase">
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
                                    <div className="border border-gray-200 rounded px-3 py-2 bg-gray-50 text-gray-700 text-sm uppercase">
                                        B.TECH IN COMPUTER SCIENCE & ENGINEERING (CSE)
                                    </div>
                                </div>

                                {/* Batch */}
                                <div>
                                    <label className="block text-xs text-gray-500 font-medium uppercase mb-1">Batch</label>
                                    <div className="border border-gray-200 rounded px-3 py-2 bg-gray-50 text-gray-700 text-sm">
                                        BATCH-1
                                    </div>
                                </div>

                                {/* Gender */}
                                <div>
                                    <label className="block text-xs text-gray-500 font-medium uppercase mb-1">Gender</label>
                                    <div className="border border-gray-200 rounded px-3 py-2 bg-gray-50 text-gray-700 text-sm">
                                        Male
                                    </div>
                                </div>

                                {/* Mobile No */}
                                <div>
                                    <label className="block text-xs text-gray-500 font-medium uppercase mb-1">Mobile No.</label>
                                    <div className="border border-gray-200 rounded px-3 py-2 bg-gray-50 text-gray-700 text-sm">
                                        {user?.phone || 'N/A'}
                                    </div>
                                </div>
                            </div>

                            {/* Coordinator Table */}
                            <div className="mt-8 border rounded-lg overflow-hidden">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        <tr>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">1</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">Class Coordinator</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">Mr. Tarun Jain</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">tarun.jain@jaipur.manipal.edu</td>
                                        </tr>
                                        <tr>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">2</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">Student Mentor</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700"></td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Profile;
