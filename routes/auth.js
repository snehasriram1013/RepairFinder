// routes/auth.js
const express                       = require('express');
const bcrypt                        = require('bcrypt');
const { createUser, findUserByEmail } = require('../models/user');
const router                        = express.Router();

// ─── Middleware ──────────────────────────────────────────────────────────────
function requireLogin(req, res, next) {
  return req.session.loggedIn
    ? next()
    : res.redirect('/login');
}
function requireAdmin(req, res, next) {
  if (req.session.user?.role === 'admin') {
    return next();
  }
  // Redirect home with an `error` query parameter
  return res.redirect(
    '/?error=' + encodeURIComponent('Access denied: Admins only.')
  );
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

  // **Inside** the login handler: mark session as logged-in
  req.session.loggedIn = true;
  req.session.user = {
    id:    user._id,
    name:  user.name,
    role:  user.role,
    email: user.email
  };

  res.redirect('/');
});

// ─── Logout ──────────────────────────────────────────────────────────────────
// GET handler for <a href="/logout">
router.get('/logout', (req, res) => {
  // **Inside** the logout handler: destroy session
  req.session.destroy(() => res.redirect('/login'));
});
// POST handler if you still use a form-based logout:
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

// ─── Exports ─────────────────────────────────────────────────────────────────
router.requireLogin  = requireLogin;
router.requireAdmin  = requireAdmin;
module.exports       = router;
