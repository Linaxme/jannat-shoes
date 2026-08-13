#!/bin/bash

# First, import query and where
sed -i "s/import { db, collection, getDocs, doc, setDoc, deleteDoc, writeBatch } from '.\/firebase';/import { db, collection, getDocs, doc, setDoc, deleteDoc, writeBatch, query, where, orderBy } from '.\/firebase';/" src/lib/firestoreService.ts

# Then update the query part
sed -i -e "/const productsSnap = await getDocs(collection(db, 'products'));/i \\
    const threeMonthsAgo = new Date();\\
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);\\
    const threeMonthsAgoISO = threeMonthsAgo.toISOString().split('T')[0]; // Format: YYYY-MM-DD\\
" src/lib/firestoreService.ts

sed -i "s/const ordersSnap = await getDocs(collection(db, 'orders'));/const ordersSnap = await getDocs(query(collection(db, 'orders'), where('date', '>=', threeMonthsAgoISO)));/" src/lib/firestoreService.ts

sed -i "s/const paymentLogsSnap = await getDocs(collection(db, 'paymentLogs'));/const paymentLogsSnap = await getDocs(query(collection(db, 'paymentLogs'), where('date', '>=', threeMonthsAgoISO)));/" src/lib/firestoreService.ts
