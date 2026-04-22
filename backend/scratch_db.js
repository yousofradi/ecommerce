require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('./models/Order');

mongoose.connect(process.env.DB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const orders = await Order.find().lean();
    console.log('Orders:', orders.length);
    for (let o of orders) {
      if (!o.customer || !o.customer.name) {
        console.log('Missing customer info for order:', o.orderId);
      }
    }
    process.exit(0);
  });
