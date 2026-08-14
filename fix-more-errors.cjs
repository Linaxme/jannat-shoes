const fs = require('fs');

function fixFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Catch remaining cases in PosOrderBuilder and DueManagement, etc.
  content = content.replace(/([a-zA-Z0-9_\.]+(?:phone|shopName|loginId|articleCode|brand|name|memoNo|customerName|sellerName|assignedSellerName|customerPhone|address))\.replace/g, '($1 || "").replace');
  
  content = content.replace(/([a-zA-Z0-9_\.]+(?:phone|shopName|loginId|articleCode|brand|name|memoNo|customerName|sellerName|assignedSellerName|customerPhone|address))\.toLowerCase/g, '($1 || "").toLowerCase');
  
  // Cleanup duplicates
  content = content.replace(/\(\(([a-zA-Z0-9_\.]+) \|\| ""\) \|\| ""\)/g, '($1 || "")');

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('Fixed', file);
  }
}

fixFile('src/components/PosOrderBuilder.tsx');
fixFile('src/components/DueManagement.tsx');
fixFile('src/components/SalesHistory.tsx');
fixFile('src/components/PendingOrders.tsx');
fixFile('src/components/SellerTracking.tsx');
fixFile('src/components/InvoiceModal.tsx');
fixFile('src/components/StockManagement.tsx');
fixFile('src/components/UserManagement.tsx');
fixFile('src/components/LoginModal.tsx');
