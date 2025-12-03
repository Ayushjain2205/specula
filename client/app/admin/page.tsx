"use client"

import React, { useState } from 'react';
import { Shield, UserPlus, Users, Lock } from 'lucide-react';
import { useAccount } from '@/contexts/account';
import AddAdminModal from '@/components/Admin/AddAdminModal';

const AdminPage = () => {
    const { account } = useAccount();
    const [isAddAdminModalOpen, setIsAddAdminModalOpen] = useState(false);

    if (!account) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
                <Lock className="w-16 h-16 mb-4 text-gray-400" />
                <h1 className="text-3xl font-black uppercase mb-2">Access Restricted</h1>
                <p className="text-xl font-bold text-gray-500">Please connect your wallet to access the admin panel.</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-4">
            {/* Header */}
            <div className="flex items-center space-x-4 mb-8">
                <div className="bg-black text-white p-3">
                    <Shield className="w-8 h-8" />
                </div>
                <div>
                    <h1 className="text-4xl font-black uppercase tracking-tighter">Admin Panel</h1>
                    <p className="text-sm font-bold text-gray-500">Manage platform settings and permissions</p>
                </div>
            </div>

            {/* Actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Manage Admins Card */}
                <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_#000]">
                    <div className="flex items-center space-x-3 mb-4">
                        <Users className="w-8 h-8" />
                        <h2 className="text-2xl font-black uppercase">Admins</h2>
                    </div>
                    <p className="text-gray-600 font-bold mb-6">
                        Manage whitelisted admin addresses who can create markets and resolve events.
                    </p>
                    <button
                        onClick={() => setIsAddAdminModalOpen(true)}
                        className="w-full py-3 px-4 bg-neu-yellow border-4 border-black font-black uppercase flex items-center justify-center space-x-2 shadow-[4px_4px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[5px_5px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                    >
                        <UserPlus className="w-5 h-5" />
                        <span>Add New Admin</span>
                    </button>
                </div>

                {/* Placeholder for future features */}
                <div className="bg-gray-50 border-4 border-gray-200 p-6 border-dashed">
                    <div className="flex items-center space-x-3 mb-4 opacity-50">
                        <Shield className="w-8 h-8" />
                        <h2 className="text-2xl font-black uppercase">More Soon</h2>
                    </div>
                    <p className="text-gray-400 font-bold">
                        Additional admin features will be available here.
                    </p>
                </div>
            </div>

            {/* Modals */}
            <AddAdminModal 
                isOpen={isAddAdminModalOpen} 
                onClose={() => setIsAddAdminModalOpen(false)} 
            />
        </div>
    );
};

export default AdminPage;
