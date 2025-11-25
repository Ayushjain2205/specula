"use client"

import React, { useState, useEffect, useContext } from 'react';
import { Terminal, ChevronDown, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getWallets } from "@massalabs/wallet-provider";
import { AccountContext } from '@/contexts/account';

export const Header = () => {
    const { account, connect, disconnect, provider, setProvider }: any = useContext(AccountContext)
    const [accounts, setAccounts] = useState<any>([])
    const [showAccountDropdown, setShowAccountDropdown] = useState(false)
    const [balance, setBalance] = useState("")

    const pathname = usePathname()

    useEffect(() => {
        checkWallet()
    }, [])

    useEffect(() => {
        if (provider && account) {
            checkBalance(provider, account);
        }
    }, [provider, account]);

    const checkBalance = async (provider: any, account: any) => {
        try {
            const balance = await account.balance();
            setBalance(formatMASBalance(balance));
        } catch (error) {
            console.error('Error checking balance:', error);
            setBalance('Error loading balance');
        }
    };


    const checkWallet = async () => {
        // Get list of available wallets
        const wallets = await getWallets();

        for (let wallet of wallets) {
            const walletName = wallet.name()
            if (walletName === "MASSA WALLET") {
                setProvider(wallet)
                const accounts = await wallet.accounts();
                setAccounts(accounts)
                break
            }
        }
    }

    const handleAccountConnect = (selectedAccount: any) => {
        connect(selectedAccount)
        setShowAccountDropdown(false)
    }


    return (
        <header className="relative z-10 bg-neu mb-8 border-b-4 border-black">
            <div className="max-w-7xl mx-auto px-4 py-4">
                <div className="flex items-center justify-between">
                    {/* Logo */}
                    <div className="flex space-x-4">
                        <Link href="/" className="flex items-center space-x-2">
                            <img src="/specula.svg" className="w-12 h-12" alt="" />
                            <h1 className="text-3xl font-black text-black tracking-tighter uppercase transform -skew-x-6 my-0">SPECULA</h1>
                        </Link>
                    </div>

                    {/* Navigation */}
                    <nav className="hidden md:flex items-center space-x-4 text-sm font-black tracking-wider">
                        <Link href="/" className={`px-4 py-2 border-2 transition-all ${pathname === "/" ? "bg-yellow-400 border-black shadow-[4px_4px_0px_#000] text-black" : "border-transparent text-gray-500 hover:text-black hover:border-black hover:bg-yellow-100"} `}>MARKETS</Link>
                        <Link href="/history" className={`px-4 py-2 border-2 transition-all ${pathname === "/history" ? "bg-pink-400 border-black shadow-[4px_4px_0px_#000] text-black" : "border-transparent text-gray-500 hover:text-black hover:border-black hover:bg-pink-100"} `}>MY BETS</Link>
                        <Link href="/create-market" className={`px-4 py-2 border-2 transition-all ${pathname === "/create-market" ? "bg-green-400 border-black shadow-[4px_4px_0px_#000] text-black" : "border-transparent text-gray-500 hover:text-black hover:border-black hover:bg-green-100"} `}>CREATE MARKET</Link>
                    </nav>

                    {/* Terminal Status */}
                    <div className="flex items-center space-x-4">

                        {/* No accounts available */}
                        {((accounts.length === 0) && !account) && (
                            <button className="btn-neu px-4 py-2 bg-gray-200">
                                <div className="flex items-center space-x-2">
                                    <span className="font-bold text-sm">NO WALLET</span>
                                </div>
                            </button>
                        )}

                        {/* Accounts available but none connected */}
                        {((accounts.length > 0) && (!account)) && (
                            <div className="relative">
                                <button
                                    onClick={() => setShowAccountDropdown(!showAccountDropdown)}
                                    className="btn-neu px-4 py-2 bg-neu-yellow"
                                >
                                    <div className="flex items-center space-x-2">
                                        <User className="w-4 h-4 text-black" />
                                        <span className="text-black font-bold text-sm">CONNECT</span>
                                        <ChevronDown className={`w-4 h-4 text-black transition-transform ${showAccountDropdown ? 'rotate-180' : ''}`} />
                                    </div>
                                </button>

                                {/* Dropdown Menu */}
                                {showAccountDropdown && (
                                    <div className="absolute right-0 top-full mt-4 bg-white border-4 border-black shadow-[8px_8px_0px_#000] min-w-[250px] z-50 p-0">
                                        <div className="py-0">
                                            <div className="px-4 py-2 border-b-4 border-black bg-yellow-300">
                                                <span className="text-black text-xs font-black tracking-wider">SELECT ACCOUNT</span>
                                            </div>
                                            {accounts.map((acc: any, index: number) => {
                                                const shortAddress = `${acc.address.slice(0, 6)}...${acc.address.slice(-4)}`;
                                                return (
                                                    <button
                                                        key={index}
                                                        onClick={() => handleAccountConnect(acc)}
                                                        className="w-full px-4 py-3 hover:bg-black hover:text-white transition-colors text-left border-b-2 border-black last:border-b-0 font-bold"
                                                    >
                                                        <div className="flex items-center space-x-2">
                                                            <div>
                                                                <div className="text-sm uppercase">
                                                                    {acc.accountName || `Account ${index + 1}`}
                                                                </div>
                                                                <div className="text-xs opacity-70">
                                                                    {shortAddress}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Account connected */}
                        {account && (
                            <>
                                <div className="text-right hidden sm:block">
                                    <p className="text-xs font-bold bg-black text-white px-1 inline-block">BALANCE</p>
                                    <p className="text-black font-black text-lg">{balance || "0.00"} MAS</p>
                                </div>
                                <button
                                    onClick={() => disconnect()}
                                    className="btn-neu px-4 py-2 bg-neu-pink"
                                >
                                    <div className="flex items-center space-x-2">
                                        <span className="text-black font-bold text-sm">
                                            {account.address ? `${account.address.slice(0, 6)}...${account.address.slice(-4)}` : '0x1234...5678'}
                                        </span>
                                    </div>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Overlay to close dropdown when clicking outside */}
            {showAccountDropdown && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowAccountDropdown(false)}
                ></div>
            )}
        </header>
    )
}


// Helper function to format MAS balance from BigInt with 9 decimals
const formatMASBalance = (balanceBigInt: any) => {
    if (typeof balanceBigInt === 'string') {
        // If it's already a string, return as is
        return balanceBigInt;
    }

    if (typeof balanceBigInt === 'bigint' || (typeof balanceBigInt === 'string' && balanceBigInt.endsWith('n'))) {
        // Handle BigInt or string with 'n' suffix
        const balanceStr = balanceBigInt.toString().replace('n', '');
        const balance = BigInt(balanceStr);

        // Massa has 9 decimal places
        const divisor = BigInt(10 ** 9);
        const wholePart = balance / divisor;
        const fractionalPart = balance % divisor;

        // Format fractional part with leading zeros and remove trailing zeros
        const fractionalStr = fractionalPart.toString().padStart(9, '0').replace(/0+$/, '');

        if (fractionalStr === '') {
            return wholePart.toString();
        } else {
            return `${wholePart.toString()}.${fractionalStr}`;
        }
    }

    return balanceBigInt?.toString() || '0';
};