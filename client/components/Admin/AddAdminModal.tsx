import React, { useState } from 'react';
import { X, UserPlus, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAccount } from '@/contexts/account';

interface AddAdminModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AddAdminModal: React.FC<AddAdminModalProps> = ({ isOpen, onClose }) => {
    const { addAdmin } = useAccount();
    const [address, setAddress] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess(false);

        if (!address.trim()) {
            setError('Address is required');
            return;
        }

        try {
            setIsSubmitting(true);
            await addAdmin(address);
            setSuccess(true);
            setAddress('');
            setTimeout(() => {
                setSuccess(false);
                onClose();
            }, 2000);
        } catch (err: any) {
            console.error('Error adding admin:', err);
            setError(err.message || 'Failed to add admin');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="relative w-full max-w-md bg-white border-4 border-black shadow-[8px_8px_0px_#000]">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b-4 border-black bg-neu-yellow">
                    <div className="flex items-center space-x-2">
                        <UserPlus className="w-6 h-6" />
                        <h2 className="text-xl font-black uppercase">Add New Admin</h2>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1 hover:bg-black hover:text-white transition-colors border-2 border-transparent hover:border-black"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {success ? (
                        <div className="flex flex-col items-center justify-center py-4 space-y-3 text-center">
                            <CheckCircle2 className="w-12 h-12 text-green-600" />
                            <p className="font-bold text-green-800 text-lg">Admin Added Successfully!</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="p-3 bg-red-100 border-2 border-red-500 flex items-center space-x-2 text-red-800 font-bold text-sm">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-black uppercase mb-2">
                                    Wallet Address
                                </label>
                                <input
                                    type="text"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    className="w-full bg-white border-4 border-black p-3 font-bold focus:outline-none focus:ring-4 focus:ring-yellow-400"
                                    placeholder="AU1..."
                                    disabled={isSubmitting}
                                />
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className={`w-full py-3 text-lg font-black uppercase tracking-wider border-4 border-black transition-all ${
                                        isSubmitting
                                            ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                                            : 'bg-neu-green shadow-[4px_4px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[5px_5px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none'
                                    }`}
                                >
                                    {isSubmitting ? (
                                        <span className="flex items-center justify-center space-x-2">
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>Adding...</span>
                                        </span>
                                    ) : (
                                        'Add Admin'
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AddAdminModal;
