const fs = require('fs');
const file = "/Users/elbruz/QINTOMB/Github/mtrprv/app/(dashboard)/coach/athletes/page.tsx";
const code = fs.readFileSync(file, 'utf8');

// A very simple checker for unmatched quotes/brackets
let stack = [];
let lines = code.split('\n');

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  for (let j = 0; j < line.length; j++) {
    let char = line[j];
    
    // Simplistic quote tracking
    if (char === '"' || char === "'" || char === '`') {
      if (stack.length > 0 && stack[stack.length - 1] === char) {
        // If it's a double quote and the previous char is a backslash, it's escaped
        if (j > 0 && line[j-1] === '\\') continue;
        stack.pop(); // close quote
      } else if (stack.length === 0 || (stack[stack.length - 1] !== '"' && stack[stack.length - 1] !== "'" && stack[stack.length - 1] !== '`')) {
        stack.push(char); // open quote
      }
    }
  }
}

console.log("Unclosed stack:", stack);
