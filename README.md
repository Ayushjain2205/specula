# Specula

*The project is actively under development*

**Specula** is a fully on-chain culture prediction market built on the **Massa Network**, enabling decentralized and trustless trading on outcomes from sports, social media, entertainment, and global trends. By leveraging **Autonomous Smart Contracts (ASC)**, Specula automates the entire lifecycle of a prediction market — from market creation to resolution and payouts — without manual intervention or centralized authority.

## 🧩 Problem

Most prediction markets today rely on admins or centralized oracles to resolve outcomes. This introduces trust issues and makes them vulnerable to intervention, censorship, and biased settlement. It also limits the type of events that can be traded.

Specula removes these dependencies by using **Massa’s Autonomous Smart Contracts**, allowing markets to automatically monitor data sources, determine outcomes, and distribute rewards on-chain — without human control.

## ✨ Features

* 🎯 Culture-native prediction markets (sports, entertainment, trends)
* 🤖 Fully automated market settlement using **ASC**
* 🔐 No admin keys, centralized backend, or interfering authority
* ⛓ Transparent escrow and reward logic on the **Massa Blockchain**
* 🔄 Continuous price discovery through trading of YES/NO share tokens
* 📈 Market creation and resolution executed completely on-chain

## 🔁 Flow

1. **Create Market**
   Anyone can launch a market around a cultural event and initialize liquidity.

2. **Stake & Trade**
   Participants stake **MAS** on either side and receive share tokens representing their position.

3. **Price Shifts**
   Token prices fluctuate based on market interest and conviction.

4. **Resolution via ASC**
   Autonomous Smart Contracts monitor data sources and automatically determine the correct outcome.

5. **Payouts**
   Specula distributes MAS rewards to winning positions instantly on settlement — no admin interaction.

## ⚙️ Technologies Used

* **Massa Blockchain**
* **Autonomous Smart Contracts (ASC)**
* **Massalabs SDK & Wallet**
* **React + Next.js + Tailwind CSS**
* **Supabase / PostgreSQL for non-critical metadata**
* **Vercel deployment**

## Frontend

* Built with **React and Tailwind**
* Fast, social UX for browsing and participating in prediction markets
* Wallet-based authentication and participation
* Live contract interaction via **Massalabs JS SDK**

## Next Steps

* Expand ASC logic to support additional resolution data sources
* Introduce user-generated market tooling and social profiles
* Add leaderboard, streaks, and prediction leagues
* Explore deployment via **Deweb** for fully decentralized hosting

