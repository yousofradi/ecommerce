const mongoose = require('mongoose');
const Order = require('./backend/models/Order');

const shippingData = [
  { governorate: 'القاهرة', fee: 85 },
  { governorate: 'الجيزة', fee: 85 },
  { governorate: 'الإسكندرية', fee: 85 },
  { governorate: 'البحيرة', fee: 85 },
  { governorate: 'القليوبية', fee: 85 },
  { governorate: 'الغربية', fee: 85 },
  { governorate: 'المنوفية', fee: 85 },
  { governorate: 'دمياط', fee: 85 },
  { governorate: 'الدقهلية', fee: 85 },
  { governorate: 'كفر الشيخ', fee: 85 },
  { governorate: 'الشرقية', fee: 85 },
  { governorate: 'الاسماعيلية', fee: 95 },
  { governorate: 'السويس', fee: 95 },
  { governorate: 'بورسعيد', fee: 95 },
  { governorate: 'الفيوم', fee: 110 },
  { governorate: 'بني سويف', fee: 110 },
  { governorate: 'المنيا', fee: 110 },
  { governorate: 'اسيوط', fee: 110 },
  { governorate: 'سوهاج', fee: 130 },
  { governorate: 'قنا', fee: 130 },
  { governorate: 'أسوان', fee: 130 },
  { governorate: 'الأقصر', fee: 130 },
  { governorate: 'البحر الأحمر', fee: 130 },
  { governorate: 'مرسي مطروح', fee: 135 },
  { governorate: 'الوادي الجديد', fee: 135 },
  { governorate: 'شمال سيناء', fee: 135 },
  { governorate: 'جنوب سيناء', fee: 135 }
];

async function seedShipping() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://yousofradi:yousof9009@cluster0.p4a1m.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');
  const db = mongoose.connection.useDb('ecommerce');
  const Shipping = db.collection('shipping');
  
  await Shipping.deleteMany({});
  await Shipping.insertMany(shippingData);
  console.log('Shipping updated successfully!');
  process.exit(0);
}

seedShipping().catch(console.error);
