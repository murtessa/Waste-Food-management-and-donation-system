// Import required modules
// const express = require('express');
const mongoose = require('mongoose');
const app = require('./src/app');
const dotenv = require('dotenv');

dotenv.config({ path: './config.env' });

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);
mongoose.connect(DB, {}).then(() => {
  console.log('DB Connection Successfull !');
});

// app.get('/', (req, res) => {
//   res.send('Hello from Express server');
// });

// Start server
// console.log(process.env);
const port = process.env.PORT || 5000;

//  adsfghjkl;'sdfghjkl

// Start the server and listen to the port
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
