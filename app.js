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
    password: "5930",
    database: "pustakalaya"
})
con.connect(function(err) {
    if(err){
      console.log(err);
      return;
    }
    console.log('Connection established');
});

con.promise = (sql) => {
    return new Promise((resolve, reject) => {
        con.query(sql, (err, result) => {
            if(err){reject(new Error());}
            else{resolve(result);}
        });
    });
};

function getSQLResult(sql) {
    let value = "";
    con.promise(sql)
        .then((result) => {
            value = result;
        }).catch((err) => {
            console.log(err);
    })
    return value;
}
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
    password: String,
    id: String
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

let count = 0;

app.post("/register",function(req,res){

    con.connect(function (err) {
        con.query("SELECT * FROM users", function (err, result) {
            count += result.length;
            // console.log(result);
            // console.log("res length = " + result.length);
        });
        // console.log(count);
    })

    count += 1;
    console.log("count = " + count);
    let role = req.body.role;
    let l = role[0] + count;
    console.log("l = " + l);

    console.log(req.body.username, req.body.password,req.body)
    // console.log(l);
    User.register({username: req.body.username,id: l},req.body.password,function(err,user){
        if(err){
            // console.log(err);
            res.redirect("/register");
        }
        else{
            passport.authenticate("local")(req,res,function(){

                console.log(user.id);
                con.connect(function(err) {
                    let sql = 'Insert into users value("'+user.id+'")', sql2;
                    if (role === "faculty") {
                        sql2 = `INSERT INTO faculty (name, email, password, address, f_id) VALUES("${req.body.name}", "${req.body.username}", "${req.body.password}", 
                        "${req.body.address}", "${l}")`;
                    }else{
                        sql2 = `INSERT INTO student (name, email, password, address, s_id) VALUES("${req.body.name}", "${req.body.username}", "${req.body.password}", 
                        "${req.body.address}", "${l}")`;
                    }
                    con.query(sql ,function (err, result) {
                      if (err) throw err;
                      console.log(result);
                    })
                    con.query(sql2 ,function (err, result) {
                        if (err) throw err;
                        console.log(result);
                    })
                })
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
        password: req.body.password
    });
    
    req.login(user,function(err){
        if(err){
            console.log(err);
        }
        else{
            passport.authenticate("local")(req,res,function(){
                console.log(req.user.id);
                res.redirect("/dashboard/search_book");
            })
        }
    })
});

///////////////////////////////////////////////////////////////////////////////

app.get("/dashboard",function(req,res){
    if(req.isAuthenticated()){
        console.log(req.user.id);
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
    console.log(req.user);
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
        let values;
        con.connect(function(err) {
            var sql = 'Select * from books_collection where ISBN='+isbn;
            console.log(sql);
            con.query(sql ,function (err, result) {
            if (err) throw err;
            // console.log(result);
            // console.log(result[0].ISBN);
            values=result;
            })
            sql = 'Select * from all_books where ISBN='+isbn;
            console.log(sql);
            con.query(sql ,function (err, result) {
                if (err) throw err;
                // console.log(result);
                let hold=1;
                result.forEach(function(copy){
                    // console.log(copy.copy_number);
                    if(copy.status===1){
                        hold=0;
                    }
                })
                // console.log(hold)
                res.render("book_details",{details: values,copies: result,hold: hold});
            })
        })
    }
    else{
        res.redirect("/login")
    }
    
})

app.post("/hold_request",function(req,res){

})


/*
Librarian stuff starts
In all these cases we want to add a check if id starts from l or not
 */
app.get("/librarian_special", function (req, res) {
    if (!req.isAuthenticated()) res.redirect("/login");
    return res.render("librarian_special_dashboard");
})

const ON_LOAN = "on-loan";
const ON_SHELF = "on-shelf";
const ON_HOLD = "on-hold";
const ON_LOAN_AND_HOLD = "on-loan-and-on-hold";

app.get("/addBook", function (req, res) {
    return res.render("add_book");
})

app.post("/addBook", function (req, res) {
    if (!req.isAuthenticated()) res.redirect("/login");
    let sql =  `INSERT INTO books_collection (ISBN, title, author, year_of_pub, shelf_id, current_status, present_status) VALUES
            ("${req.body['ISBN']}", "${req.body['title']}", "${req.body['author']}", "${req.body['year_of_pub']}", "${req.body['shelf_id']}",
            "${ON_SHELF}", "${1}")`;
    getSQLResult(sql);
    let result = getSQLResult(`SELECT * FROM all_books WHERE ISBN = "${req.body['ISBN']}"`);
    let x = 0;
    if (result.length > 0) x = result.length;
    x += 1;
    console.log("x = " + x);
    sql = `INSERT INTO all_books (ISBN, copy_number, status) VALUES ("${req.body['ISBN']}", "${x}", "${1}")`;
    console.log(getSQLResult(sql));
    return res.render("librarian_special_dashboard");
})

app.get("/deleteBook", function (req, res) {
    return res.render("add_book");
})

app.post("/deleteBook", function (req, res) {
    if (!req.isAuthenticated()) res.redirect("/login");
})

app.get("/updateBook", function (req, res) {
    return res.render("add_book");
})

app.post("/updateBook", function (req, res) {
    if (!req.isAuthenticated()) res.redirect("/login");
})
/*
Librarian stuff ends
 */

app.listen(process.env.PORT || port,function(){
    console.log("Server running at port "+port);

})