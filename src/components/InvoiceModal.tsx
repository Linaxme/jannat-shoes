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

    let itemsText = '';
    order.items.forEach((item, idx) => {
      const commText = item.commissionPerPair && item.commissionPerPair > 0 ? ` (-${item.commissionPerPair}৳ কমিশন)` : '';
      itemsText += `${idx + 1}. আর্টিকল: ${item.articleCode} | সাইজ: ${item.sizeRange} | ${toBnDigit(item.totalPairs)} জোড়া | দর: ${item.unitSellPrice}৳${commText} | মোট: ${item.totalAmount}৳\n`;
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
      `সর্বমোট নিট বিল: *${formatTaka(order.grandTotal)}*\n` +
      `নগদ জমা: *${formatTaka(order.paidAmount)}*\n` +
      `চালানের বাকী: *${formatTaka(order.dueAmount)}*\n` +
      `পূর্বের বাকী: *${formatTaka(order.previousDue)}*\n` +
      `সর্বমোট বকেয়া (Due): *${formatTaka(order.totalNetDue)}*\n` +
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
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white text-slate-900 rounded-2xl max-w-2xl w-full p-3 sm:p-6 shadow-2xl space-y-4 my-auto print:shadow-none print:p-0 print:max-w-none print:w-full print:m-0">
        
        {/* Modal Controls (Hidden in Print) */}
        <div className="flex items-center justify-between border-b pb-3 print:hidden flex-wrap gap-2">
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs sm:text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>ক্যাশ মেমো প্রস্তুত</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* WhatsApp Button */}
            <button
              onClick={handleShareWhatsApp}
              className="px-3 py-2 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow transition-colors cursor-pointer"
              title="হোয়াটসঅ্যাপে মেমোর হিসাব পাঠান"
            >
              <Share2 className="w-4 h-4" />
              <span>WhatsApp</span>
            </button>

            {/* Save Image Button */}
            <button
              onClick={handleDownloadImage}
              disabled={isDownloading}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow transition-colors cursor-pointer"
              title="ছবি হিসেবে মেমো গ্যালারিতে সেভ করুন"
            >
              {isDownloading && downloadType === 'image' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
              <span className="hidden sm:inline">ছবি সেভ</span>
            </button>

            {/* PDF Download Button */}
            <button
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="px-3 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow transition-colors cursor-pointer"
              title="PDF ফাইল ডাউনলোড করুন"
            >
              {isDownloading && downloadType === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              <span className="hidden sm:inline">PDF</span>
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">প্রিন্ট</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>


        {/* PRINTABLE MEMO CONTENT AREA */}
        <div ref={memoRef} className="p-3 sm:p-4 border-2 border-slate-900 rounded-xl space-y-3 text-xs font-sans bg-white print:border-none print:p-0">
          
          {/* Shop Header */}
          <div className="text-center border-b-2 border-slate-900 pb-2.5 space-y-0.5">
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-2">
              <Store className="w-5 h-5 text-slate-900 hidden sm:inline" />
              মেসার্স জান্নাত সুজ
            </h1>
            <p className="text-[11px] font-semibold text-slate-700">
              উন্নতমানের পাদুকা পাইকারী বিক্রয়ের বিশ্বস্ত প্রতিষ্ঠান
            </p>
            <div className="text-[10px] text-slate-600 flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 mt-0.5">
              <span className="flex items-center gap-1 font-medium">
                <MapPin className="w-3 h-3 text-slate-600" />
                সানানগর মেইল গেইট, দেবিদ্বার, কুমিল্লা।
              </span>
              <span className="flex items-center gap-1 font-semibold text-slate-800">
                <PhoneCall className="w-3 h-3 text-slate-600" />
                ফোন: ০১৮৭২-২৫৯২৩৭
              </span>
            </div>
            <div className="inline-block px-3 py-0.5 bg-slate-900 text-white font-bold text-[11px] rounded-full mt-1 uppercase tracking-widest">
              ক্যাশ মেমো / চালান
            </div>
          </div>

          {/* Memo Meta & Customer Info Grid */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px]">
            <div className="space-y-0.5">
              <div><span className="font-bold">দোকান:</span> {order.shopName}</div>
              <div><span className="font-bold">প্রোপাইটার:</span> {order.customerName}</div>
              <div><span className="font-bold">ঠিকানা:</span> {order.customerAddress}</div>
              <div><span className="font-bold">মোবাইল:</span> {order.customerPhone || '—'}</div>
            </div>
            <div className="space-y-0.5 text-right">
              <div><span className="font-bold">মেমো নং:</span> <span className="font-mono font-bold text-indigo-900">{order.memoNo}</span></div>
              <div><span className="font-bold">তারিখ:</span> {formatBnDate(order.date)} ({order.time})</div>
              <div><span className="font-bold">সেলার:</span> {order.sellerName}</div>
              <div><span className="font-bold">পেমেন্ট:</span> {order.paymentMethod}</div>
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

              return (
                <>
                  <table className="w-full text-left border-collapse border border-slate-900 text-[10px] sm:text-[11px]">
                    <thead>
                      <tr className="bg-slate-900 text-white font-bold">
                        <th className="p-1 border border-slate-900 text-center w-6">ক্র:</th>
                        <th className="p-1 border border-slate-900">আর্টিকল</th>
                        <th className="p-1 border border-slate-900 text-center">সাইজ</th>
                        <th className="p-1 border border-slate-900 text-center">পরিমাণ</th>
                        <th className="p-1 border border-slate-900 text-center">মোট জোড়া</th>
                        <th className="p-1 border border-slate-900 text-right">দর (৳)</th>
                        {hasCommissionInItems && (
                          <th className="p-1 border border-slate-900 text-right">কমিশন</th>
                        )}
                        <th className="p-1 border border-slate-900 text-right">মোট (৳)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item, idx) => {
                        const artCode = item.articleCode || (item as any).articleNo || (item as any).article || '-';
                        const sizes = item.sizeRange || (item as any).size || (item as any).color || '-';
                        const pairs = item.totalPairs ?? (item as any).pairQty ?? (item as any).quantityInput ?? 0;
                        const price = item.unitSellPrice ?? (item as any).rate ?? (item as any).price ?? 0;
                        const itemTotal = item.totalAmount ?? (item as any).itemTotal ?? (pairs * price);
                        const qtyInput = item.quantityInput || pairs;
                        const unitLabel = item.unitType === 'cartons' ? 'ডজন' : 'জোড়া';

                        return (
                          <tr key={idx} className="border-b border-slate-300">
                            <td className="p-1 border border-slate-900 text-center font-mono">{toBnDigit(idx + 1)}</td>
                            <td className="p-1 border border-slate-900 font-mono font-bold">
                              {artCode}
                            </td>
                            <td className="p-1 border border-slate-900 text-center">{sizes}</td>
                            <td className="p-1 border border-slate-900 text-center">
                              {toBnDigit(qtyInput)} {unitLabel}
                            </td>
                            <td className="p-1 border border-slate-900 text-center font-semibold">
                              {toBnDigit(pairs)}
                            </td>
                            <td className="p-1 border border-slate-900 text-right font-mono">{formatTaka(price)}</td>
                            {hasCommissionInItems && (
                              <td className="p-1 border border-slate-900 text-right font-mono font-semibold text-slate-700">
                                {item.commissionPerPair && item.commissionPerPair > 0 ? `৳${item.commissionPerPair}` : '-'}
                              </td>
                            )}
                            <td className="p-1 border border-slate-900 text-right font-mono font-bold">{formatTaka(itemTotal)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Calculations Summary Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start pt-1">
                    
                    {/* Note & Policy */}
                    <div className="text-[10px] text-slate-600 space-y-0.5 bg-slate-50 p-2 rounded border border-slate-200">
                      <div className="font-bold text-slate-800">শর্তাবলী:</div>
                      <div>১. বিক্রিত মাল ফেরত নেওয়া হয় না, তবে স্টক পরিবর্তন সাপেক্ষ।</div>
                      <div>২. মেমো ছাড়া কোনো অভিযোগ গ্রহণযোগ্য নয়।</div>
                      {order.notes && (
                        <div className="mt-0.5 font-semibold text-slate-800">নোট: {order.notes}</div>
                      )}
                    </div>

                    {/* Calculations */}
                    <table className="w-full text-[10px] sm:text-[11px]">
                      <tbody>
                        <tr>
                          <td className="py-0.5 text-slate-600">মোট জোড়া:</td>
                          <td className="py-0.5 text-right font-bold">{toBnDigit(order.totalPairs)} জোড়া</td>
                        </tr>
                        <tr>
                          <td className="py-0.5 text-slate-600">মোট মূল্য:</td>
                          <td className="py-0.5 text-right font-semibold">{formatTaka(displayGrossTotal)}</td>
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
                        <tr className="border-t border-slate-900 font-bold text-xs">
                          <td className="py-1">সর্বমোট নিট বিল:</td>
                          <td className="py-1 text-right font-black">{formatTaka(order.grandTotal)}</td>
                        </tr>
                <tr className="text-emerald-700 font-bold">
                  <td className="py-0.5">জমা/নগদ প্রদান:</td>
                  <td className="py-0.5 text-right font-black">{formatTaka(order.paidAmount)}</td>
                </tr>
                {order.paidAmount > order.grandTotal && (
                  <tr className="text-emerald-600 font-bold border-t border-slate-300">
                    <td className="py-0.5">অতিরিক্ত জমা (অ্যাডভান্স):</td>
                    <td className="py-0.5 text-right font-black">{formatTaka(order.paidAmount - order.grandTotal)}</td>
                  </tr>
                )}
                {order.paidAmount <= order.grandTotal && (
                  <tr className="text-rose-700 font-bold border-t border-slate-300">
                    <td className="py-0.5">চালানের বাকী:</td>
                    <td className="py-0.5 text-right font-black">{formatTaka(order.dueAmount)}</td>
                  </tr>
                )}
                <tr className="text-slate-600">
                  <td className="py-0.5">পূর্বের মার্কেট বাকী:</td>
                  <td className="py-0.5 text-right font-semibold">{formatTaka(order.previousDue)}</td>
                </tr>
                <tr className="bg-slate-900 text-white font-bold border-t border-slate-900">
                  <td className="p-1">{order.totalNetDue < 0 ? 'বর্তমান অ্যাডভান্স:' : 'বর্তমান মোট বাকী:'}</td>
                  <td className={`p-1 text-right font-black ${order.totalNetDue < 0 ? 'text-emerald-400' : 'text-amber-300'}`}>{formatTaka(Math.abs(order.totalNetDue))}</td>
                </tr>
              </tbody>
            </table>

          </div>

          {/* Signatures Footer */}
          <div className="flex items-center justify-between pt-8 text-[10px] text-slate-700">
            <div className="border-t border-slate-800 pt-1 text-center w-28">
              ক্রেতার স্বাক্ষর
            </div>
            <div className="border-t border-slate-800 pt-1 text-center w-28 font-bold">
              জান্নাত সুজ পক্ষে
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
