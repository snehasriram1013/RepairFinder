//Sneha Sriram made this file


const path = require('path');
require("dotenv").config({ path: path.join(process.env.HOME, '.cs304env')});
const express = require('express');
const serveStatic = require('serve-static');
const bodyParser = require('body-parser');
const multer = require("multer");


const { Connection } = require('./connection');
const cs304 = require('./cs304');
const { title } = require('process');


//configure multer
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads')
    },
    filename: function (req, file, cb) {
        let parts = file.originalname.split('.');
        let ext = parts[parts.length-1];
        let hhmmss = timeString();
        cb(null, file.fieldname + '-' + hhmmss + '.' + ext);
    }
  })

// Create and configure the app

const app = express();


app.use(cs304.logStartRequest);


// This handles POST data
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


app.use(cs304.logRequestData);  // tell the user about any request data


app.use(serveStatic('public'));
app.set('view engine', 'ejs');


const mongoUri = cs304.getMongoUri();
const port = 8080;

const buildings = ['All', 'Severance', 'Claflin', 'Tower', 'Lake House', 'McAfee', 'Bates', 'Freeman', 'Pomeroy', 
    'Cazenove', 'Shafer', 'Beebe', 'Munger', 'Science Center', 'Lulu', 'Clapp Library'];
const urgencies = ['All', 'minimal', 'bit', 'decent', 'pretty', 'very'];


const DB = process.env.USER;    // 'uploadTest';
const FILES = 'files';


var upload = multer({ storage: storage,
   // max fileSize in bytes, causes an ugly error
   limits: {fileSize: 1_000_000 }});
  
async function insertTicket(form_data) {
 const tickets = await Connection.open(mongoUri, 'tickets');
 tickets.collection('tickets').insertOne({id: form_data.id, requestor: form_data.requestor, phone: form_data.phone, address: form_data.addr, building: form_data.building, urgency: form_data.urgency, due: form_data.due, instructions: form_data.instructions, title: form_data.title, path:'/uploads/' + form_data.file.filename});          
}


function timeString(dateObj) {
   if( !dateObj) {
       dateObj = new Date();
   }
   // convert val to two-digit string
   d2 = (val) => val < 10 ? '0'+val : ''+val;
   let hh = d2(dateObj.getHours())
   let mm = d2(dateObj.getMinutes())
   let ss = d2(dateObj.getSeconds())
   return hh+mm+ss
}


app.use('/uploads', express.static('uploads'));


var storage = multer.diskStorage({
   destination: function (req, file, cb) {
     cb(null, 'uploads')
   },
   filename: function (req, file, cb) {
       let parts = file.originalname.split('.');
       let ext = parts[parts.length-1];
       let hhmmss = timeString();
       cb(null, file.fieldname + '-' + hhmmss + '.' + ext);
   }
 })


app.get('/', async (req, res) => {
    // res.render('index.ejs'); 
    const tickets = await Connection.open(mongoUri, 'tickets');
    ticket_data = tickets.collection("tickets").find({});
    const results = await ticket_data.toArray();
    res.render('index.ejs', {allTickets: results, buildings: buildings, urgencyLevels: urgencies, error:''});
  });


app.get('/new-ticket',(req, res) => {
   res.render('form.ejs');
});

app.get('/ticket/:ticket_id_number', async(req, res) => {
    const ticket_id_number = req.params.ticket_id_number;
    const db = await Connection.open(mongoUri, 'tickets');
    const tickets = db.collection('tickets');
    let ticket = await tickets.find({id: parseInt(ticket_id_number)}).toArray();
    console.log(ticket);
    return res.render('ticket-page.ejs',
                      {id: `${ticket[0].id}`, 
                       requestor: `${ticket[0].requestor}`,
                       building: `${ticket[0].building}`,
                       urgency: `${ticket[0].urgency}`,
                       due: `${ticket[0].due}`,
                       instructions: `${ticket[0].instructions}`}); 
});

app.get('/search/', async (req, res) => {   
    //urgency always all
    //building works for all, no results for specific

    const query = req.query.search;
    const build = req.query.building;
    const urg = req.query.urgency;

    console.log(build, urg);

    const db = await Connection.open(mongoUri, 'tickets');
    const tickets = db.collection("tickets");

    let qVal = {$exists: true};
    //if length of search is none: {}, else: use query
    if (query.length > 1){
        qVal = {$regex:`${query}`};
    }

    //if building selected: query, else: {}
    let buildVal = {$exists: true};
    if (build != "0"){
        buildVal = buildings[Number(build)];
    }
    //if urgency selected: add query, else: {}
    let urgVal = {$exists: true};
    if (urg != "0"){
        urgVal = urgencies[Number(urg)];
    }

    let ticketsList = await tickets.find({instructions: qVal, building: buildVal, urgency: urgVal}).toArray();

    if (ticketsList.length == 0){
        res.render('index.ejs', {allTickets: ticketsList, buildings: buildings, urgencyLevels: urgencies, error:'No results found'});
    }else{
        res.render('index.ejs', {allTickets: ticketsList, buildings: buildings, urgencyLevels: urgencies, error:''});
    }

});


app.post("/form-input-post/",  upload.single("file"), async (req, res) => {
   // Extract form data from the request body
    const db = await Connection.open(mongoUri, 'tickets');
    const tickets = db.collection("tickets");
    let ticketsList = await tickets.find({}).toArray();
    let idVal = ticketsList.length;

   const form_data = {
        id: (idVal + 1),
       requestor: req.body.requestor,
       phone: req.body.phone,
       addr: req.body.addr,
       building: req.body.building,
       urgency: req.body.urgency,
       due: req.body.due,
       instructions: req.body.instructions,
       title: req.body.title,
       file: req.file
   };


   insertTicket(form_data);

    //ask about this! better way to do id?
    const newDBConn = await Connection.open(mongoUri, 'tickets');
    const ticketsColl = newDBConn.collection("tickets");
    let newTickets = await tickets.find({}).toArray();


    console.log(form_data);
    // Log the form data to the console
    console.log('Form data received:', form_data);

   // Send a response back to the client
   res.redirect('/');
});


// postlude


const serverPort = cs304.getPort(8080);


// this is last, because it never returns
app.listen(serverPort, function() {
   console.log(`listening on ${serverPort}`);
   console.log(`visit http://cs.wellesley.edu:${serverPort}/`);
   console.log('^C to exit');
})

