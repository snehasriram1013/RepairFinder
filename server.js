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


const DB = process.env.USER;    // 'uploadTest';
const FILES = 'files';


var upload = multer({ storage: storage,
   // max fileSize in bytes, causes an ugly error
   limits: {fileSize: 1_000_000 }});
  
async function insertTicket(form_data) {
 const tickets = await Connection.open(mongoUri, 'tickets');
 tickets.collection('tickets').insertOne({requestor: form_data.requestor, phone: form_data.phone, address: form_data.addr, building: form_data.building, urgency: form_data.urgency, due: form_data.due, instructions: form_data.instructions, title: form_data.title, path:'/uploads/' + form_data.file.filename});          
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
   const tickets = await Connection.open(mongoUri, 'tickets');
   ticket_data = tickets.collection("tickets").find({});
   const results = await ticket_data.toArray();
   res.render('index.ejs', {allTickets: results});
 });


app.get('/new-ticket',(req, res) => {
   res.render('form.ejs');
});


app.post("/form-input-post/",  upload.single("file"), async (req, res) => {
   // Extract form data from the request body
   const form_data = {
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


   console.log(form_data);
   // Log the form data to the console
   console.log('Form data received:', form_data);


   const tickets = await Connection.open(mongoUri, 'tickets');


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

