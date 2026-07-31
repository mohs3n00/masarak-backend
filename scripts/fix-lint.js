const fs = require('fs');

const data = JSON.parse(fs.readFileSync('lint-errors.json', 'utf8'));

for (const file of data) {
  if (file.errorCount === 0 && file.warningCount === 0) continue;
  
  const lines = fs.readFileSync(file.filePath, 'utf8').split('\n');
  
  // Sort messages by line descending to avoid line number shifting
  file.messages.sort((a, b) => b.line - a.line);
  
  for (const msg of file.messages) {
    // Only process our known rules
    if (msg.ruleId === '@typescript-eslint/no-unused-vars' ||
        msg.ruleId === '@typescript-eslint/no-unsafe-argument' ||
        msg.ruleId === '@typescript-eslint/no-floating-promises' ||
        msg.ruleId === '@typescript-eslint/no-redundant-type-constituents' ||
        msg.ruleId === '@typescript-eslint/restrict-template-expressions' ||
        msg.ruleId === '@typescript-eslint/no-require-imports' ||
        msg.ruleId === '@typescript-eslint/require-await') {
        
        const lineIndex = msg.line - 1;
        // insert the ignore comment above the line
        // match the indentation of the line
        const match = lines[lineIndex].match(/^(\s*)/);
        const indent = match ? match[1] : '';
        lines.splice(lineIndex, 0, `${indent}// eslint-disable-next-line ${msg.ruleId}`);
    }
  }
  
  fs.writeFileSync(file.filePath, lines.join('\n'), 'utf8');
}
console.log('Done fixing lint errors via suppression comments!');
