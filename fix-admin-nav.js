const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'frontend/admin');

const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') && f !== 'login.html');

const linksToInject = `
        <a href="promotions">
          <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          العروض والخصومات
        </a>
        <a href="gift-collections">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 12v10H4V12"/><path d="M2 7h20v5H2z"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
          مجموعات الهدايا
        </a>`;

files.forEach(f => {
  const p = path.join(dir, f);
  let content = fs.readFileSync(p, 'utf8');
  
  if (content.includes('العروض والخصومات') && f !== 'promotions.html' && f !== 'gift-collections.html') {
     console.log('Skipping ' + f + ', already injected.');
     return;
  }
  
  // Inject before Settings Dropdown
  if (content.includes('<!-- Settings Dropdown Menu -->')) {
    content = content.replace('<!-- Settings Dropdown Menu -->', linksToInject.trim() + '\n        \n        <!-- Settings Dropdown Menu -->');
    fs.writeFileSync(p, content);
    console.log('Injected links into ' + f);
  }
});
