var port         = (process.env.NODE_ENV !== 'production') ? 5000 : 5000
const express    = require('express')
const helmet     = require('helmet')
const cors = require('cors')
const app        = express()
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));	
const apis = require("./apis")

// const middleware = require('./routes/middleware')

app.use(helmet())
app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(cors())
// middleware has been disabled in order to skip authentication
// app.use('/api', middleware.api)

// remember to redirect upstream from NGINX
app.use('/api', apis)

// catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

app.use((err, req, res, next) => {
	console.log(err)
  res.locals.error = err;
  const status = err.status || 500;
  res.status(status);
  res.json({ error: err.message })
});

app.listen(port, () => console.log('API running on port ' + port))