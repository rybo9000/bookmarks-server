require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const uuid = require('uuid/v4');
const winston = require('winston');
const xss = require('xss');
const bookmarksService = require('./bookmarks_service');
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

const sanitize = bookmark => ({
    id: bookmark.id,
    title: xss(bookmark.title),
    url: xss(bookmark.url),
    description: xss(bookmark.description),
    rating: bookmark.rating
})

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
    const knexInstance = req.app.get('db');

    bookmarksService.getBookmarks(knexInstance)
        .then(bookmarks => {
            res.json(bookmarks.map(sanitize));
        })
    
})

app.get('/bookmarks/:id', (req, res) => {
    
    const { id } = req.params;

    const knexInstance = req.app.get('db');
    
    bookmarksService.getById(knexInstance, id)
        .then(bookmark => {
            res.json({
                id: bookmark.id,
                title: xss(bookmark.title),
                url: xss(bookmark.url),
                description: xss(bookmark.description),
                rating: bookmark.rating
            });
        })
})

app.post('/bookmarks', (req, res, next) => {
    
    const { title, url, description, rating=3 } = req.body;

    const knexInstance = req.app.get('db');

    if (!title) {
        return res.status(400).send('Title is required');
    }
    if (!url) {
        return res.status(400).send('URL is required');
    }
    if (!description) {
        return res.status(400).send('Description is required');
    }

    const bookmark = {
        title,
        url,
        rating,
        description
    }

    bookmarksService.insertBookmark(knexInstance, bookmark)
        .then(bookmark => {
            res.status(201).location(`/bookmarks/${bookmark.id}`).json({
                id: bookmark.id,
                title: xss(bookmark.title),
                url: xss(bookmark.url),
                description: xss(bookmark.description),
                rating: bookmark.rating
            })
        })
        .catch(next)
})

app.delete('/bookmarks/:id', (req, res, next) => {
    
    const { id } = req.params;

    const knexInstance = req.app.get('db');

    bookmarksService.deleteBookmark(knexInstance, id)
        .then((bookmark) => {
            
            if (!bookmark) {
                res.status(404).json({
                    error: 'Bookmark ID Does Not Exist!'
                })
            }
            
            res.status(204).end()
        })
        .catch(next)

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