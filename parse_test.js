const fs = require('fs');
const file = "/Users/elbruz/QINTOMB/Github/mtrprv/app/(dashboard)/coach/athletes/page.tsx";
const code = fs.readFileSync(file, 'utf8');

try {
  // If we can require babel/parser or typescript, we can parse it
  const ts = require('typescript');
  const sourceFile = ts.createSourceFile('page.tsx', code, ts.ScriptTarget.Latest, true);
  
  function checkSyntax(node) {
    if (node.kind === ts.SyntaxKind.StringLiteral || node.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral) {
      // Just visiting, parser usually throws or creates error nodes
    }
    ts.forEachChild(node, checkSyntax);
  }
  
  checkSyntax(sourceFile);
  
  const diagnostics = sourceFile.parseDiagnostics;
  if (diagnostics && diagnostics.length > 0) {
    console.log("TS Diagnostics found:", diagnostics.length);
    diagnostics.forEach(d => {
      const pos = sourceFile.getLineAndCharacterOfPosition(d.start);
      console.log(`Line ${pos.line + 1}: ${d.messageText}`);
    });
  } else {
    console.log("No syntax errors found by TS parser.");
  }
} catch (e) {
  console.log("Error loading typescript parser:", e.message);
}
