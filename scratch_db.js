const mongoose = require('mongoose');
const Order = require('./backend/models/Order');

mongoose.connect('mongodb://localhost:27017/sundura', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const orders = await Order.find().lean();
    console.log(orders.map(o => o.customer ? o.customer.name : 'NO_CUSTOMER'));
    process.exit(0);
  });
