import React from 'react';
import { Activity, TrendingUp, TrendingDown, CheckCircle2 } from 'lucide-react';

export interface ActivityItem {
    type: 'bet' | 'settlement';
    address: string;
    amount?: number;
    direction?: 'YES' | 'NO';
    roundId: number;
    timestamp: number;
}

interface LiveActivityProps {
    activities?: ActivityItem[];
}

const LiveActivity = ({ activities = [] }: LiveActivityProps) => {
    return (
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_#000] p-6 h-full">
            <div className="flex items-center space-x-2 text-black text-sm font-black tracking-wider uppercase mb-6">
                <Activity className="w-5 h-5" />
                <span>LIVE ACTIVITY</span>
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {activities.length === 0 ? (
                    <div className="text-center text-gray-400 py-8 text-sm font-bold uppercase border-2 border-dashed border-gray-300">
                        No recent activity
                    </div>
                ) : (
                    activities.map((item, index) => (
                        <div 
                            key={`${item.roundId}-${index}`}
                            className="bg-white border-2 border-black p-4 flex items-center justify-between hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#000] transition-all"
                        >
                            <div className="flex items-center space-x-3">
                                {item.type === 'bet' ? (
                                    <div className={`p-2 border-2 border-black ${
                                        item.direction === 'YES' ? 'bg-green-400 text-black' : 'bg-red-400 text-black'
                                    }`}>
                                        {item.direction === 'YES' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                    </div>
                                ) : (
                                    <div className="p-2 border-2 border-black bg-cyan-400 text-black">
                                        <CheckCircle2 className="w-4 h-4" />
                                    </div>
                                )}
                                
                                <div>
                                    <div className="text-sm font-black text-black uppercase">
                                        {item.type === 'bet' ? `Bet ${item.direction}` : 'Market Settled'}
                                    </div>
                                    <div className="text-xs font-bold text-gray-500">
                                        {item.address} • Market #{item.roundId}
                                    </div>
                                </div>
                            </div>

                            {item.amount && (
                                <div className="text-right">
                                    <div className="text-sm font-black text-black">
                                        {item.amount.toFixed(2)} MAS
                                    </div>
                                    <div className="text-xs font-bold text-gray-500">
                                        {new Date(item.timestamp).toLocaleTimeString()}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default LiveActivity;
