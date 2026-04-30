require('dotenv').config();
const mongoose = require('mongoose');

const collectionsData = [
  { name: 'سكوب سندورة', imageUrl: 'https://assets.wuiltstore.com/cmo0fglem05nc01lzdnl9fvh8_scope.webp' },
  { name: 'ألعاب', imageUrl: 'https://assets.wuiltstore.com/cmo0gt4x805sk01n0exmd9zpl_Games.webp' },
  { name: 'أدوات فنية / تلوين', imageUrl: 'https://assets.wuiltstore.com/cmo0ghhw505rb01lw53u64q3m_Paint.webp' },
  { name: 'استيكرات', imageUrl: 'https://assets.wuiltstore.com/cmo0gm31705l401l7gsye6xl0_stickers.webp' },
  { name: 'ديكورالمكتب', imageUrl: 'https://assets.wuiltstore.com/cmo04f8v105qn01l8fi0tg23k_WhatsApp_Image_2026-04-15_at_3.59.46_PM.webp' },
  { name: 'المنظمات', imageUrl: 'https://assets.wuiltstore.com/cmo0f1b6005k401l7fifjhre2_organize.webp' },
  { name: 'شنط / توك / اكسسورات', imageUrl: 'https://assets.wuiltstore.com/cmo0ezw3z05n301lzcnujdmqp_bags.webp' },
  { name: 'لانش بوكس/مجات/زجاجات', imageUrl: 'https://assets.wuiltstore.com/cmo0gw54j05nx01lzbeay9u9s_Cups.webp' },
  { name: 'دفاتر / كشاكيل', imageUrl: 'https://assets.wuiltstore.com/cmo0gqr7g05rf01lw67ng3o0i_paper.webp' },
  { name: 'نوت بوك', imageUrl: 'https://assets.wuiltstore.com/cmo0erg2z05mz01lz872kai3p_note.webp' },
  { name: 'استيكي نوت', imageUrl: 'https://assets.wuiltstore.com/cmo0g29og05sc01n09wxm7lm7_stickynotes.webp' },
  { name: 'اقلام متعددة الالوان', imageUrl: 'https://assets.wuiltstore.com/cmo0g4sk405r401lw6l6k74ug_multicolor.webp' },
  { name: 'اقلام جاف / حبر', imageUrl: 'https://assets.wuiltstore.com/cmo0ducgq05mk01lz5hcx85zn_WhatsApp_Image_2026-04-15_at_8.26.26_PM.webp' },
  { name: 'اقلام رصاص / سنون', imageUrl: 'https://assets.wuiltstore.com/cmo0gdy5405r901lw46gq56o6_pencils.webp' },
  { name: 'اقلام هايلايتر', imageUrl: 'https://assets.wuiltstore.com/cmo0ga3u405r801lw8kwmhpz0_hightlighter.webp' },
  { name: 'كوريكتور', imageUrl: 'https://assets.wuiltstore.com/cmo0fxcpd05nj01lzer8ncltm_corrector.webp' },
  { name: 'ادوات التخطيط والتلخيص', imageUrl: 'https://assets.wuiltstore.com/cmo0fe5rz05rs01n088zzaw9p_plaining.webp' },
  { name: 'مقالم مستوردة', imageUrl: 'https://assets.wuiltstore.com/cmo0famk605kc01l7gaiv17yk_case.webp' },
  { name: 'الادوات الهندسيه', imageUrl: 'https://assets.wuiltstore.com/cmo0fz3tj05sa01n0du419tyw_engineeringTools.webp' },
  { name: 'برايات', imageUrl: 'https://assets.wuiltstore.com/cmo0f4fhy05n901lzdk9y3y1n_br.webp' },
  { name: 'أستيكه (جوما)', imageUrl: 'https://assets.wuiltstore.com/cmo0f7oqe05qm01lwbsay4oje_earser.webp' }
];

async function seed() {
  // Try direct nodes if SRV fails
  const directUri = 'mongodb://yousofradi:yousof9009@cluster0-shard-00-00.p4a1m.mongodb.net:27017,cluster0-shard-00-01.p4a1m.mongodb.net:27017,cluster0-shard-00-02.p4a1m.mongodb.net:27017/ecommerce?ssl=true&replicaSet=atlas-m0p4a1-shard-0&authSource=admin&retryWrites=true&w=majority';
  try {
    console.log('Connecting to DB directly...');
    await mongoose.connect(directUri);
    console.log('Connected to DB');

    const Collection = require('./models/Collection');
    const Product = require('./models/Product');

    console.log('Deleting existing collections...');
    await Collection.deleteMany({});
    console.log('Deleted old collections.');

    console.log('Clearing collection references in products...');
    await Product.updateMany({}, { collectionId: null, collectionIds: [] });

    console.log('Inserting new collections...');
    for (const c of collectionsData) {
      c.handle = c.name.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/g, '-').replace(/(^-|-$)+/g, '');
      await Collection.create(c);
    }
    console.log('Successfully inserted new collections.');
    
    process.exit(0);
  } catch (e) {
    console.error('Seed failed:', e);
    process.exit(1);
  }
}

seed();
