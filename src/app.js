require('express-async-errors');
const express = require('express');
const createError = require('http-errors');
const swaggerUI = require('swagger-ui-express');
const path = require('path');
const YAML = require('yamljs');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
require('express-async-errors');
const { NOT_FOUND } = require('http-status-codes');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary/lib');
const multer = require('multer');

const winston = require('./common/logging');
const wordRouter = require('./resources/words/word.router');
const signinRouter = require('./resources/authentication/signin.router');
const userRouter = require('./resources/users/user.router');
const userTokenRouter = require('./resources/token/token.router');
const userWordsRouter = require('./resources/userWords/userWord.router');
const aggregatedWordsRouter = require('./resources/aggregatedWords/aggregatedWord.router');
const statisticRouter = require('./resources/statistics/statistic.router');
const settingRouter = require('./resources/settings/setting.router');
const errorHandler = require('./errors/errorHandler');
const checkAuthentication = require('./resources/authentication/checkAuthentication');
const { userIdValidator } = require('./utils/validation/validator');

const app = express();
const swaggerDocument = YAML.load(path.join(__dirname, '../doc/api.yaml'));

app.use(helmet());
app.use(cors());
app.options('*', cors());
app.use(express.json());

app.use('/files', express.static(path.join(__dirname, '../files')));

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: process.env.CLOUDINARY_FOLDER
  }
});
const parser = multer({ storage });
app.post('/upload', parser.single('file'), (req, res) => {
  res.json(req.file);
});

app.use(checkAuthentication);

app.use('/doc', swaggerUI.serve, swaggerUI.setup(swaggerDocument));

app.use('/', (req, res, next) => {
  if (req.originalUrl === '/') {
    res.send('Service is running!');
    return;
  }
  next();
});

app.use(
  morgan(
    ':method :status :url :userId size req :req[content-length] res :res[content-length] - :response-time ms',
    {
      stream: winston.stream
    }
  )
);

app.use('/words', wordRouter);

app.use('/signin', signinRouter);

app.use('/users', userRouter);

userRouter.use('/:id/tokens', userIdValidator, userTokenRouter);

userRouter.use('/:id/words', userIdValidator, userWordsRouter);

userRouter.use('/:id/aggregatedWords', userIdValidator, aggregatedWordsRouter);

userRouter.use('/:id/statistics', userIdValidator, statisticRouter);

userRouter.use('/:id/settings', userIdValidator, settingRouter);

app.use((req, res, next) => next(createError(NOT_FOUND)));

app.use(errorHandler);

module.exports = app;
