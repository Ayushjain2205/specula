import React from 'react';
import { Target, TrendingUp } from 'lucide-react';

interface MarketInfoProps {
    description: string;
    targetValue: number;
}

const MarketInfo = ({ description, targetValue }: MarketInfoProps) => {
    return (
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_#000] p-6 flex flex-col items-center justify-center space-y-2">
            <div className="flex items-center space-x-2 text-black text-sm font-black tracking-wider uppercase">
                <Target className="w-5 h-5" />
                <span>MARKET QUESTION</span>
            </div>
            
            <div className="text-xl font-black text-black tracking-tight text-center px-2">
                {description}
            </div>
            
            <div className="flex items-center space-x-2 text-sm font-black text-blue-600">
                <TrendingUp className="w-5 h-5" />
                <span>TARGET: {targetValue.toLocaleString()}</span>
            </div>
        </div>
    );
};

export default MarketInfo;
