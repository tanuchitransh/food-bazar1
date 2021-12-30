require('dotenv').config();
const express = require('express');
const app = express();
const ejs = require('ejs');
const path = require('path');
const expressLayout = require('express-ejs-layouts');
const PORT = process.env.PORT || 3000;
const mongoose = require('mongoose');
const session = require('express-session');
const flash = require('express-flash');
const MongoDbStore = require('connect-mongo').default;
const passport = require('passport');
const Emitter = require('events')

//Database connection
const DB = process.env.DATABASE;
mongoose.connect(DB,{
    useCreateIndex : true,
    useFindAndModify : false, // if update not working then change false to true or vice versa
    useNewUrlParser : true,
    useUnifiedTopology : true
})

// This is for local database
// const url = 'mongodb://localhost:27017/FoodBazar';
// mongoose.connect(url,{
//     useCreateIndex : true,
//     useFindAndModify : false, // if update not working then change false to true or vice versa
//     useNewUrlParser : true,
//     useUnifiedTopology : true
// })
const connection = mongoose.connection;
connection.once('open',() =>{
    console.log('Database connected...');
}).catch(err =>{
    console.log('connection failed..');
});


//session store
const mongoStore = MongoDbStore.create({
    // mongoUrl: url,
    mongoUrl: DB,
    collectionName: "sessions",
  });
//event emitter
const eventEmitter = new Emitter()
app.set('eventEmitter',eventEmitter)
//Session config
app.use(session({
    secret : process.env.COOKIE_SECRET,
    resave : false,
    store : mongoStore,
    saveUninitialized : false,
    cookie : {maxAge : 1000 * 60 * 60 * 24} // 24 hours
}))
// passport config
const passportInit = require("./app/config/passport") 
passportInit(passport)
app.use(passport.initialize())
app.use(passport.session())

app.use(flash());

//Assets
app.use(express.static('public'));
app.use(express.urlencoded({ extended : false}));
app.use(express.json());

//Global middleware
app.use((req,res,next) =>{
    res.locals.session = req.session
     res.locals.user = req.user
    next()
})
//Set template engine
app.use(expressLayout);
app.set('views',path.join(__dirname , '/resources/views'));
app.set('view engine','ejs');

require("./routes/web")(app)

const server = app.listen(PORT, () =>{
    console.log(`Listening on port ${PORT}`);
})

//Socket
const io = require('socket.io')(server);
io.on('connection',(socket) =>{
    //Join
    console.log(socket.id)
    socket.on('join',(orderId) =>{
        console.log(orderId)
        socket.join(orderId)
    })
})

eventEmitter.on('orderUpdated',(data) =>{
    io.to(`order_${data.id}`).emit('orderUpdated',data)
})

eventEmitter.on('orderPlaced',(data) =>{
    io.to('adminRoom').emit('orderPlaced',data)
})