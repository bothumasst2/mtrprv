const fs = require('fs');

const files = [
  "/Users/elbruz/QINTOMB/Github/mtrprv/app/(dashboard)/coach/athletes/page.tsx",
  "/Users/elbruz/QINTOMB/Github/mtrprv/app/(dashboard)/coach/active-assignments/page.tsx",
  "/Users/elbruz/QINTOMB/Github/mtrprv/app/(dashboard)/coach/dashboard/page.tsx",
  "/Users/elbruz/QINTOMB/Github/mtrprv/app/(dashboard)/coach/training-history/page.tsx",
  "/Users/elbruz/QINTOMB/Github/mtrprv/app/(dashboard)/coach/training-menu/page.tsx",
];

files.forEach(file => {
  try {
    const code = fs.readFileSync(file, 'utf8');
    // try to parse using acorn or similar, but since we don't have it, let's just count quotes
    const singleQuotes = (code.match(/'/g) || []).length;
    const doubleQuotes = (code.match(/"/g) || []).length;
    const backticks = (code.match(/`/g) || []).length;
    
    console.log(`${file}:`);
    console.log(`  Single quotes: ${singleQuotes} (even: ${singleQuotes % 2 === 0})`);
    console.log(`  Double quotes: ${doubleQuotes} (even: ${doubleQuotes % 2 === 0})`);
    console.log(`  Backticks: ${backticks} (even: ${backticks % 2 === 0})`);
  } catch(e) {
    console.error(e);
  }
})
