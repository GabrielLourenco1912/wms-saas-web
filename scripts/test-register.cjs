const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  return resolve.call(this, request.startsWith('@/') ? path.join(process.cwd(), 'src', request.slice(2)) : request, parent, ...rest);
};
for (const extension of ['.ts','.tsx']) {
  require.extensions[extension] = function (module, filename) {
    const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { fileName: filename, compilerOptions: {module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true} });
    module._compile(result.outputText,filename);
  };
}
