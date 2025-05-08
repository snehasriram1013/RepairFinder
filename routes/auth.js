// routes/auth.js
const express                 = require('express');
const bcrypt                  = require('bcrypt');
const { createUser, findUserByEmail } = require('../models/user');
const router                  = express.Router();

// ─── Middleware ──────────────────────────────────────────────────────────────
function requireLogin(req, res, next) {
  return req.session.user
    ? next()
    : res.redirect('/login');
}
function requireAdmin(req, res, next) {
  return req.session.user?.role === 'admin'
    ? next()
    : res.status(403).send('Forbidden');
}

// ─── Registration ─────────────────────────────────────────────────────────────
router.get('/register', (req, res) =>
  res.render('register.ejs', { error: '' })
);
router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.render('register.ejs', { error: 'All fields required.' });
  }
  if (await findUserByEmail(email)) {
    return res.render('register.ejs', { error: 'Email already in use.' });
  }
  await createUser({ name, email, password, role });
  res.redirect('/login');
});

// ─── Login ───────────────────────────────────────────────────────────────────
router.get('/login', (req, res) =>
  res.render('login.ejs', { error: '' })
);
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await findUserByEmail(email);
  if (!user || !(await bcrypt.compare(password, user.hash))) {
    return res.render('login.ejs', { error: 'Invalid credentials.' });
  }
  req.session.user = {
    id:    user._id,
    name:  user.name,
    role:  user.role,
    email: user.email
  };
  res.redirect('/');
});

// ─── Logout ──────────────────────────────────────────────────────────────────
// Support GET so <a href="/logout"> works:
router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});
// And still support POST if you have form-based requests:
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

// ─── Exports ─────────────────────────────────────────────────────────────────
router.requireLogin  = requireLogin;
router.requireAdmin  = requireAdmin;
module.exports      = router;
