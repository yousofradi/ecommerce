/**
 * seed-remote.js — Sends CSV data to the deployed seed API endpoint
 * Usage: node seed-remote.js [--clean]
 */
const fs = require('fs');

const API_BASE = process.env.API_BASE || 'https://sundurashop-manage.onrender.com/api';
const ADMIN_KEY = process.env.ADMIN_API_KEY || '';

async function main() {
  const clean = process.argv.includes('--clean');
  
  console.log('📄 Reading CSV...');
  const csvData = fs.readFileSync('./Product-List.csv', 'utf-8');
  console.log(`📦 CSV size: ${(csvData.length / 1024).toFixed(1)} KB`);

  console.log(`🚀 Sending to ${API_BASE}/seed (clean=${clean})...`);
  
  const res = await fetch(`${API_BASE}/seed`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': ADMIN_KEY
    },
    body: JSON.stringify({ csvData, clean })
  });

  const data = await res.json();
  
  if (res.ok) {
    console.log('✅', data.message);
  } else {
    console.error('❌', data.error || 'Failed');
  }
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
