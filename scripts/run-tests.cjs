const fs = require('node:fs');
const path = require('node:path');
for (const file of fs.readdirSync(path.join(process.cwd(),'tests')).filter(file=>file.endsWith('.test.ts'))) require(path.join(process.cwd(),'tests',file));
