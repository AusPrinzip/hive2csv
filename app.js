var port         = (process.env.NODE_ENV !== 'production') ? 5000 : 5000
const express    = require('express')
const helmet     = require('helmet')
const app        = express()
const apis = require("./apis")
// const middleware = require('./routes/middleware')

app.use(helmet())
app.use(express.json())
app.use(express.urlencoded({extended: true}))

app.use(function(err, req, res, next) {
	// if (err instanceof SyntaxError) return res.status(401).end()
	res.header("Access-Control-Allow-Origin", "*"); // CORS already enabled from nginx
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
	res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
	res.header('Expires', '-1');
	res.header('Pragma', 'no-cache');
	next();
});

// middleware has been disabled in order to skip authentication
// app.use('/api', middleware.api)

// remember to redirect upstream from NGINX
app.use('/api', apis)

// catch 404 and forward to error handler
app.use((req, res, next) => {
	var err = new Error('Not Found');
	err.status = 404;
	next(err);
})
app.use((err, req, res, next) => {
	res.locals.error = err;
	res.status(err.status);
	res.json({
		message: err.message,
		error: err
	})
})

app.listen(port, () => console.log('API running on port ' + port))