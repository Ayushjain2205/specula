import React from 'react';
import { Users, TrendingUp, TrendingDown } from 'lucide-react';

interface PoolDistributionProps {
    upPercentage: string;
    downPercentage: string;
    totalUpBets: number;
    totalDownBets: number;
    totalPool: number;
}

const PoolDistribution = ({ 
    upPercentage = "50", 
    downPercentage = "50", 
    totalUpBets = 0, 
    totalDownBets = 0, 
    totalPool = 0 
}: Partial<PoolDistributionProps>) => {
    return (
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_#000] p-6 flex flex-col justify-between h-full">
            <div className="flex items-center space-x-2 text-black text-sm font-black tracking-wider uppercase mb-4">
                <Users className="w-5 h-5" />
                <span>POOL DISTRIBUTION</span>
            </div>

            <div className="space-y-4">
                <div className="h-6 bg-gray-100 border-4 border-black flex">
                    <div 
                        className="h-full bg-green-400 border-r-4 border-black transition-all duration-500"
                        style={{ width: `${upPercentage}%` }}
                    />
                    <div 
                        className="h-full bg-red-400 transition-all duration-500"
                        style={{ width: `${downPercentage}%` }}
                    />
                </div>

                <div className="flex justify-between text-sm">
                    <div className="text-left">
                        <div className="flex items-center space-x-1 text-green-600 font-black uppercase">
                            <TrendingUp className="w-4 h-4" />
                            <span>{upPercentage}% YES</span>
                        </div>
                        <div className="text-xs font-bold text-gray-500">{totalUpBets.toFixed(2)} MAS</div>
                    </div>

                    <div className="text-right">
                        <div className="flex items-center space-x-1 text-red-600 font-black justify-end uppercase">
                            <TrendingDown className="w-4 h-4" />
                            <span>{downPercentage}% NO</span>
                        </div>
                        <div className="text-xs font-bold text-gray-500">{totalDownBets.toFixed(2)} MAS</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PoolDistribution;
