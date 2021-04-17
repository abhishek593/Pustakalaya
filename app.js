let express = require('express');
let app = express();
let port = 3000;
let bodyParser = require('body-parser');

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.set("view engine", "ejs");

const mysql=require('mysql');
var con= mysql.createConnection({
    host: "localhost",
    port: 3306,
    user: "root",
    password: "",
    database: "librarymanagement"
})
con.connect(function(err) {
    if(err){
      console.log(err);
      return;
    }
    console.log('Connection established');
});

///////////////////////////////////////////////////////////////////////////////

const mongoose= require("mongoose");
const session= require("express-session");
const passport= require("passport");
const passportlocalmongoose= require("passport-local-mongoose");
app.use(session({
    secret: 'goli maar donga',
    resave: false,
    saveUninitialized: true,
  }))

app.use(passport.initialize());
app.use(passport.session());
mongoose.connect("mongodb://localhost/userDB",{ useUnifiedTopology: true, useNewUrlParser: true });
mongoose.set('useCreateIndex', true);


const userSchema= new mongoose.Schema({
    email: String,
    password: String
});


userSchema.plugin(passportlocalmongoose);

const User= mongoose.model("user",userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/login",function(req,res){
    res.render("login");
})

app.get("/register",function(req,res){
    res.render("register");
})

app.post("/register",function(req,res){
    console.log(req.body.username, req.body.password)
    User.register({username: req.body.username},req.body.password,function(err,user){
        if(err){
            console.log(err);
            res.redirect("/register");
        }
        else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/dashboard/search_book");
            });
        }
    })
})

app.get("/logout",function(req,res){
    req.logout();
    res.redirect("/");
})
app.post("/login",function(req,res){
    const user= new User({
        username: req.body.username,
        password: req.body.passoword
    });
    
    req.login(user,function(err){
        if(err){
            console.log(err);
        }
        else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/dashboard/search_book");
            })
        }
    })
});

///////////////////////////////////////////////////////////////////////////////

app.get("/dashboard",function(req,res){
    if(req.isAuthenticated()){
        res.render("user_dashboard");
    }
    else{
        res.redirect("/login")
    }
})

app.get("/dashboard/search_book",function(req,res){
    if(req.isAuthenticated()){
        res.render("search_book");
    }
    else{
        res.redirect("/login")
    }
    
})

app.post("/dashboard/search_book",function(req,res){
    console.log(req.body);
    let category=req.body.category;
    let ans=req.body.ans;
    con.connect(function(err) {
        var sql = 'Select * from books_collection where '+category+'="'+ans+'" and present_status=1';
        console.log(sql);
        con.query(sql ,function (err, result) {
          if (err) throw err;
        //   console.log(result)
        if(result.length>0){
            console.log(result);
            // console.log(result[0].ISBN);
            res.render("search_book_result",{results:result})
        }
        else{
            res.send("No such book available")
        }
        })
    })
})

app.get("/book_details/:isbn",function(req,res){
    if(req.isAuthenticated()){
        let isbn=req.params.isbn;
        let title;
        let yearOfPub;
        let shelfNo;
        let current_status;
        con.connect(function(err) {
            var sql = 'Select * from books_collection where ISBN='+isbn;
            console.log(sql);
            con.query(sql ,function (err, result) {
            if (err) throw err;
            console.log(result);
            console.log(result[0].ISBN);
            title=result[0].title;
            yearOfPub=result[0].year_of_pub;
            shelfNo=result[0].shelf_id;
            current_status=result[0].current_status;
            })
            sql = 'Select count(copy_number) from all_books where ISBN='+isbn;
            con.query(sql ,function (err, result) {
                if (err) throw err;
                console.log(result);
                res.render("book_details",{title: title,yearOfPub: yearOfPub,shelfNo: shelfNo,current_status: current_status});
            })
        })
    }
    else{
        res.redirect("/login")
    }
    
})

app.listen(process.env.PORT || port,function(){
    console.log("Server running at port "+port);
})