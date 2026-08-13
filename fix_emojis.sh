#!/bin/bash

# Header
sed -i "s/🛍️ //g" src/components/Header.tsx
sed -i "s/⏳ //g" src/components/Header.tsx
sed -i "s/📜 //g" src/components/Header.tsx
sed -i "s/📈 //g" src/components/Header.tsx
sed -i "s/⚙️ //g" src/components/Header.tsx

# Navigation
sed -i "s/🛍️ //g" src/components/Navigation.tsx
sed -i "s/⏳ //g" src/components/Navigation.tsx
sed -i "s/📜 //g" src/components/Navigation.tsx

# UserManagement
sed -i "s/🔒 //g" src/components/UserManagement.tsx
sed -i "s/✨ //g" src/components/UserManagement.tsx
sed -i "s/✕/X/g" src/components/UserManagement.tsx

# StockManagement
sed -i "s/✓//g" src/components/StockManagement.tsx
sed -i "s/✕/X/g" src/components/StockManagement.tsx

# DueManagement
sed -i "s/✖/X/g" src/components/DueManagement.tsx

# InvoiceModal
sed -i "s/📱 //g" src/components/InvoiceModal.tsx

# LoginModal
sed -i "s/✨ //g" src/components/LoginModal.tsx

# PosOrderBuilder
sed -i "s/📦 //g" src/components/PosOrderBuilder.tsx
sed -i "s/⚡ //g" src/components/PosOrderBuilder.tsx

# CustomerStorefront
sed -i "s/✨ //g" src/components/CustomerStorefront.tsx

# SalesHistory
sed -i "s/📦 //g" src/components/SalesHistory.tsx
sed -i "s/⚡ //g" src/components/SalesHistory.tsx

# PendingOrders
sed -i "s/🔥 //g" src/components/PendingOrders.tsx

# App
sed -i "s/✨ //g" src/App.tsx

