//Sneha Sriram made this file

const path = require('path');
require("dotenv").config({ path: path.join(process.env.HOME, '.cs304env')});
const express = require('express');
const serveStatic = require('serve-static');
const bodyParser = require('body-parser');

const { Connection } = require('./connection');
const cs304 = require('./cs304');

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




async function insertTicket(form_data) {
  const tickets = await Connection.open(mongoUri, 'tickets');
  tickets.collection('tickets').insertOne({requestor: form_data.requestor, phone: form_data.phone, address: form_data.addr, building: form_data.building, urgency: form_data.urgency, due: form_data.due, instructions: form_data.instructions})           
}

app.get('/', (req, res) => {
    res.render('rf_form'); 
  });

app.post("/form-input-post/", (req, res) => {
    // Extract form data from the request body
    const form_data = {
        requestor: req.body.requestor,
        phone: req.body.phone,
        addr: req.body.addr,
        building: req.body.building,
        urgency: req.body.urgency,
        due: req.body.due,
        instructions: req.body.instructions
    };
    insertTicket(form_data);

    // Log the form data to the console
    console.log('Form data received:', form_data);

    // Send a response back to the client
    res.send('Form data received successfully!');
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

// postlude

const serverPort = cs304.getPort(8080);

// this is last, because it never returns
app.listen(serverPort, function() {
    console.log(`listening on ${serverPort}`);
    console.log(`visit http://cs.wellesley.edu:${serverPort}/`);
    console.log('^C to exit');
})