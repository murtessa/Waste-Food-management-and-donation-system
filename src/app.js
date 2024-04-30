const express = require('express');
// const morgan = require('morgan');
const cors = require('cors');
const userRoute = require('./routes/userRoutes');
const foodRoute = require('./routes/foodRoutes');

const app = express();

app.use((req, res, next) => {
  res.status(201);
  console.log(' Hello from the middleWare awesome ');
  next();
});
// console.log(process.env.NODE_ENV);

// if (process.env.NODE_ENV === 'development') {
//   app.use(morgan('dev'));
// }
app.use(express.json());
app.use(cors());
app.use('/api/donate/user', userRoute);
app.use('/api/donate/food', foodRoute);
app.use('/uploads', express.static('uploads'));
app.use('/Images', express.static('Images'));

module.exports = app;
