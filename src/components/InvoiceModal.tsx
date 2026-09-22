import React, { useRef, useState } from 'react';
import { Order } from '../types';
import { formatTaka, toBnDigit, formatBnDate } from '../utils/formatters';
import { Printer, X, CheckCircle2, PhoneCall, MapPin, Store, Download, Loader2, Share2, FileText, Image as ImageIcon } from 'lucide-react';
import jsPDF from 'jspdf';
import { toCanvas, toPng } from 'html-to-image';

interface InvoiceModalProps {
  order: Order | null;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ order, onClose }) => {
  const memoRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadType, setDownloadType] = useState<'image' | 'pdf' | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!memoRef.current) return;
    try {
      setIsDownloading(true);
      setDownloadType('pdf');
      
      const canvas = await toCanvas(memoRef.current, {
        backgroundColor: '#ffffff',
        pixelRatio: 2.5,
        cacheBust: true,
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
      pdf.save(`Jannat_Memo_${order.memoNo}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('PDF তৈরিতে সমস্যা হয়েছে। দয়া করে ছবি হিসেবে সেভ বা প্রিন্ট অপশন ব্যবহার করুন।');
    } finally {
      setIsDownloading(false);
      setDownloadType(null);
    }
  };

  const handleDownloadImage = async () => {
    if (!memoRef.current) return;
    try {
      setIsDownloading(true);
      setDownloadType('image');
      
      const canvas = await toCanvas(memoRef.current, {
        backgroundColor: '#ffffff',
        pixelRatio: 2.5,
        cacheBust: true,
      });

      const dataUrl = canvas.toDataURL('image/png');
      const fileName = `Jannat_Memo_${order.memoNo}.png`;

      // Convert to blob for download / share
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (blob) {
        const file = new File([blob], fileName, { type: 'image/png' });

        // Web Share API support for mobile
        if (
          navigator.canShare &&
          navigator.canShare({ files: [file] }) &&
          /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
        ) {
          try {
            await navigator.share({
              files: [file],
              title: `মেমো নং ${order.memoNo}`,
              text: `মেসার্স জান্নাত সুজ - ক্যাশ মেমো ${order.memoNo}`,
            });
            return;
          } catch (shareErr: any) {
            if (shareErr.name === 'AbortError') return;
            console.warn('Share failed:', shareErr);
          }
        }
      }

      // Fallback: Direct Download Link
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setImagePreviewUrl(dataUrl);
    } catch (err) {
      console.error('Failed to download memo image:', err);
      try {
        const dataUrl = await toPng(memoRef.current, { backgroundColor: '#ffffff', pixelRatio: 2, cacheBust: true });
        if (dataUrl) {
          setImagePreviewUrl(dataUrl);
          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = `Jannat_Memo_${order.memoNo}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } catch (e) {
        alert('ছবি ডাউনলোডে সমস্যা হয়েছে। স্ক্রিনশট অথবা প্রিন্ট অপশন ব্যবহার করুন।');
      }
    } finally {
      setIsDownloading(false);
      setDownloadType(null);
    }
  };

  const handleShareWhatsApp = () => {
    const totalOrderCommission = order.totalCommission ?? order.items.reduce(
      (sum, item) => sum + (item.totalPairs * (item.commissionPerPair || 0)),
      0
    );

    const computedGrossTotal = order.items.reduce((sum, item) => {
      const pairs = item.totalPairs ?? (item as any).pairQty ?? (item as any).quantityInput ?? 0;
      const price = item.unitSellPrice ?? (item as any).rate ?? (item as any).price ?? 0;
      return sum + (pairs * price);
    }, 0);

    const displayGrossTotal = computedGrossTotal > 0
      ? computedGrossTotal
      : (order.subTotal && totalOrderCommission > 0 && order.subTotal <= order.grandTotal
          ? order.subTotal + totalOrderCommission
          : (order.subTotal || 0));

    // Ensure Net Bill (সর্বমোট নিট বিল) always has commission subtracted
    const finalGrandTotal = (displayGrossTotal > 0 && totalOrderCommission > 0 && Math.abs(order.grandTotal - displayGrossTotal) < 1)
      ? Math.max(0, displayGrossTotal - totalOrderCommission - (order.discount || 0))
      : (order.grandTotal ?? Math.max(0, displayGrossTotal - totalOrderCommission - (order.discount || 0)));

    const paidAmount = order.paidAmount || 0;
    const finalDueAmount = Math.max(0, finalGrandTotal - paidAmount);
    const finalOverpaid = Math.max(0, paidAmount - finalGrandTotal);
    const previousDue = order.previousDue || 0;
    const finalTotalNetDue = previousDue + finalDueAmount - finalOverpaid;

    let itemsText = '';
    order.items.forEach((item, idx) => {
      const commText = item.commissionPerPair && item.commissionPerPair > 0 ? ` (কমিশন: ৳${item.commissionPerPair}/জোড়া)` : '';
      const pairs = item.totalPairs ?? (item as any).pairQty ?? (item as any).quantityInput ?? 0;
      const price = item.unitSellPrice ?? (item as any).rate ?? (item as any).price ?? 0;
      const grossLine = pairs * price;
      itemsText += `${idx + 1}. আর্টিকল: ${item.articleCode} | সাইজ: ${item.sizeRange} | ${toBnDigit(pairs)} জোড়া | দর: ${formatTaka(price)}${commText} | মোট: ${formatTaka(grossLine)}\n`;
    });

    const text = `*মেসার্স জান্নাত সুজ - ক্যাশ মেমো*\n` +
      `--------------------------------\n` +
      `মেমো নং: *${order.memoNo}*\n` +
      `তারিখ: ${formatBnDate(order.date)} (${order.time || ''})\n` +
      `দোকান: *${order.customerShop || order.shopName}*\n` +
      `প্রোপাইটার: ${order.customerName}\n` +
      `ঠিকানা: ${order.customerAddress}\n` +
      `সেলার: ${order.sellerName || 'প্রধান শাখা'}\n\n` +
      `*পণ্যের বিবরণ:*\n` +
      `${itemsText}` +
      `--------------------------------\n` +
      `মোট জোড়া: *${toBnDigit(order.totalPairs)} জোড়া*\n` +
      `মোট মূল্য: *${formatTaka(displayGrossTotal)}*\n` +
      (totalOrderCommission > 0 ? `জোড়া কমিশন (ছাড়): *- ${formatTaka(totalOrderCommission)}*\n` : '') +
      (order.discount > 0 ? `অতিরিক্ত ছাড়: *- ${formatTaka(order.discount)}*\n` : '') +
      `সর্বমোট নিট বিল: *${formatTaka(finalGrandTotal)}*\n` +
      `নগদ জমা: *${formatTaka(paidAmount)}*\n` +
      (paidAmount > finalGrandTotal
        ? `অতিরিক্ত জমা (অ্যাডভান্স): *+${formatTaka(finalOverpaid)}*\n`
        : `চালানের বাকী: *${formatTaka(finalDueAmount)}*\n`) +
      (previousDue < 0 ? `পূর্বের এডভান্স জমা: *+${formatTaka(Math.abs(previousDue))}*\n` : `পূর্বের বাকী: *${formatTaka(previousDue)}*\n`) +
      (finalTotalNetDue < 0 ? `চূড়ান্ত এডভান্স স্থিতি: *+${formatTaka(Math.abs(finalTotalNetDue))}*\n` : `সর্বমোট বকেয়া (Due): *${formatTaka(finalTotalNetDue)}*\n`) +
      `--------------------------------\n` +
      `_ধন্যবাদ, আবার আসবেন!_\n` +
      `*মেসার্স জান্নাত সুজ*\n` +
      `ঠিকানা: সানানগর মেইল গেইট, দেবিদ্বার, কুমিল্লা।\n` +
      `মোবাইল: ০১৮৭২-২৫৯২৩৭`;

    let phoneStr = (order.customerPhone || "").replace(/[^0-9]/g, '');
    if (!phoneStr) {
      alert('এই কাস্টমারের কোনো মোবাইল নম্বর নেই। সরাসরি লিঙ্ক দিয়ে শেয়ার করা সম্ভব নয়।');
      return;
    }
    if (phoneStr.startsWith('0') && phoneStr.length === 11) {
      phoneStr = '88' + phoneStr;
    } else if (phoneStr.length === 10) {
      phoneStr = '880' + phoneStr;
    }
    const url = `https://wa.me/${phoneStr}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-1.5 sm:p-4 overflow-y-auto">
      <div className="bg-white text-slate-900 rounded-2xl max-w-2xl w-full p-2.5 sm:p-6 shadow-2xl space-y-3.5 sm:space-y-4 my-auto print:shadow-none print:p-0 print:max-w-none print:w-full print:m-0">
        
        {/* Modal Controls (Hidden in Print) */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 print:hidden flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-black text-slate-800 tracking-tight block">ক্যাশ মেমো ভিউ</span>
              <span className="text-[10px] text-slate-500 font-mono font-semibold">মেমো #{order.memoNo}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* WhatsApp Button */}
            <button
              onClick={handleShareWhatsApp}
              className="px-3 py-2 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm hover:shadow transition-all cursor-pointer active:scale-95"
              title="হোয়াটসঅ্যাপে মেমোর হিসাব পাঠান"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>

            {/* Save Image Button */}
            <button
              onClick={handleDownloadImage}
              disabled={isDownloading}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm hover:shadow transition-all cursor-pointer active:scale-95"
              title="ছবি হিসেবে মেমো গ্যালারিতে সেভ করুন"
            >
              {isDownloading && downloadType === 'image' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">ছবি সেভ</span>
            </button>

            {/* PDF Download Button */}
            <button
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="px-3 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm hover:shadow transition-all cursor-pointer active:scale-95"
              title="PDF ফাইল ডাউনলোড করুন"
            >
              {isDownloading && downloadType === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">PDF</span>
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-sm hover:shadow transition-all cursor-pointer active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">প্রিন্ট</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>


        {/* PRINTABLE MEMO CONTENT AREA */}
        <div ref={memoRef} className="p-2 sm:p-5 border border-slate-300 rounded-xl space-y-3 sm:space-y-3.5 text-xs font-sans bg-white print:border-none print:p-0">
          
          {/* Shop Header */}
          <div className="text-center border-b border-slate-200 pb-3 space-y-1">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-2">
              <Store className="w-5 h-5 text-amber-500 hidden sm:inline" />
              মেসার্স জান্নাত সুজ
            </h1>
            <p className="text-xs font-medium text-slate-600">
              উন্নতমানের পাদুকা পাইকারী বিক্রয়ের বিশ্বস্ত প্রতিষ্ঠান
            </p>
            <div className="text-[11px] text-slate-500 flex flex-wrap items-center justify-center gap-x-4 gap-y-0.5 mt-0.5">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                সানানগর মেইল গেইট, দেবিদ্বার, কুমিল্লা
              </span>
              <span className="flex items-center gap-1 font-semibold text-slate-700">
                <PhoneCall className="w-3 h-3 text-slate-400" />
                ০১৮৭২-২৫৯২৩৭
              </span>
            </div>
            <div className="inline-block px-3.5 py-0.5 bg-slate-900 text-amber-400 font-bold text-[10px] rounded-full mt-1.5 uppercase tracking-wider shadow-xs">
              ক্যাশ মেমো / চালান
            </div>
          </div>

          {/* Memo Meta & Customer Info Grid */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 bg-slate-50/80 p-2.5 sm:p-3 rounded-xl border border-slate-200/80 text-[10.5px] sm:text-[11px]">
            <div className="space-y-1">
              <div><span className="text-slate-500 font-medium">দোকানের নাম:</span> <strong className="text-slate-900 font-bold">{order.shopName}</strong></div>
              <div><span className="text-slate-500 font-medium">প্রোপাইটার:</span> <span className="text-slate-800 font-semibold">{order.customerName}</span></div>
              <div><span className="text-slate-500 font-medium">ঠিকানা:</span> <span className="text-slate-700">{order.customerAddress || '—'}</span></div>
              <div><span className="text-slate-500 font-medium">মোবাইল:</span> <span className="text-slate-800 font-mono font-semibold">{order.customerPhone || '—'}</span></div>
            </div>
            <div className="space-y-1 text-right">
              <div><span className="text-slate-500 font-medium">মেমো নং:</span> <span className="font-mono font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">{order.memoNo}</span></div>
              <div><span className="text-slate-500 font-medium">তারিখ:</span> <span className="text-slate-800 font-semibold">{formatBnDate(order.date)} ({order.time})</span></div>
              <div><span className="text-slate-500 font-medium">বিক্রয় প্রতিনিধি:</span> <span className="text-slate-800 font-semibold">{order.sellerName}</span></div>
              <div><span className="text-slate-500 font-medium">পেমেন্ট মাধ্যম:</span> <span className="text-slate-800 font-bold">{order.paymentMethod}</span></div>
            </div>
          </div>

          {/* Itemized Table (Optimized for Mobile single-page view without horizontal scroll) */}
          <div className="w-full">
            {(() => {
              const hasCommissionInItems = order.items.some(
                (item) => item.commissionPerPair && item.commissionPerPair > 0
              );
              const totalOrderCommission = order.totalCommission ?? order.items.reduce(
                (sum, item) => sum + (item.totalPairs * (item.commissionPerPair || 0)),
                0
              );

              // Calculate Gross Total (মালের গায়ের দামের আসল মোট)
              const computedGrossTotal = order.items.reduce((sum, item) => {
                const pairs = item.totalPairs ?? (item as any).pairQty ?? (item as any).quantityInput ?? 0;
                const price = item.unitSellPrice ?? (item as any).rate ?? (item as any).price ?? 0;
                return sum + (pairs * price);
              }, 0);

              // If order.subTotal was saved as net (less than gross), recover actual gross total
              const displayGrossTotal = computedGrossTotal > 0
                ? computedGrossTotal
                : (order.subTotal && totalOrderCommission > 0 && order.subTotal <= order.grandTotal
                    ? order.subTotal + totalOrderCommission
                    : (order.subTotal || 0));

              // Ensure Net Bill (সর্বমোট নিট বিল) always has commission subtracted even if older data was stored incorrectly
              const finalGrandTotal = (displayGrossTotal > 0 && totalOrderCommission > 0 && Math.abs(order.grandTotal - displayGrossTotal) < 1)
                ? Math.max(0, displayGrossTotal - totalOrderCommission - (order.discount || 0))
                : (order.grandTotal ?? Math.max(0, displayGrossTotal - totalOrderCommission - (order.discount || 0)));

              const paidAmount = order.paidAmount || 0;
              const finalDueAmount = Math.max(0, finalGrandTotal - paidAmount);
              const finalOverpaid = Math.max(0, paidAmount - finalGrandTotal);
              const previousDue = order.previousDue || 0;
              const finalTotalNetDue = previousDue + finalDueAmount - finalOverpaid;

              return (
                <>
                  <div className="overflow-x-auto rounded-lg border border-slate-300 shadow-2xs">
                    <table className="w-full text-left border-collapse text-[9.5px] sm:text-[11px]">
                      <thead>
                        <tr className="bg-slate-900 text-white font-bold">
                          <th className="py-1.5 px-1 sm:px-2 text-center w-6 sm:w-7 border-r border-slate-800">ক্র:</th>
                          <th className="py-1.5 px-1.5 sm:px-2 border-r border-slate-800">আর্টিকল</th>
                          <th className="py-1.5 px-1 sm:px-2 text-center border-r border-slate-800">সাইজ</th>
                          <th className="py-1.5 px-1 sm:px-2 text-center border-r border-slate-800">পরিমাণ</th>
                          <th className="py-1.5 px-1 sm:px-2 text-center border-r border-slate-800">মোট জোড়া</th>
                          <th className="py-1.5 px-1.5 sm:px-2 text-right border-r border-slate-800 whitespace-nowrap">দর (৳)</th>
                          {hasCommissionInItems && (
                            <th className="py-1.5 px-1.5 sm:px-2 text-right border-r border-slate-800 whitespace-nowrap">কমিশন</th>
                          )}
                          <th className="py-1.5 px-1.5 sm:px-2 text-right whitespace-nowrap">মোট (৳)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {order.items.map((item, idx) => {
                          const artCode = item.articleCode || (item as any).articleNo || (item as any).article || '-';
                          const sizes = item.sizeRange || (item as any).size || (item as any).color || '-';
                          const pairs = item.totalPairs ?? (item as any).pairQty ?? (item as any).quantityInput ?? 0;
                          const price = item.unitSellPrice ?? (item as any).rate ?? (item as any).price ?? 0;
                          const itemGrossTotal = pairs * price;
                          const qtyInput = item.quantityInput || pairs;
                          const unitLabel = item.unitType === 'cartons' ? 'ডজন' : 'জোড়া';

                          return (
                            <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                              <td className="py-1 px-1 sm:px-2 text-center font-mono text-slate-500 border-r border-slate-200">{toBnDigit(idx + 1)}</td>
                              <td className="py-1 px-1.5 sm:px-2 font-mono font-bold text-slate-900 border-r border-slate-200">
                                {artCode}
                              </td>
                              <td className="py-1 px-1 sm:px-2 text-center text-slate-700 border-r border-slate-200">{sizes}</td>
                              <td className="py-1 px-1 sm:px-2 text-center font-medium text-slate-800 border-r border-slate-200 whitespace-nowrap">
                                {toBnDigit(qtyInput)} {unitLabel}
                              </td>
                              <td className="py-1 px-1 sm:px-2 text-center font-bold text-slate-900 border-r border-slate-200">
                                {toBnDigit(pairs)}
                              </td>
                              <td className="py-1 px-1.5 sm:px-2 text-right font-mono font-semibold text-slate-800 border-r border-slate-200 whitespace-nowrap">{formatTaka(price)}</td>
                              {hasCommissionInItems && (
                                <td className="py-1 px-1.5 sm:px-2 text-right font-mono font-semibold text-amber-700 border-r border-slate-200 whitespace-nowrap">
                                  {item.commissionPerPair && item.commissionPerPair > 0 ? `৳${item.commissionPerPair}` : '-'}
                                </td>
                              )}
                              <td className="py-1 px-1.5 sm:px-2 text-right font-mono font-bold text-slate-900 whitespace-nowrap">{formatTaka(itemGrossTotal)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Calculations Summary Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start pt-2">
                    
                    {/* Note & Policy */}
                    <div className="text-[10px] text-slate-600 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div className="font-bold text-slate-900 flex items-center gap-1">
                        <span>বিশেষ শর্তাবলী:</span>
                      </div>
                      <div className="text-[10.5px] leading-relaxed">১. বিক্রিত মাল ফেরত নেওয়া হয় না, তবে স্টক থাকা সাপেক্ষে পরিবর্তনযোগ্য।</div>
                      <div className="text-[10.5px] leading-relaxed">২. মেমো ছাড়া কোনো প্রকার অভিযোগ গ্রহণযোগ্য হবে না।</div>
                      {order.notes && (
                        <div className="mt-1.5 pt-1.5 border-t border-slate-200 text-slate-800">
                          <strong className="text-slate-900 font-semibold">মন্তব্য/নোট:</strong> {order.notes}
                        </div>
                      )}
                    </div>

                    {/* Calculations */}
                    <div className="bg-slate-50/60 p-2.5 rounded-xl border border-slate-200">
                      <table className="w-full text-[10.5px] sm:text-[11px]">
                        <tbody>
                          <tr>
                            <td className="py-0.5 text-slate-600 font-medium">মোট জোড়া:</td>
                            <td className="py-0.5 text-right font-bold text-slate-900">{toBnDigit(order.totalPairs)} জোড়া</td>
                          </tr>
                          <tr>
                            <td className="py-0.5 text-slate-600 font-medium">মোট মূল্য (গায়ের দর):</td>
                            <td className="py-0.5 text-right font-semibold text-slate-800">{formatTaka(displayGrossTotal)}</td>
                          </tr>
                          {totalOrderCommission > 0 && (
                            <tr>
                              <td className="py-0.5 text-amber-700 font-medium">জোড়া প্রতি কমিশন (ছাড়):</td>
                              <td className="py-0.5 text-right text-amber-700 font-semibold">- {formatTaka(totalOrderCommission)}</td>
                            </tr>
                          )}
                          {order.discount > 0 && (
                            <tr>
                              <td className="py-0.5 text-rose-600 font-medium">অতিরিক্ত ছাড় / ডিসকাউন্ট:</td>
                              <td className="py-0.5 text-right text-rose-600 font-semibold">- {formatTaka(order.discount)}</td>
                            </tr>
                          )}
                          <tr className="border-t border-slate-300 font-bold text-xs">
                            <td className="py-1 text-slate-900">সর্বমোট নিট বিল:</td>
                            <td className="py-1 text-right font-black text-slate-900">{formatTaka(finalGrandTotal)}</td>
                          </tr>
                          <tr className="text-emerald-700 font-bold">
                            <td className="py-0.5">জমা / নগদ প্রদান:</td>
                            <td className="py-0.5 text-right font-black">{formatTaka(paidAmount)}</td>
                          </tr>
                          {paidAmount > finalGrandTotal && (
                            <tr className="text-emerald-600 font-bold border-t border-slate-200">
                              <td className="py-0.5">অতিরিক্ত জমা (অ্যাডভান্স):</td>
                              <td className="py-0.5 text-right font-black">{formatTaka(finalOverpaid)}</td>
                            </tr>
                          )}
                          {paidAmount <= finalGrandTotal && (
                            <tr className="text-rose-700 font-bold border-t border-slate-200">
                              <td className="py-0.5">চালানের নতুন বাকী:</td>
                              <td className="py-0.5 text-right font-black">{formatTaka(finalDueAmount)}</td>
                            </tr>
                          )}
                          <tr className="text-slate-600 border-t border-slate-200">
                            <td className="py-0.5">
                              {previousDue < 0 ? 'পূর্বের অ্যাডভান্স জমা:' : 'পূর্বের মার্কেট বাকী:'}
                            </td>
                            <td className={`py-0.5 text-right font-semibold ${previousDue < 0 ? 'text-emerald-700 font-bold' : 'text-slate-800'}`}>
                              {previousDue < 0 ? `+${formatTaka(Math.abs(previousDue))}` : formatTaka(previousDue)}
                            </td>
                          </tr>
                          <tr className="bg-slate-900 text-white font-bold rounded-lg">
                            <td className="p-1.5 rounded-l-lg">{finalTotalNetDue < 0 ? 'বর্তমান মোট অ্যাডভান্স:' : 'বর্তমান সর্বমোট বাকী:'}</td>
                            <td className={`p-1.5 rounded-r-lg text-right font-black ${finalTotalNetDue < 0 ? 'text-emerald-400' : 'text-amber-300'}`}>
                              {finalTotalNetDue < 0 ? `+${formatTaka(Math.abs(finalTotalNetDue))}` : formatTaka(finalTotalNetDue)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                  </div>

                  {/* Signatures Footer */}
                  <div className="flex items-center justify-between pt-10 text-[10.5px] text-slate-700">
                    <div className="border-t border-slate-400 pt-1 text-center w-32 font-medium">
                      ক্রেতার স্বাক্ষর
                    </div>
                    <div className="border-t border-slate-400 pt-1 text-center w-36 font-bold text-slate-900">
                      জান্নাত সুজের পক্ষে
                    </div>
                  </div>

                </>
              );
            })()}
          </div>

        </div>

        {/* Mobile Image Download / Long-press Modal Fallback */}
        {imagePreviewUrl && (
          <div className="fixed inset-0 z-[60] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-4">
            <div className="bg-slate-900 border border-slate-700 text-white p-4 rounded-2xl max-w-lg w-full space-y-3 text-center shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <Download className="w-4 h-4" />
                  মেমো ছবি গ্যালারিতে সেভ করুন
                </span>
                <button
                  onClick={() => setImagePreviewUrl(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="text-xs text-slate-300 bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl text-left space-y-1">
                <div className="font-bold text-amber-300">ফোনে ডাউনলোড করার সহজ উপায়:</div>
                <div>১. নিচের ছবির ওপর ১-২ সেকেন্ড আঙুল দিয়ে চেপে রাখুন (Long Press)।</div>
                <div>২. অপশন থেকে <strong>"Save Image"</strong>, <strong>"Download Image"</strong> অথবা <strong>"Share Image"</strong> সিলেক্ট করুন।</div>
              </div>

              <div className="max-h-[55vh] overflow-y-auto rounded-xl border border-slate-700 p-1 bg-white">
                <img
                  src={imagePreviewUrl}
                  alt={`Memo ${order.memoNo}`}
                  className="w-full h-auto rounded"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <a
                  href={imagePreviewUrl}
                  download={`Jannat_Memo_${order.memoNo}.png`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition"
                >
                  <Download className="w-4 h-4" />
                  ডাউনলোড করুন
                </a>
                <button
                  onClick={() => setImagePreviewUrl(null)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition"
                >
                  বন্ধ করুন
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
