"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, Calendar, Target, AlertCircle, CheckCircle2, Loader2, Clock } from 'lucide-react';
import { useAccount } from '@/contexts/account';

const CreateMarketPage = () => {
    const router = useRouter();
    const { account, createMarket } = useAccount();
    
    const [description, setDescription] = useState('');
    const [targetValue, setTargetValue] = useState('');
    const [resolutionDate, setResolutionDate] = useState('');
    const [bettingCloseDate, setBettingCloseDate] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [marketId, setMarketId] = useState<number | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess(false);

        if (!account) {
            setError('Please connect your wallet first');
            return;
        }

        // Validate inputs
        if (!description.trim()) {
            setError('Market description is required');
            return;
        }

        const targetVal = parseFloat(targetValue);
        if (isNaN(targetVal) || targetVal <= 0) {
            setError('Target value must be a positive number');
            return;
        }

        if (!resolutionDate) {
            setError('Resolution date is required');
            return;
        }

        if (!bettingCloseDate) {
            setError('Betting close date is required');
            return;
        }

        const now = Date.now();
        const resolutionTime = new Date(resolutionDate).getTime();
        const bettingCloseTime = new Date(bettingCloseDate).getTime();

        if (resolutionTime <= now) {
            setError('Resolution time must be in the future');
            return;
        }

        if (bettingCloseTime <= now) {
            setError('Betting close time must be in the future');
            return;
        }

        if (bettingCloseTime >= resolutionTime) {
            setError('Betting must close before the market resolves');
            return;
        }

        // Calculate duration and cutoff offset
        const duration = resolutionTime - now;
        const bettingCutoffOffset = resolutionTime - bettingCloseTime;

        try {
            setIsSubmitting(true);
            const result = await createMarket(
                description,
                Math.floor(targetVal),
                duration,
                bettingCutoffOffset
            );

            setMarketId(result.marketId);
            setSuccess(true);
            
            // Reset form
            setDescription('');
            setTargetValue('');
            setResolutionDate('');
            setBettingCloseDate('');

            // Redirect to home after 3 seconds
            setTimeout(() => {
                router.push('/');
            }, 3000);
        } catch (err: any) {
            console.error('Error creating market:', err);
            setError(err.message || 'Failed to create market. You may not have permission.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Helper to get current date string for min attribute
    const getMinDate = () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().slice(0, 16);
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="bg-neu p-8 mb-8">
                <div className="flex items-center space-x-4 mb-6">
                    <div className="bg-black text-white p-3">
                        <TrendingUp className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black uppercase tracking-tighter">Create Market</h1>
                        <p className="text-sm font-bold text-gray-500">Launch a new prediction market</p>
                    </div>
                </div>

                {/* Success Message */}
                {success && (
                    <div className="mb-6 p-4 bg-green-100 border-4 border-green-500 flex items-center space-x-3">
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                        <div>
                            <p className="font-bold text-green-800">Market Created Successfully!</p>
                            <p className="text-sm text-green-700">Market ID: #{marketId} - Redirecting to homepage...</p>
                        </div>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 bg-red-100 border-4 border-red-500 flex items-center space-x-3">
                        <AlertCircle className="w-6 h-6 text-red-600" />
                        <div>
                            <p className="font-bold text-red-800">Error</p>
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Market Description */}
                    <div>
                        <label className="block text-sm font-black uppercase mb-2">
                            Market Description
                        </label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-white border-4 border-black p-4 text-lg font-bold focus:outline-none focus:ring-4 focus:ring-yellow-400"
                            placeholder="e.g., Will Bitcoin reach $100,000 by end of 2025?"
                            disabled={isSubmitting}
                        />
                        <p className="text-xs text-gray-500 mt-1 font-bold">
                            Describe what this market is predicting
                        </p>
                    </div>

                    {/* Target Value */}
                    <div>
                        <label className="block text-sm font-black uppercase mb-2 flex items-center space-x-2">
                            <Target className="w-4 h-4" />
                            <span>Target Value</span>
                        </label>
                        <input
                            type="number"
                            value={targetValue}
                            onChange={(e) => setTargetValue(e.target.value)}
                            className="w-full bg-white border-4 border-black p-4 text-lg font-bold focus:outline-none focus:ring-4 focus:ring-yellow-400"
                            placeholder="e.g., 100000"
                            min="1"
                            step="1"
                            disabled={isSubmitting}
                        />
                        <p className="text-xs text-gray-500 mt-1 font-bold">
                            The numeric value to compare against (YES/OVER wins if actual value ≥ target)
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Betting Close Time */}
                        <div>
                            <label className="block text-sm font-black uppercase mb-2 flex items-center space-x-2">
                                <Clock className="w-4 h-4" />
                                <span>Betting Closes At</span>
                            </label>
                            <input
                                type="datetime-local"
                                value={bettingCloseDate}
                                onChange={(e) => setBettingCloseDate(e.target.value)}
                                min={getMinDate()}
                                className="w-full bg-white border-4 border-black p-4 text-lg font-bold focus:outline-none focus:ring-4 focus:ring-yellow-400"
                                disabled={isSubmitting}
                            />
                            <p className="text-xs text-gray-500 mt-1 font-bold">
                                When users must stop placing bets
                            </p>
                        </div>

                        {/* Resolution Time */}
                        <div>
                            <label className="block text-sm font-black uppercase mb-2 flex items-center space-x-2">
                                <Calendar className="w-4 h-4" />
                                <span>Resolution Time</span>
                            </label>
                            <input
                                type="datetime-local"
                                value={resolutionDate}
                                onChange={(e) => setResolutionDate(e.target.value)}
                                min={bettingCloseDate || getMinDate()}
                                className="w-full bg-white border-4 border-black p-4 text-lg font-bold focus:outline-none focus:ring-4 focus:ring-yellow-400"
                                disabled={isSubmitting}
                            />
                            <p className="text-xs text-gray-500 mt-1 font-bold">
                                When the market ends and is settled
                            </p>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex space-x-4 pt-4">
                        <button
                            type="submit"
                            disabled={isSubmitting || !account}
                            className={`flex-1 py-4 text-xl font-black uppercase tracking-wider border-4 border-black transition-all ${
                                isSubmitting || !account
                                    ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                                    : 'bg-neu-yellow shadow-[8px_8px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[10px_10px_0px_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none'
                            }`}
                        >
                            {isSubmitting ? (
                                <span className="flex items-center justify-center space-x-2">
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    <span>Creating Market...</span>
                                </span>
                            ) : !account ? (
                                'Connect Wallet First'
                            ) : (
                                'Create Market'
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => router.push('/')}
                            disabled={isSubmitting}
                            className="px-6 py-4 text-xl font-black uppercase border-4 border-black bg-white hover:bg-gray-100 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </form>

                {/* Info Box */}
                <div className="mt-8 p-4 bg-yellow-50 border-4 border-yellow-400">
                    <p className="text-sm font-bold text-yellow-900">
                        <strong>Note:</strong> Only contract owners and authorized admins can create markets. 
                        If you don't have permission, the transaction will fail.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default CreateMarketPage;
