// models/user.js
const bcrypt         = require('bcrypt');
const { Connection } = require('../connection');
const mongoUri       = process.env.MONGO_URI || require('../cs304').getMongoUri();

async function createUser({ name, email, password, role }) {
  const db   = await Connection.open(mongoUri, 'users');
  const hash = await bcrypt.hash(password, 12);
  await db.collection('users').insertOne({ name, email, hash, role });
}

async function findUserByEmail(email) {
  const db = await Connection.open(mongoUri, 'users');
  return db.collection('users').findOne({ email });
}

module.exports = { createUser, findUserByEmail };
