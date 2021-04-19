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

const cquery = async (sql,req,res)=>{
    return new Promise((resolve,reject)=>{
        con.query(sql,(err,result)=>{
            if(err) console.log(err);
            else resolve(result);
        })
    })
}

function getSQLResult(sql) {
    let value = "";
    con.promise(sql)
        .then((result) => {
             result;
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
    if(req.isAuthenticated()){
        res.render("/dashboard");
    }
    else{
        res.render("register");
    }
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
    res.redirect("/login");
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
                res.redirect("/dashboard");
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


//To search for a book
app.get("/dashboard/search_book",function(req,res){
    if(req.isAuthenticated()){
        res.render("search_book");
    }
    else{
        res.redirect("/login")
    }
    console.log(req.user);
})
//gets the details of books to search for*
app.post("/dashboard/search_book",async function(req,res){
    console.log(req.body);
    let category=req.body.category;
    let ans=req.body.ans;
    let sql=`Select * from books_collection where ${category}="${ans}" and present_status=1`;
    let result=await (cquery(sql));
    console.log(result);
    if(result.length>0){
        console.log(result);
        res.render("search_book_result",{results:result});
    }
    else{
        res.send("No such book available");
    }
    // con.promise(sql)
    // .then((result) => {
    //     if(result.length>0){
    //         console.log(result);
    //         res.render("search_book_result",{results:result});
    //     }
    //     else{
    //         res.send("No such book available");
    //     }
    //     })
    // .catch((err) => {
    //     console.log(err);
    // })
})
//display the details of particular book*
app.get("/book_details/:isbn",async function(req,res){
    if(req.isAuthenticated()){
        let isbn=req.params.isbn;
        let values;
        let copies;
        let hold=1;
        let issue=0;
        let sql = 'Select * from books_collection where ISBN='+isbn;
        let result1=await cquery(sql);
        values=result1;
        sql = 'Select * from all_books where ISBN='+isbn;
        let result2=await cquery(sql);
        result2.forEach(function(copy){
            if(copy.status===1){
                hold=0;
            }
        })
        copies=result2;
        sql=`select id from booksissued where ISBN="${isbn}" `;
        let result3=await cquery(sql);
        if(result3.length===0){
            issue=1;
        }
        res.render("book_details",{details: values,copies: copies,hold: hold,issue: issue});
        // con.connect(function(err) {
        //     var sql = 'Select * from books_collection where ISBN='+isbn;
        //     console.log(sql);
        //     con.query(sql ,function (err, result) {
        //     if (err) throw err;
        //     values=result;
        //     })
        //     sql = 'Select * from all_books where ISBN='+isbn;
        //     console.log(sql);
        //     con.query(sql ,function (err, result) {
        //         if (err) throw err;
        //         result.forEach(function(copy){
        //             if(copy.status===1){
        //                 hold=0;
        //             }
        //         })
        //         copies=result;
        //         if(hold===1){
        //             res.render("book_detail",{details: values,copies: copies,hold: hold,issue: issue});
        //         }
        //     })
        //     sql=`select id from booksissued where ISBN="${isbn}" `;
        //     console.log(sql);
        //     con.query(sql ,function (err, result) {
        //         if (err) throw err;
        //         console.log(result);
        //         if(result.length===0){
        //             issue=1;
        //         }
        //         if(hold===0){
        //             res.render("book_details",{details: values,copies: copies,hold: hold,issue: issue});
        //         }
        //     })
        // })
        
    }
    else{
        res.redirect("/login")
    }
    
})
// con.promise(sql)
// .then((result) => {
//     })
// .catch((err) => {
//     console.log(err);
// })

function overdue(){
    var future = new Date();
    future.setDate(future.getDate() + 30);
    var dd = String(future.getDate()).padStart(2, '0');
    var mm = String(future.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = future.getFullYear();
    
    today = yyyy + '/' + mm + '/' + dd;
    return today;
}

function date(){
    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = today.getFullYear();
    
    today = yyyy + '/' + mm + '/' + dd;
    return today;
}

//when user clicks hold on particular book
app.post("/hold_request/:isbn",function(req,res){
    if(req.isAuthenticated()){
        let isbn=req.params.isbn;
        
        con.connect(function(err) {
            let sql=`Delete from hold_request where ID="${req.user.id}" and isbn="${isbn}"`;
            console.log(sql);
            con.query(sql ,function (err, result) {
            if (err) throw err;
            console.log(result);
            })
        })
        con.connect(function(err) {
            let sql=`update books_collection set current_status="on-loan-and-on-hold" where ISBN=${isbn}`;
            console.log(sql);
            con.query(sql ,function (err, result) {
            if (err) throw err;
            console.log(result);
            })
        })
        con.connect(function(err) {
            let sql=`Insert into hold_request value("${req.user.id}","${isbn}","${date()}",${Date.now()})`;
            console.log(sql);
            con.query(sql ,function (err, result) {
            if (err) throw err;
            console.log(result);
            res.redirect("/book_details/"+isbn);
            })
        })
        
    }
    else{
        res.redirect("/login");
    }
})

//when user clicks on issue
app.post("/issue/:isbn",async function(req,res){
    if(req.isAuthenticated()){
        let isbn=req.params.isbn;
        let sql=`select copy_number from all_books where status=1 and ISBN=${isbn}`;
        let result1=await cquery(sql);
        let copy_number= result1[0].copy_number;
        let size = result1.length;
        sql=`INSERT into booksissued values("${isbn}","${copy_number}","${req.user.id}","${date()}","${overdue()}",0)`;
        let result2=await cquery(sql);
        console.log("result2= "+result2);
        if(size==1){
            let sql=`update books_collection set current_status="on-loan" where ISBN=${isbn}`;
            let result3=await cquery(sql);
        }
        sql=`update all_books set status=0 where ISBN=${isbn} and copy_number=${copy_number}`;
        let result4=await cquery(sql);
        console.log("result4= "+result4);
        // con.connect(function(err) {
        //     let sql=`select copy_number from all_books where status=1 and ISBN=${isbn}`;
        //     console.log(sql);
        //     con.query(sql ,function (err, result) {
        //         if (err) throw err;
        //         console.log(result);
        //         copy_number=result[0].copy_number;
        //         size=result.length;
        //     })
        // })
        // con.connect(function(err) {
        //     let sql=`INSERT into booksissued values("${isbn}","${copy_number}","${req.user.id}","${date()}","${overdue()}",0)`;
        //     console.log(sql);
        //     con.query(sql ,function (err, result) {
        //         if (err) throw err;
        //         console.log(result);
        //     })
        // })
        // if(size===1){
        //     con.connect(function(err) {
        //         let sql=`update books_collection set current_status="on-loan" where ISBN=${isbn}`;
        //         console.log(sql);
        //         con.query(sql ,function (err, result) {
        //         if (err) throw err;
        //         console.log(result);
        //         })
        //     })
        // }
        // con.connect(function(err) {
        //     let sql=`update all_books set status=0 where ISBN=${isbn} and copy_number=${copy_number}`;
        //     console.log(sql);
        //     con.query(sql ,function (err, result) {
        //     if (err) throw err;
        //     console.log(result);
        //     })
        // })
        res.redirect("/book_details/"+isbn);
    }
    else{
        res.redirect("/login");
    }
})

//displays currentyly issued books of user
app.get("/dashboard/issued_books",function(req,res){
    if(req.isAuthenticated()){

    }
    else{
        res.redirect("/login");
    }
})

//show books added by user in book shelf
app.get("/dashboard/book_shelf",function(req,res){
    if(req.isAuthenticated()){

    }
    else{
        res.redirect("/login");
    }
})

//adds book to book shelf on clicking add to shelf in book details page
app.post("/dashboard/book_shelf",function(req,res){
    if(req.isAuthenticated()){

    }
    else{
        res.redirect("/login");
    }
})

//shows current active holds
app.get("/dashboard/holds_placed",function(req,res){
    if(req.isAuthenticated()){

    }
    else{
        res.redirect("/login");
    }
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