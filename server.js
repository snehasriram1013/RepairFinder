// Sneha Sriram made this file

const path        = require('path');
require("dotenv").config({ path: path.join(process.env.HOME, '.cs304env')});
const express     = require('express');
const serveStatic = require('serve-static');
const bodyParser  = require('body-parser');
const multer      = require('multer');

const { Connection } = require('./connection');
const cs304          = require('./cs304');
const { title }      = require('process');

// AUTH imports
const session    = require('express-session');
const MongoStore = require('connect-mongo');
const authRouter = require('./routes/auth');
const { requireLogin, requireAdmin } = authRouter;

// configure multer (original)
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads');
    },
    filename: function (req, file, cb) {
        let parts = file.originalname.split('.');
        let ext = parts[parts.length-1];
        let hhmmss = timeString();
        cb(null, file.fieldname + '-' + hhmmss + '.' + ext);
    }
});
var upload = multer({ storage: storage,
   // max fileSize in bytes, causes an ugly error
   limits: {fileSize: 1_000_000 }});

// Create and configure the app
const app = express();
const mongoUri = cs304.getMongoUri();
const port = cs304.getPort();


// ─── SESSION & AUTH SETUP (after mongoUri) ─────────────────────────────────
app.use(session({
  secret:            process.env.SESSION_SECRET || 'super-secret',
  resave:            false,
  saveUninitialized: false,
  store:             MongoStore.create({ mongoUrl: mongoUri }),
  cookie:            { maxAge: 24 * 60 * 60 * 1000 }
}));
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  next();
});
app.use(authRouter);

app.use(cs304.logStartRequest);

// This handles POST data
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(cs304.logRequestData);  // tell the user about any request data

app.use(serveStatic('public'));
app.set('view engine', 'ejs');
app.use('/uploads', express.static('uploads'));

const buildings = ['All', 'Severance', 'Claflin', 'Tower', 'Lake House', 'McAfee', 'Bates', 'Freeman', 'Pomeroy',
    'Cazenove', 'Shafer', 'Beebe', 'Munger', 'Science Center', 'Lulu', 'Clapp Library'];
const urgencies = ['All', 'minimal', 'bit', 'decent', 'pretty', 'very'];

async function insertTicket(form_data) {
 const tickets = await Connection.open(mongoUri, 'tickets');
 tickets.collection('tickets').insertOne({
     id: form_data.id,
     requestor: form_data.requestor,
     phone: form_data.phone,
     address: form_data.addr,
     building: form_data.building,
     urgency: form_data.urgency,
     due: form_data.due,
     instructions: form_data.instructions,
     title: form_data.title,
     path: '/uploads/' + form_data.file.filename
 });         
}

function timeString(dateObj) {
   if (!dateObj) dateObj = new Date();
   const d2 = val => val < 10 ? '0'+val : ''+val;
   return d2(dateObj.getHours()) + d2(dateObj.getMinutes()) + d2(dateObj.getSeconds());
}

// ─── ROUTES ────────────────────────────────────────────────────────────────

// Home / Dashboard (students & guests)
app.get('/', async (req, res) => {
    const tickets = await Connection.open(mongoUri, 'tickets');
    const results = await tickets.collection('tickets').find({}).toArray();
    res.render('index.ejs', {allTickets: results, buildings, urgencyLevels: urgencies, error: ''});
});

// Student: New Ticket & My Tickets
app.get('/new-ticket', requireLogin, (req, res) => {
   res.render('form.ejs');
});
app.post('/form-input-post/', requireLogin, upload.single('file'), async (req, res) => {
   const tickets = await Connection.open(mongoUri, 'tickets');
   const list = await tickets.collection('tickets').find({}).toArray();
   const idVal = list.length + 1;
   const form_data = { ...req.body, id: idVal, file: req.file };
   await insertTicket(form_data);
   res.redirect('/');
});
app.get('/my-tickets', requireLogin, async (req, res) => {
    const tickets = await Connection.open(mongoUri, 'tickets');
    let ticketsList = await tickets.collection('tickets').find({requestor: req.session.user.name}).toArray();
    const error = ticketsList.length > 0 ? '' : 'You have no active tickets';
    res.render('my-tickets.ejs', {allTickets: ticketsList, buildings, urgencyLevels: urgencies, error});
});

// Ticket detail
app.get('/ticket/:ticket_id_number', async(req, res) => {
    const id = parseInt(req.params.ticket_id_number);
    const tickets = await Connection.open(mongoUri, 'tickets');
    let ticket = await tickets.collection('tickets').findOne({id});
    res.render('ticket-page.ejs', ticket);
});

// Search
app.get('/search/', async (req, res) => {   
    const {search, building, urgency} = req.query;
    const tickets = await Connection.open(mongoUri, 'tickets');
    const col = tickets.collection('tickets');
    let q = {};
    if (search && search.length > 1) q.instructions = {$regex: search};
    if (building && building !== 'All') q.building = building;
    if (urgency && urgency !== 'All') q.urgency = urgencies[Number(urgency)];
    let ticketsList = await col.find(q).toArray();
    const error = ticketsList.length === 0 ? 'No results found' : '';
    res.render('index.ejs', {allTickets: ticketsList, buildings, urgencyLevels: urgencies, error});
});

// Delete ticket
app.post('/delete-ticket', async (req, res) => {
    const ticketId = parseInt(req.body.ticketId);
    const tickets = await Connection.open(mongoUri, 'tickets');
    await tickets.collection('tickets').deleteOne({ id: ticketId });
    res.redirect('/');
});

// Update ticket
app.post('/update-ticket', requireLogin, upload.single('updated_file'), async (req, res) => {
    const ticketId = parseInt(req.body.ticketId);
    const tickets = await Connection.open(mongoUri, 'tickets');
    const updateFields = {};
    ['requestor','building','urgency','due','instructions','title'].forEach(f => {
        if (req.body[f]) updateFields[f] = req.body[f];
    });
    if (req.file) updateFields.path = '/uploads/' + req.file.filename;
    await tickets.collection('tickets').updateOne({id: ticketId}, {$set: updateFields});
    res.redirect('/');
});

// Public About
app.get('/about', (req, res) => res.render('about.ejs'));

// Account Info
app.get('/account', requireLogin, (req, res) => {
    res.render('account.ejs', { user: req.session.user });
});

// Priority queue of tickets for admin (initial iteration, unprotected)
app.get('/admin-dashboard', async (req, res) => {
  const tickets = await Connection.open(mongoUri, 'tickets');
  let allTickets = await tickets.collection('tickets').find({}).toArray();
  const priorityMap = { minimal:1, bit:2, decent:3, pretty:4, very:5 };
  allTickets.sort((a,b) => priorityMap[b.urgency] - priorityMap[a.urgency]);
  res.render('admin-dashboard.ejs', { allTickets, buildings, urgencyLevels: urgencies });
});
// Later: Protect admin route with requireLogin, requireAdmin

// this is last, because it never returns
app.listen(port, function() {
   console.log(`listening on ${port}`);
   console.log(`visit http://cs.wellesley.edu:${port}/`);
   console.log('^C to exit');
});


