"use client"

import React, { useState } from 'react';

export const LiquidityContainer = () => {
    return (
        <section className="min-h-screen  ">
            <div className="max-w-4xl mx-auto px-4 py-8 relative">
                {/* Header */}
                <div className="bg-white border-4 border-black shadow-[8px_8px_0px_#000] mb-8">
                    <div className="p-6">
                        <div className="flex items-center space-x-3">
                            <h1 className="text-3xl font-black text-black tracking-tighter uppercase">LIQUIDITY</h1>
                        </div>
                        <p className="text-gray-500 font-bold mt-2">Provide liquidity to the Specula protocol</p>
                    </div>
                </div>
            </div>
        </section>
    )
}