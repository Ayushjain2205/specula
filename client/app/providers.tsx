'use client';

import AccountProvider from "../contexts/account"
import MarketProvider from "../contexts/market"

export function Providers({ children }: any) {

    return (
        <MarketProvider>
            <AccountProvider>
                {children}
            </AccountProvider>
        </MarketProvider>
    )
}