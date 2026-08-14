const fs = require('fs');

function fixFile(file) {
  let content = fs.readFileSync(file, 'utf8');

  // Fix replace(/\D/g)
  content = content.replace(/([a-zA-Z0-9_\.]+(?:phone|shopName|loginId|articleCode|brand|name))\.replace/g, '($1 || "").replace');
  // Fix toLowerCase()
  content = content.replace(/([a-zA-Z0-9_\.]+(?:phone|shopName|loginId|articleCode|brand|name))\.toLowerCase\(\)/g, '($1 || "").toLowerCase()');
  // Fix trim().toLowerCase()
  content = content.replace(/([a-zA-Z0-9_\.]+(?:phone|shopName|loginId|articleCode|brand|name))\.trim\(\)\.toLowerCase\(\)/g, '($1 || "").trim().toLowerCase()');

  // Clean up cases where it became ((foo || "") || "")
  content = content.replace(/\(\(([a-zA-Z0-9_\.]+) \|\| ""\) \|\| ""\)/g, '($1 || "")');

  fs.writeFileSync(file, content);
}

fixFile('src/App.tsx');
fixFile('src/components/CustomerStorefront.tsx');
fixFile('src/components/Dashboard.tsx');
fixFile('src/components/PosOrderBuilder.tsx');

