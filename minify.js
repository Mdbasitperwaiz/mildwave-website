const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'style.css');
const minCssPath = path.join(__dirname, 'style.min.css');
const jsPath = path.join(__dirname, 'script.js');
const minJsPath = path.join(__dirname, 'script.min.js');
const frontendDir = path.join(__dirname, 'frontend');

try {
  // 1. Minify CSS
  console.log("Minifying CSS...");
  const css = fs.readFileSync(cssPath, 'utf8');
  const minCss = css
    .replace(/\/\*[\s\S]*?\*\//g, '') // remove comments
    .replace(/\s+/g, ' ')             // collapse whitespace
    .replace(/\s*([{}::;])\s*/g, '$1') // remove spaces around symbols
    .replace(/;}/g, '}')              // remove trailing semicolons
    .trim();
  fs.writeFileSync(minCssPath, minCss, 'utf8');
  console.log(`CSS minified: ${css.length} bytes -> ${minCss.length} bytes.`);

  // 2. Minify JS
  console.log("Minifying JS...");
  const js = fs.readFileSync(jsPath, 'utf8');
  
  // Safe JS compression: strip comments and collapse blank lines
  let minJs = js
    .replace(/\/\*[\s\S]*?\*\//g, '') // remove block comments
    .split('\n')
    .map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('//')) return '';
      // Check if line contains a double slash comment that is not a URL
      const doubleSlashIndex = line.indexOf('//');
      if (doubleSlashIndex !== -1) {
        const beforeSlash = line.substring(0, doubleSlashIndex);
        if (!beforeSlash.includes('http:') && !beforeSlash.includes('https:')) {
          return beforeSlash.trim();
        }
      }
      return line;
    })
    .filter(line => line.trim().length > 0)
    .join('\n');

  fs.writeFileSync(minJsPath, minJs, 'utf8');
  console.log(`JS minified: ${js.length} bytes -> ${minJs.length} bytes.`);

  // 3. Sync to frontend directory if it exists
  if (fs.existsSync(frontendDir)) {
    console.log("Syncing to frontend directory...");
    fs.copyFileSync(jsPath, path.join(frontendDir, 'script.js'));
    fs.copyFileSync(minJsPath, path.join(frontendDir, 'script.min.js'));
    fs.copyFileSync(cssPath, path.join(frontendDir, 'style.css'));
    fs.copyFileSync(minCssPath, path.join(frontendDir, 'style.min.css'));
    fs.copyFileSync(path.join(__dirname, 'index.html'), path.join(frontendDir, 'index.html'));
    fs.copyFileSync(path.join(__dirname, '404.html'), path.join(frontendDir, '404.html'));
    console.log("Frontend directory synchronized successfully!");
  }

  console.log("Minification and sync complete!");
} catch (err) {
  console.error("Error during minification:", err);
}
