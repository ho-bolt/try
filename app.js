
const express = require('express');
const app = express();
const cors = require('cors');
const morgan = require('morgan');



app.use(cors({ origin: '*' }));
app.use(morgan('dev'));



app.use(express.json());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));
app.disable('x-powered-by');






app.use((req, res, next) => {
    res.status(404).send('요청하신 페이지를 찾을 수 없습니다.');
});

app.use((err, req, res, next) => {
    res.json({ result: false, message: err.message });
});

module.exports = app;
