const fs = require('fs');
const path = require('path');

const adminDir = path.join(__dirname, 'frontend', 'admin');

fs.readdirSync(adminDir).forEach(f => {
    if (!f.endsWith('.html')) return;
    const filePath = path.join(adminDir, f);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace href="name" with href="name.html"
    // excluding '/', '#', and those already ending in .html
    content = content.replace(/href="([^"#.][^".]*)"/g, (match, p1) => {
        // Skip if it's already a full URL or index or / or starts with ..
        if (p1.startsWith('http') || p1 === '/' || p1 === 'index' || p1.startsWith('..')) return match;
        return `href="${p1}.html"`;
    });
    
    fs.writeFileSync(filePath, content);
});

console.log('Successfully updated admin links to include .html');
