import React, { useState, useMemo, useRef } from 'react';
import { Order, ShoeProduct, SalesRep, Customer, UITheme } from '../types';
import { formatTaka, toBnDigit, formatBnDate, getLocalDateStr } from '../utils/formatters';
import {
  BarChart3,
  Calendar,
  FileSpreadsheet,
  FileText,
  Printer,
  Download,
  Filter,
  Users,
  Store,
  ShoppingBag,
  TrendingUp,
  RotateCcw,
  CheckCircle2,
  Loader2,
  Boxes,
  Percent,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ReportsProps {
  orders: Order[];
  products: ShoeProduct[];
  sellers?: SalesRep[];
  customers?: Customer[];
  activeTheme?: UITheme;
}

export const Reports: React.FC<ReportsProps> = ({
  orders,
  products,
  sellers = [],
  customers = [],
  activeTheme,
}) => {
  const reportPrintRef = useRef<HTMLDivElement>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // Time & Filter State
  const todayStr = getLocalDateStr(new Date());
  const currentYear = new Date().getFullYear().toString();
  const currentMonthNum = (new Date().getMonth() + 1).toString().padStart(2, '0');

  const [reportType, setReportType] = useState<'monthly' | 'annual' | 'custom'>('monthly');
  const [selectedYear, setSelectedYear] = useState<string>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthNum);
  const [startDate, setStartDate] = useState<string>(`${currentYear}-${currentMonthNum}-01`);
  const [endDate, setEndDate] = useState<string>(todayStr);

  const [selectedSellerId, setSelectedSellerId] = useState<string>('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all');
  const [selectedOrderType, setSelectedOrderType] = useState<'all' | 'direct_sale' | 'sample_booking'>('all');

  const monthsList = [
    { num: '01', name: 'জানুয়ারি (January)' },
    { num: '02', name: 'ফেব্রুয়ারি (February)' },
    { num: '03', name: 'মার্চ (March)' },
    { num: '04', name: 'এপ্রিল (April)' },
    { num: '05', name: 'মে (May)' },
    { num: '06', name: 'জুন (June)' },
    { num: '07', name: 'জুলাই (July)' },
    { num: '08', name: 'আগস্ট (August)' },
    { num: '09', name: 'সেপ্টেম্বর (September)' },
    { num: '10', name: 'অক্টোবর (October)' },
    { num: '11', name: 'নভেম্বর (November)' },
    { num: '12', name: 'ডিসেম্বর (December)' },
  ];

  const yearsList = ['2024', '2025', '2026', '2027', '2028'];

  // Filtered Orders Calculation
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Date Filter
      if (reportType === 'monthly') {
        const orderPrefix = `${selectedYear}-${selectedMonth}`;
        if (!o.date.startsWith(orderPrefix)) return false;
      } else if (reportType === 'annual') {
        if (!o.date.startsWith(selectedYear)) return false;
      } else if (reportType === 'custom') {
        if (startDate && o.date < startDate) return false;
        if (endDate && o.date > endDate) return false;
      }

      // Seller Filter
      if (selectedSellerId !== 'all') {
        if (o.sellerId !== selectedSellerId && o.sellerName !== selectedSellerId) {
          return false;
        }
      }

      // Customer Filter
      if (selectedCustomerId !== 'all') {
        if (o.customerId !== selectedCustomerId && o.customerShop !== selectedCustomerId && o.shopName !== selectedCustomerId) {
          return false;
        }
      }

      // Order Type
      if (selectedOrderType !== 'all') {
        if (o.orderType !== selectedOrderType) return false;
      }

      return true;
    });
  }, [orders, reportType, selectedYear, selectedMonth, startDate, endDate, selectedSellerId, selectedCustomerId, selectedOrderType]);

  // Aggregate Metrics
  const totalSalesRevenue = filteredOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
  const totalCashCollected = filteredOrders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
  const totalNewDue = filteredOrders.reduce((sum, o) => sum + (o.dueAmount || 0), 0);
  const totalDiscounts = filteredOrders.reduce((sum, o) => sum + (o.discount || 0), 0);
  const totalPairsSold = filteredOrders.reduce((sum, o) => sum + (o.totalPairs || 0), 0);
  const totalOrdersCount = filteredOrders.length;

  // COGS & Profit
  let totalCostOfGoods = 0;
  filteredOrders.forEach((o) => {
    o.items?.forEach((item) => {
      totalCostOfGoods += (item.totalPairs || 0) * (item.unitBuyPrice || 0);
    });
  });
  const grossProfit = totalSalesRevenue - totalCostOfGoods;
  const profitMarginPercent = totalSalesRevenue > 0 ? Math.round((grossProfit / totalSalesRevenue) * 100) : 0;

  // Group by Date for Chart
  const chartData = useMemo(() => {
    const map: Record<string, { date: string; rawDate: string; sales: number; cash: number; pairs: number }> = {};
    filteredOrders.forEach((o) => {
      if (!map[o.date]) {
        map[o.date] = { date: formatBnDate(o.date), rawDate: o.date, sales: 0, cash: 0, pairs: 0 };
      }
      map[o.date].sales += o.grandTotal || 0;
      map[o.date].cash += o.paidAmount || 0;
      map[o.date].pairs += o.totalPairs || 0;
    });
    return Object.values(map).sort((a, b) => a.rawDate.localeCompare(b.rawDate));
  }, [filteredOrders]);

  // Top Selling Shoe Articles
  const topArticles = useMemo(() => {
    const map: Record<string, { articleCode: string; productName: string; pairs: number; revenue: number; ordersCount: number }> = {};
    filteredOrders.forEach((o) => {
      o.items?.forEach((item) => {
        const code = item.articleCode || 'N/A';
        if (!map[code]) {
          map[code] = {
            articleCode: code,
            productName: item.productName || code,
            pairs: 0,
            revenue: 0,
            ordersCount: 0,
          };
        }
        map[code].pairs += item.totalPairs || 0;
        map[code].revenue += item.totalAmount || 0;
        map[code].ordersCount += 1;
      });
    });
    return Object.values(map).sort((a, b) => b.pairs - a.pairs);
  }, [filteredOrders]);

  // Seller Performance Summary
  const sellerBreakdown = useMemo(() => {
    const map: Record<string, { name: string; sales: number; cash: number; pairs: number; orders: number }> = {};
    filteredOrders.forEach((o) => {
      const seller = o.sellerName || 'প্রধান শাখা';
      if (!map[seller]) {
        map[seller] = { name: seller, sales: 0, cash: 0, pairs: 0, orders: 0 };
      }
      map[seller].sales += o.grandTotal || 0;
      map[seller].cash += o.paidAmount || 0;
      map[seller].pairs += o.totalPairs || 0;
      map[seller].orders += 1;
    });
    return Object.values(map).sort((a, b) => b.sales - a.sales);
  }, [filteredOrders]);

  // Customer / Shop Breakdown
  const shopBreakdown = useMemo(() => {
    const map: Record<string, { shopName: string; customerName: string; phone: string; sales: number; cash: number; due: number; pairs: number; orders: number }> = {};
    filteredOrders.forEach((o) => {
      const shop = o.customerShop || o.shopName || 'সাধারণ ক্রেতা';
      if (!map[shop]) {
        map[shop] = {
          shopName: shop,
          customerName: o.customerName || '-',
          phone: o.customerPhone || '-',
          sales: 0,
          cash: 0,
          due: 0,
          pairs: 0,
          orders: 0,
        };
      }
      map[shop].sales += o.grandTotal || 0;
      map[shop].cash += o.paidAmount || 0;
      map[shop].due += o.dueAmount || 0;
      map[shop].pairs += o.totalPairs || 0;
      map[shop].orders += 1;
    });
    return Object.values(map).sort((a, b) => b.sales - a.sales);
  }, [filteredOrders]);

  // Get dynamic report title
  const getReportPeriodTitle = () => {
    if (reportType === 'monthly') {
      const monthObj = monthsList.find((m) => m.num === selectedMonth);
      return `${monthObj?.name.split(' ')[0]} ${selectedYear} এর মাসিক রিপোর্ট`;
    }
    if (reportType === 'annual') {
      return `${selectedYear} সালের বার্ষিক রিপোর্ট`;
    }
    return `${formatBnDate(startDate)} থেকে ${formatBnDate(endDate)} এর কাস্টম রিপোর্ট`;
  };

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    try {
      setIsExportingExcel(true);

      const wb = XLSX.utils.book_new();

      // Sheet 1: Summary KPI Metrics
      const summaryData = [
        ['মেসার্স জান্নাত সুজ - সেলস ও ব্যবসায়িক রিপোর্ট'],
        ['প্রতিবেদনের সময়কাল:', getReportPeriodTitle()],
        ['তৈরির তারিখ:', new Date().toLocaleDateString('bn-BD')],
        [],
        ['মেট্রিক (Metric)', 'পরিমাণ / টাকা (BDT)'],
        ['মোট বিক্রয় (Total Revenue)', totalSalesRevenue],
        ['মোট বিক্রীত জুতো (Total Pairs Sold)', `${totalPairsSold} জোড়া`],
        ['মোট নগদ আদায় (Cash Collected)', totalCashCollected],
        ['নতুন বাকী (New Due Created)', totalNewDue],
        ['মোট ডিসকাউন্ট (Total Discount)', totalDiscounts],
        ['মোট মেমো / অর্ডার সংখ্যা', totalOrdersCount],
        ['মোট ক্রয়মূল্য (COGS)', totalCostOfGoods],
        ['মোট স্থূল লাভ (Gross Profit)', grossProfit],
        ['মুনাফার হার (Margin %)', `${profitMarginPercent}%`],
      ];
      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'সারসংক্ষেপ');

      // Sheet 2: All Order Invoices
      const ordersData = [
        ['মেমো নং', 'তারিখ', 'দোকানের নাম', 'প্রোপাইটার', 'মোবাইল', 'সেলার', 'মোট জোড়া', 'মোট বিল (৳)', 'নগদ জমা (৳)', 'বাকী (৳)', 'অর্ডার ধরন'],
        ...filteredOrders.map((o) => [
          o.memoNo,
          o.date,
          o.customerShop || o.shopName,
          o.customerName,
          o.customerPhone,
          o.sellerName,
          o.totalPairs,
          o.grandTotal,
          o.paidAmount,
          o.dueAmount,
          o.orderType === 'sample_booking' ? 'স্যাম্পল বুকিং' : 'সরাসরি বিক্রয়',
        ]),
      ];
      const ordersWs = XLSX.utils.aoa_to_sheet(ordersData);
      XLSX.utils.book_append_sheet(wb, ordersWs, 'মেমো ও চালান তালিকা');

      // Sheet 3: Top Selling Articles
      const articlesData = [
        ['ক্র: নং', 'আর্টিকল কোড', 'মডেল নাম', 'বিক্রীত জোড়া', 'মোট বিক্রয় মূল্য (৳)', 'অর্ডার সংখ্যা'],
        ...topArticles.map((a, idx) => [
          idx + 1,
          a.articleCode,
          a.productName,
          a.pairs,
          a.revenue,
          a.ordersCount,
        ]),
      ];
      const articlesWs = XLSX.utils.aoa_to_sheet(articlesData);
      XLSX.utils.book_append_sheet(wb, articlesWs, 'জুতার মডেল পারফরম্যান্স');

      // Sheet 4: Shop Breakdown
      const shopsData = [
        ['দোকানের নাম', 'মালিক', 'মোবাইল', 'মোট মেমো', 'মোট জোড়া', 'মোট বিক্রয় (৳)', 'নগদ জমা (৳)', 'চালানের বাকী (৳)'],
        ...shopBreakdown.map((s) => [
          s.shopName,
          s.customerName,
          s.phone,
          s.orders,
          s.pairs,
          s.sales,
          s.cash,
          s.due,
        ]),
      ];
      const shopsWs = XLSX.utils.aoa_to_sheet(shopsData);
      XLSX.utils.book_append_sheet(wb, shopsWs, 'দোকানদার হিসাব');

      const fileName = `Jannat_Shoes_Report_${reportType}_${selectedYear}${reportType === 'monthly' ? '_' + selectedMonth : ''}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error('Excel export failed:', err);
      alert('এক্সেল ফাইল তৈরিতে সমস্যা হয়েছে।');
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Export to PDF
  const handleExportPDF = async () => {
    if (!reportPrintRef.current) return;
    try {
      setIsExportingPDF(true);

      const canvas = await html2canvas(reportPrintRef.current, {
        scale: 2.2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      const fileName = `Jannat_Shoes_Report_${reportType}_${selectedYear}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('PDF তৈরিতে সমস্যা হয়েছে। দয়া করে প্রিন্ট বা এক্সেল অপশন ব্যবহার করুন।');
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header & Filter Controls */}
      <div className="bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-2xl space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-amber-400" />
              কাস্টম রিপোর্ট ও ডাউনলোড কেন্দ্র
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              মাসিক, বার্ষিক ও কাস্টম সময়কালের পূর্ণাঙ্গ বিক্রয় ও বকেয়া রিপোর্ট (PDF ও Excel এ ডাউনলোডযোগ্য)।
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportExcel}
              disabled={isExportingExcel || filteredOrders.length === 0}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800/50 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-900/30 transition cursor-pointer"
              title="এক্সেল স্প্রেডশীট (.xlsx) ডাউনলোড করুন"
            >
              {isExportingExcel ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
              <span>Excel ডাউনলোড</span>
            </button>

            <button
              onClick={handleExportPDF}
              disabled={isExportingPDF || filteredOrders.length === 0}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-800/50 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-rose-900/30 transition cursor-pointer"
              title="PDF রিপোর্ট ফাইল ডাউনলোড করুন"
            >
              {isExportingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              <span>PDF ডাউনলোড</span>
            </button>

            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center gap-2 border border-slate-700 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">প্রিন্ট</span>
            </button>
          </div>
        </div>

        {/* Period Selector Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          
          <div className="md:col-span-4 flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setReportType('monthly')}
              className={`flex-1 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                reportType === 'monthly' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              মাসিক রিপোর্ট
            </button>
            <button
              onClick={() => setReportType('annual')}
              className={`flex-1 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                reportType === 'annual' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              বার্ষিক রিপোর্ট
            </button>
            <button
              onClick={() => setReportType('custom')}
              className={`flex-1 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                reportType === 'custom' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              কাস্টম তারিখ
            </button>
          </div>

          {/* Dynamic Month / Year / Date Range Inputs */}
          <div className="md:col-span-8 flex items-center gap-2 flex-wrap">
            {reportType === 'monthly' && (
              <>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-xs text-amber-300 font-bold rounded-xl px-3 py-2 focus:outline-none"
                >
                  {monthsList.map((m) => (
                    <option key={m.num} value={m.num} className="bg-slate-900 text-slate-100">
                      {m.name}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-xs text-amber-300 font-bold rounded-xl px-3 py-2 focus:outline-none"
                >
                  {yearsList.map((y) => (
                    <option key={y} value={y} className="bg-slate-900 text-slate-100">
                      {y} সাল
                    </option>
                  ))}
                </select>
              </>
            )}

            {reportType === 'annual' && (
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-xs text-amber-300 font-bold rounded-xl px-4 py-2 focus:outline-none"
              >
                {yearsList.map((y) => (
                  <option key={y} value={y} className="bg-slate-900 text-slate-100">
                    {y} সাল
                  </option>
                ))}
              </select>
            )}

            {reportType === 'custom' && (
              <div className="flex items-center gap-2 text-xs">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-amber-300 rounded-xl px-3 py-1.5 focus:outline-none"
                />
                <span className="text-slate-400">থেকে</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-amber-300 rounded-xl px-3 py-1.5 focus:outline-none"
                />
              </div>
            )}

            {/* Seller Filter */}
            {sellers.length > 0 && (
              <select
                value={selectedSellerId}
                onChange={(e) => setSelectedSellerId(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none"
              >
                <option value="all">সকল সেলার</option>
                {sellers.map((s) => (
                  <option key={s.id} value={s.name} className="bg-slate-900 text-slate-100">
                    {s.name} ({s.area})
                  </option>
                ))}
              </select>
            )}

            {/* Reset Button */}
            {(selectedSellerId !== 'all' || selectedCustomerId !== 'all') && (
              <button
                onClick={() => {
                  setSelectedSellerId('all');
                  setSelectedCustomerId('all');
                }}
                className="p-2 text-slate-400 hover:text-white rounded-lg"
                title="ফিল্টার রিসেট করুন"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>

        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>মোট বিক্রয়</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <h3 className="text-2xl font-black text-amber-300 mt-1">{formatTaka(totalSalesRevenue)}</h3>
          <p className="text-[11px] text-slate-400 mt-1">
            মোট বিক্রীত জুতো: <span className="font-bold text-slate-200">{toBnDigit(totalPairsSold)} জোড়া</span>
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>নগদ আদায় ও কালেকশন</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <h3 className="text-2xl font-black text-emerald-400 mt-1">{formatTaka(totalCashCollected)}</h3>
          <p className="text-[11px] text-slate-400 mt-1">
            মেমো সংখ্যা: <span className="font-bold text-slate-200">{toBnDigit(totalOrdersCount)}টি</span>
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>নতুন সৃষ্ট বাকী (Due)</span>
            <Users className="w-4 h-4 text-rose-400" />
          </div>
          <h3 className="text-2xl font-black text-rose-400 mt-1">{formatTaka(totalNewDue)}</h3>
          <p className="text-[11px] text-slate-400 mt-1">
            ডিসকাউন্ট: <span className="font-bold text-slate-200">{formatTaka(totalDiscounts)}</span>
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>মোট লাভ ও মার্জিন</span>
            <Percent className="w-4 h-4 text-indigo-400" />
          </div>
          <h3 className="text-2xl font-black text-indigo-300 mt-1">{formatTaka(grossProfit)}</h3>
          <p className="text-[11px] text-slate-400 mt-1">
            মুনাফার হার: <span className="font-bold text-amber-300">{toBnDigit(profitMarginPercent)}%</span>
          </p>
        </div>

      </div>

      {/* Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Sales & Cash Trend Chart (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            বিক্রয় ও নগদ আদায়ের দৈনিক ট্রেন্ড
          </h3>
          <div className="h-72 w-full pt-2">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                সিলেক্ট করা সময়ে কোনো বিক্রয়ের ডাটা নেই।
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="sales" name="বিক্রয় (৳)" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="cash" name="নগদ আদায় (৳)" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top Selling Shoe Models (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-amber-400" />
            সেরা বিক্রীত মডেল (Top Articles)
          </h3>

          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
            {topArticles.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">কোনো তথ্য নেই</div>
            ) : (
              topArticles.slice(0, 10).map((a, idx) => (
                <div
                  key={a.articleCode}
                  className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between text-xs hover:border-slate-700 transition"
                >
                  <div>
                    <div className="font-bold text-slate-100 flex items-center gap-1.5">
                      <span className="text-amber-400 font-mono">#{idx + 1}</span>
                      <span>{a.articleCode}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{a.productName}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-amber-300">{toBnDigit(a.pairs)} জোড়া</div>
                    <div className="text-[10px] text-emerald-400 font-mono">{formatTaka(a.revenue)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Seller Breakdown Table */}
      {sellerBreakdown.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-400" />
            সেলার অনুযায়ী পারফরম্যান্স সারসংক্ষেপ
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <th className="p-3 font-semibold">সেলার নাম</th>
                  <th className="p-3 font-semibold text-center">মেমো সংখ্যা</th>
                  <th className="p-3 font-semibold text-center">মোট জোড়া</th>
                  <th className="p-3 font-semibold text-right">মোট বিক্রয় (৳)</th>
                  <th className="p-3 font-semibold text-right">নগদ আদায় (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {sellerBreakdown.map((s) => (
                  <tr key={s.name} className="hover:bg-slate-800/40">
                    <td className="p-3 font-bold text-white flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-amber-400" />
                      {s.name}
                    </td>
                    <td className="p-3 text-center text-slate-300">{toBnDigit(s.orders)}</td>
                    <td className="p-3 text-center font-bold text-amber-300">{toBnDigit(s.pairs)} জোড়া</td>
                    <td className="p-3 text-right font-black text-emerald-400">{formatTaka(s.sales)}</td>
                    <td className="p-3 text-right font-bold text-slate-200">{formatTaka(s.cash)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Printable Report Hidden Section for High-Res PDF generation */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div
          ref={reportPrintRef}
          style={{ width: '800px', backgroundColor: '#ffffff', color: '#0f172a', padding: '32px', fontFamily: 'sans-serif' }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '16px', marginBottom: '20px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '900', margin: '0 0 4px 0' }}>মেসার্স জান্নাত সুজ</h1>
            <p style={{ fontSize: '12px', margin: '0 0 6px 0', color: '#475569' }}>
              সকল প্রকার দেশী ও বিদেশী পুরুষ, মহিলা ও বাচ্চাদের পাইকারি জুতা বিক্রয় কেন্দ্র
            </p>
            <p style={{ fontSize: '11px', margin: '0 0 8px 0', color: '#64748b' }}>
              ফুলবাড়িয়া পাইকারি জুতা মার্কেট (২য় তলা), ঢাকা | ফোন: ০১৭১১-০০১১৮৮
            </p>
            <div style={{ display: 'inline-block', backgroundColor: '#0f172a', color: '#ffffff', padding: '4px 16px', borderRadius: '9999px', fontSize: '12px', fontWeight: 'bold' }}>
              {getReportPeriodTitle()}
            </div>
          </div>

          {/* KPI Summary Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '12px', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: '#64748b' }}>মোট বিক্রয়</div>
              <div style={{ fontSize: '16px', fontWeight: '900', color: '#0f172a' }}>{formatTaka(totalSalesRevenue)}</div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>{toBnDigit(totalPairsSold)} জোড়া</div>
            </div>
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '12px', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: '#64748b' }}>নগদ আদায়</div>
              <div style={{ fontSize: '16px', fontWeight: '900', color: '#16a34a' }}>{formatTaka(totalCashCollected)}</div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>{toBnDigit(totalOrdersCount)}টি চালান</div>
            </div>
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '12px', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: '#64748b' }}>নতুন বাকী</div>
              <div style={{ fontSize: '16px', fontWeight: '900', color: '#dc2626' }}>{formatTaka(totalNewDue)}</div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>ছাড়: {formatTaka(totalDiscounts)}</div>
            </div>
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '12px', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: '#64748b' }}>মোট লাভ (Margin)</div>
              <div style={{ fontSize: '16px', fontWeight: '900', color: '#4f46e5' }}>{formatTaka(grossProfit)}</div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>মার্জিন: {toBnDigit(profitMarginPercent)}%</div>
            </div>
          </div>

          {/* Top Models Table */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', borderBottom: '1px solid #0f172a', paddingBottom: '4px' }}>
              সেরা বিক্রীত জুতার মডেল তালিকা:
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                  <th style={{ padding: '6px', border: '1px solid #0f172a', textAlign: 'center' }}>ক্র:</th>
                  <th style={{ padding: '6px', border: '1px solid #0f172a' }}>আর্টিকল কোড</th>
                  <th style={{ padding: '6px', border: '1px solid #0f172a' }}>মডেল নাম</th>
                  <th style={{ padding: '6px', border: '1px solid #0f172a', textAlign: 'center' }}>বিক্রীত জোড়া</th>
                  <th style={{ padding: '6px', border: '1px solid #0f172a', textAlign: 'right' }}>মোট বিক্রয় (৳)</th>
                </tr>
              </thead>
              <tbody>
                {topArticles.slice(0, 15).map((a, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '5px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{toBnDigit(idx + 1)}</td>
                    <td style={{ padding: '5px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>{a.articleCode}</td>
                    <td style={{ padding: '5px', border: '1px solid #cbd5e1' }}>{a.productName}</td>
                    <td style={{ padding: '5px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 'bold' }}>{toBnDigit(a.pairs)}</td>
                    <td style={{ padding: '5px', border: '1px solid #cbd5e1', textAlign: 'right', fontWeight: 'bold' }}>{formatTaka(a.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px', fontSize: '10px', color: '#64748b' }}>
            <div>রিপোর্ট তৈরির সময়: {new Date().toLocaleString('bn-BD')}</div>
            <div style={{ borderTop: '1px solid #0f172a', paddingTop: '4px', width: '120px', textAlign: 'center', fontWeight: 'bold', color: '#0f172a' }}>
              হিসাবরক্ষক / পরিচালক
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
