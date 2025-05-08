// server.js
// Sneha Sriram made this file

const path        = require('path');
require("dotenv").config({ path: path.join(process.env.HOME, '.cs304env') });
const express     = require('express');
const serveStatic = require('serve-static');
const bodyParser  = require('body-parser');
const multer      = require('multer');
const session     = require('express-session');
const MongoStore  = require('connect-mongo');

const { Connection } = require('./connection');
const cs304          = require('./cs304');
const authRouter     = require('./routes/auth');
const { requireLogin, requireAdmin } = authRouter;

// Multer setup (unchanged)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads'),
  filename:    (req, file, cb) => {
    const parts  = file.originalname.split('.');
    const ext    = parts.pop();
    const hhmmss = (() => {
      const d2 = v => v < 10 ? '0'+v : v;
      const now = new Date();
      return d2(now.getHours()) + d2(now.getMinutes()) + d2(now.getSeconds());
    })();
    cb(null, `${file.fieldname}-${hhmmss}.${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 1_000_000 } });

// Create app & get Mongo URI
const app      = express();
const mongoUri = cs304.getMongoUri();
const port     = cs304.getPort(8080);

// 1) Serve static assets BEFORE sessions
app.use(serveStatic('public'));
app.use('/uploads', express.static('uploads'));

// 2) Single session setup
app.use(session({
  secret:            process.env.SESSION_SECRET || 'super-secret',
  resave:            false,
  saveUninitialized: false,
  store:             MongoStore.create({ mongoUrl: mongoUri }),
  cookie:            { maxAge: 24 * 60 * 60 * 1000 }
}));

// 3) Expose currentUser to views
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  next();
});

// 4) Body parsers and auth routes
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(authRouter);

// Helpers & constants
const buildings = ['All','Severance','Claflin','Tower','Lake House','McAfee','Bates',
  'Freeman','Pomeroy','Cazenove','Shafer','Beebe','Munger','Science Center','Lulu','Clapp Library'];
const urgencies  = ['All','minimal','bit','decent','pretty','very'];

async function insertTicket(data) {
  const db      = await Connection.open(mongoUri, 'tickets');
  const tickets = db.collection('tickets');
  await tickets.insertOne({
    id:           data.id,
    requestor:    data.requestor,
    phone:        data.phone,
    address:      data.addr,
    building:     data.building,
    urgency:      data.urgency,
    due:          data.due,
    instructions: data.instructions,
    title:        data.title,
    path:         '/uploads/' + data.file.filename
  });
}

// 5) Debug endpoint (temporary)
app.get('/_debug-session', (req, res) => res.json(req.session));

// ─── Routes ────────────────────────────────────────────────────────────────

// Home / Dashboard
app.get('/', async (req, res) => {
  const db      = await Connection.open(mongoUri, 'tickets');
  const all     = await db.collection('tickets').find({}).toArray();
  res.render('index.ejs', {
    allTickets:    all,
    buildings,
    urgencyLevels: urgencies,
    error:         req.query.error || ''
  });
});

// About
app.get('/about', (req, res) => res.render('about.ejs'));

// Account Info
app.get('/account', requireLogin, (req, res) =>
  res.render('account.ejs', { user: req.session.user })
);

// Student-only
app.get('/new-ticket', requireLogin, (req, res) => res.render('form.ejs'));
app.post('/form-input-post/', requireLogin, upload.single('file'), async (req, res) => {
  const db      = await Connection.open(mongoUri, 'tickets');
  const list    = await db.collection('tickets').find({}).toArray();
  const idVal   = list.length + 1;
  await insertTicket({ ...req.body, id: idVal, file: req.file });
  res.redirect('/');
});
app.get('/my-tickets', requireLogin, async (req, res) => {
  const db    = await Connection.open(mongoUri, 'tickets');
  const list  = await db.collection('tickets')
                        .find({ requestor: req.session.user.name })
                        .toArray();
  res.render('my-tickets.ejs', {
    allTickets:    list,
    buildings,
    urgencyLevels: urgencies,
    error:         list.length ? '' : 'You have no active tickets'
  });
});

// Search
app.get('/search', async (req, res) => {
  const { search, building, urgency } = req.query;
  const db   = await Connection.open(mongoUri, 'tickets');
  const col  = db.collection('tickets');
  const q    = {};
  if (search && search.length>1) q.instructions = { $regex: search, $options: 'i' };
  if (building && building!=='All') q.building = building;
  if (urgency && urgency!=='All')   q.urgency  = urgency;
  const found = await col.find(q).toArray();
  res.render('index.ejs', {
    allTickets:    found,
    buildings,
    urgencyLevels: urgencies,
    error:         found.length ? '' : 'No results found'
  });
});

// Delete
app.post('/delete-ticket', async (req, res) => {
  const id      = parseInt(req.body.ticketId, 10);
  const db      = await Connection.open(mongoUri, 'tickets');
  await db.collection('tickets').deleteOne({ id });
  res.redirect('/');
});

// Update
app.post('/update-ticket', requireLogin, upload.single('updated_file'), async (req, res) => {
  const ticketId = parseInt(req.body.ticketId,10);
  const db       = await Connection.open(mongoUri, 'tickets');
  const tickets  = db.collection('tickets');
  const update   = {};
  ['requestor','building','urgency','due','instructions','title']
    .forEach(f=> req.body[f] && (update[f]=req.body[f]));
  if (req.file) update.path = '/uploads/' + req.file.filename;
  await tickets.updateOne({ id: ticketId }, { $set: update });
  res.redirect('/');
});

// Ticket detail
app.get('/ticket/:ticket_id_number', async (req, res) => {
  const id     = parseInt(req.params.ticket_id_number,10);
  const db     = await Connection.open(mongoUri, 'tickets');
  const ticket = await db.collection('tickets').findOne({ id });
  res.render('ticket-page.ejs', ticket);
});

// Admin-only
app.get('/admin-dashboard',
  requireLogin, requireAdmin,
  async (req, res) => {
    const db  = await Connection.open(mongoUri, 'tickets');
    const all = await db.collection('tickets').find({}).toArray();
    // sort by urgency priority if desired…
    res.render('admin-dashboard.ejs', {
      allTickets:    all,
      buildings,
      urgencyLevels: urgencies
    });
  }
);


  
// this is last, because it never returns
app.listen(port, function() {
  console.log(`listening on ${port}`);
  console.log(`visit http://cs.wellesley.edu:${port}/`);
  console.log('^C to exit');
});
