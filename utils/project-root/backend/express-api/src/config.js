// Loads environment variables
require('dotenv').config();
module.exports = {
  mongoUri: process.env.MONGO_URI,
  port: process.env.PORT || 3000
};
