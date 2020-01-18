require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const bookmarks = require('./bookmarks');
const uuid = require('uuid/v4');
const winston = require('winston');
const { NODE_ENV } = require('./config');

const app = express();

//SETUP WINSTON

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
      new winston.transports.File({ filename: 'info.log' })
    ]
  });
  
  if (NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
      format: winston.format.simple()
    }));
  }

const morganOption = (NODE_ENV === 'production')
    ? 'tiny'
    : 'common';

app.use(morgan(morganOption));
app.use(cors());
app.use(helmet());
app.use(express.json());

// AUTHORIZATION
app.use(function authorization(req, res, next) {
    const apiToken = process.env.API_TOKEN;
    const authToken = req.get('Authorization');

    if (!authToken || authToken.split(' ')[1] !== apiToken) {
        logger.error(`Unauthorized request to path: ${req.path}`);
        return res.status(401).json({ error: 'Unauthorized request'})
    }

    next();
})

app.get('/', (req, res) => {
    res.send('Hello, world!')
})

app.get('/bookmarks', (req, res) => {
    res.json(bookmarks);
})

app.get('/bookmarks/:id', (req, res) => {
    
    const { id } = req.params;

    const result = bookmarks.find(bookmark => bookmark.id === Number(id));

    if (result === undefined) {
        logger.error(`ID ${id} not found`);
        res.status(404).json({ error: "ID Not Found" });
    }

    res.json(result);
})

app.post('/bookmarks', (req, res) => {
    
    const { title, url, desc, rating=3 } = req.body;

    if (!title) {
        return res.status(400).send('Title is required');
    }
    if (!url) {
        return res.status(400).send('URL is required');
    }
    if (!desc) {
        return res.status(400).send('Description is required');
    }

    const id = uuid();

    const bookmark = {
        id,
        title,
        url,
        rating,
        desc
    }

    bookmarks.push(bookmark);

    res.status(201).location(`http://localhost:8000/card/${id}`).json(bookmark);
})

app.delete('/bookmarks/:id', (req, res) => {
    
    const { id } = req.params;

    const bookmarkIndex = bookmarks.findIndex(bookmark => bookmark.id == id);

    if (bookmarkIndex === -1) {
        logger.error(`Bookmark ID ${id} not found for DELETE`);
        return res.status(404).send('Bookmark Not Found');
    }

    bookmarks.splice(bookmarkIndex, 1);

    res.status(204).end();

})

app.use(function errorHandler(error, req, res, next) {
    let response
    if (NODE_ENV === 'production') {
        response = { error: { message: 'server error' } }
    } else {
        console.error(error)
        response = { message: error.message, error }
    }
    res.status(500).json(response)
})

module.exports = app;