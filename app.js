let express = require('express');
let app = express();
let port = 3000;
let bodyParser = require('body-parser');
let session = require('express-session');
let cookieParser = require('cookie-parser');
let nodemailer = require('nodemailer');

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(cookieParser('secret'))
app.use(session({cookie: {maxAge: 60000}}))

app.use((req, res, next)=>{
    res.locals.message = req.session.message
    delete req.session.message
    next()
})

let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'head.cryptosense@gmail.com',
        pass: 'projectgroup10'
    }
})

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

const cquery = async (sql,req,res)=>{
    return new Promise((resolve,reject)=>{
        con.query(sql,(err,result)=>{
            if(err) console.log(err);
            else resolve(result);
        })
    })
}

function sendEmail(to, subject, text) {
    let mailOptions = {
        from: 'head.cryptosense@gmail.com',
        to: to,
        subject: subject,
        text: text
    }
    transporter.sendMail(mailOptions, function (err, info) {
        if (err) console.log(err);
        else console.log(info);
    })
}

/*
FLASH MESSAGE EXAMPLE IN EJS file

<%if (message) {%>
<div style="text-align: center" class="alert alert-{{message.type}}">
    <button type="button" class="close" data-dismiss="alert">&times;</button>
    <strong><%=message['intro']%></strong> <p><%=message['message']%></p>
</div>
<%}%>

    Add messages like this in app.js
    req.session.message = {
      type: 'danger',
      intro: 'Empty fields! ',
      message: 'Please insert the requested information.'
    }
 */
///////////////////////////////////////////////////////////////////////////////

const mongoose= require("mongoose");
// const session= require("express-session");
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

app.get("/",function(req,res){
    if(req.isAuthenticated()){
        res.redirect("/dashboard");
    }
    else{
        res.render("home");
    }
    
})

app.get("/login",function(req,res){
    if(req.isAuthenticated()){
        res.redirect("/dashboard");
    }
    else{
        res.render("login");
    }
})

app.get("/register",function(req,res){
    if(req.isAuthenticated()){
        res.render("/dashboard");
    }
    else{
        res.render("register");
    }
})

app.post("/register",async function(req,res){
    let sql = `SELECT * FROM users`;
    let result = await cquery(sql, req, res);
    let count = 1;
    if (result.length > 0) count += result.length;
    let role = req.body.role;
    let l = role[0] + count;
    User.register({username: req.body.username,id: l},req.body.password,function(err,user){
        if(err){
            res.redirect("/register");
        }else{
            passport.authenticate("local")(req,res,function(){
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
                    })
                    con.query(sql2 ,function (err, result) {
                        if (err) throw err;
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
//gets the details of books to search for
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
            if(copy.current_status===1){
                hold=0;
            }
        })
        copies=result2;
        if(hold===0){
            sql=`select id from booksissued where ISBN="${isbn}" `;
            let result3=await cquery(sql);
            if(result3.length===0){
                issue=1;
            }
        }
        sql=`select isbn from user_book_shelf where ID="${req.user.id}"`;
        let result=await cquery(sql);
        let book_shelf=1;
        result.forEach(function(val){
            if(val.isbn===isbn){
                book_shelf=0;
            }
        })
        res.render("book_details",{details: values,copies: copies,hold: hold,issue: issue,book_shelf: book_shelf});
    }
    else{
        res.redirect("/login")
    }
    
})

function overdue(c){
    let days;
    if(c=='s'){
        days=30;
    }
    else{
        days=60;
    }
    var future = new Date();
    future.setDate(future.getDate() + days);
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
    
    today = yyyy + '-' + mm + '-' + dd;
    return today;
}

//when user clicks hold on particular book
app.post("/hold_request/:isbn",async function(req,res){
    if(req.isAuthenticated()){
        let isbn=req.params.isbn;
        let sql=`Delete from hold_request where ID="${req.user.id}" and isbn="${isbn}"`;
        let result1=await cquery(sql);
        console.log(result1);
        sql=`update books_collection set current_status="on-loan-and-on-hold" where ISBN=${isbn}`;
        let result2=await cquery(sql);
        console.log(result2);
        sql=`update books_collection set current_status="on-loan-and-on-hold" where ISBN=${isbn}`;
        let result3=await cquery(sql);
        console.log(result3);
        sql=`Insert into hold_request value("${req.user.id}","${isbn}","${date()}",${Date.now()})`;
        let result4=await cquery(sql);
        console.log(result4);
        res.redirect("/book_details/"+isbn);        
    }
    else{
        res.redirect("/login");
    }
})

//when user clicks on issue
app.post("/issue/:isbn",async function(req,res){
    if(req.isAuthenticated()){
        let isbn=req.params.isbn;
        if(req.user.id[0]=='s'){
            let sql=`Select Number_of_issued_books from student where s_id="${req.user.id}"`;
            let result=await cquery(sql);
            if(result[0].Number_of_issued_books===3){
                res.write("Issue limit exceeded")
                res.render("/book_details/"+isbn);
            }
            else{
                sql=`UPDATE student set Number_of_issued_books=Number_of_issued_books+1 where s_id="${req.user.id}"`;
                result=await cquery(sql);
            }
        }
        sql=`select copy_number from all_books where current_status=1 and ISBN=${isbn}`;
        let result1=await cquery(sql);
        let copy_number= result1[0].copy_number;
        let size = result1.length;
        sql=`INSERT into booksissued values("${isbn}","${copy_number}","${req.user.id}","${date()}","${overdue((req.user.id)[0])}",0)`;
        let result2=await cquery(sql);
        console.log("result2= "+result2);
        if(size==1){
            let sql=`update books_collection set current_status="on-loan" where ISBN=${isbn}`;
            let result3=await cquery(sql);
        }
        sql=`update all_books set current_status=0 where ISBN=${isbn} and copy_number=${copy_number}`;
        let result4=await cquery(sql);
        console.log("result4= "+result4);
        res.redirect("/book_details/"+isbn);
    }
    else{
        res.redirect("/login");
    }
})

//displays currentyly issued books of user
app.get("/dashboard/issued_books",async function(req,res){
    if(req.isAuthenticated()){
        let sql=`Select * from booksissued where ID="${req.user.id}" and return_status=0`;
        let result=await cquery(sql);
        console.log(result);
        res.render("user_issued_books",{results: result});
    }
    else{
        res.redirect("/login");
    }
})

//shows current active holds
app.get("/dashboard/holds_placed",async function(req,res){
    if(req.isAuthenticated()){
        let sql=`Select books_collection.title,books_collection.ISBN,hold_request.Date_of_hold from books_collection natural join hold_request where ID="${req.user.id}"`;
        let result=await cquery(sql);
        console.log(result);
        res.render("user_holds",{results: result});
    }
    else{
        res.redirect("/login");
    }
})

//show books added by user in book shelf
app.get("/dashboard/book_shelf",async function(req,res){
    if(req.isAuthenticated()){
        let sql=`Select title,ISBN from books_collection where ISBN in (Select ISBN from user_book_shelf where ID="${req.user.id}")`
        let result=await cquery(sql);
        res.render("user_book_shelf",{results: result})
    }
    else{
        res.redirect("/login");
    }
})

//adds book to book shelf on clicking add to shelf in book details page
app.post("/book_shelf/:isbn",async function(req,res){
    if(req.isAuthenticated()){
        let isbn=req.params.isbn;
        let sql=`INSERT into user_book_shelf value("${req.user.id}","${isbn}")`;
        let result=await cquery(sql);
        res.redirect("/book_details/"+isbn);
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

app.post("/addBook", async function (req, res) {
    if (!req.isAuthenticated()) res.redirect("/login");
    let sql = `SELECT * FROM all_books WHERE ISBN = "${req.body['ISBN']}" AND present_status = 1`;
    let result = await cquery(sql, req, res);
    let x = 0;
    if (result.length > 0) x = result.length;
    else{
        sql = `SELECT * FROM books_collection WHERE ISBN = "${req.body['ISBN']}"`;
        result = await cquery(sql, req, res);
        if (result.length === 0) {
            sql =  `INSERT INTO books_collection (ISBN, title, author, year_of_pub, shelf_id, current_status, present_status) VALUES
            ("${req.body['ISBN']}", "${req.body['title']}", "${req.body['author']}", "${req.body['year_of_pub']}", "${req.body['shelf_id']}",
            "${ON_SHELF}", "${1}")`;
            await cquery(sql, req, res);
        }else{
            sql = `UPDATE books_collection SET present_status = 1 WHERE ISBN = "${req.body['ISBN']}"`;
            await cquery(sql, req, res);
        }
    }
    x += 1;
    sql = `SELECT * FROM all_books WHERE ISBN = "${req.body['ISBN']}"`;
    let result2 = await cquery(sql, req, res);
    if (result2.length > result.length) {
        sql = `UPDATE all_books SET present_status = 1 WHERE ISBN = "${req.body['ISBN']}" AND copy_number = ${x}`;
        await cquery(sql, req, res)
    }else{
        sql = `INSERT INTO all_books (ISBN, copy_number, present_status, current_status) VALUES ("${req.body['ISBN']}", "${x}", "${1}", "${1}")`;
        await cquery(sql, req, res);
    }
    return res.render("librarian_special_dashboard");
})

app.get("/deleteBook", function (req, res) {
    return res.render("delete_book");
})

app.post("/deleteBook", async function (req, res) {
    if (!req.isAuthenticated()) res.redirect("/login");
    let sql = `SELECT * FROM all_books WHERE ISBN = "${req.body['ISBN']}" AND present_status = 1`;
    let result = await cquery(sql, req, res);
    if (result.length === 0) {
        req.session.message = {
            type: 'danger',
            intro: 'Incorrect Data',
            message: "The book with that ISBN does not exist in the library."
        }
        res.redirect('/deleteBook');
    }else{
        sql = `UPDATE all_books SET present_status = 0 WHERE ISBN = "${req.body['ISBN']}" AND copy_number = ${result.length}`;
        await cquery(sql, req, res);
        if (result.length === 1) {
            sql = `UPDATE books_collection SET present_status = 0 WHERE ISBN = "${req.body['ISBN']}"`;
            await cquery(sql, req, res);
        }
    }
    res.redirect('/deleteBook');
})

app.get("/addShelf", function (req, res) {
    return res.render("add_shelf");
})

app.post("/addShelf", async function (req, res) {
    if (!req.isAuthenticated()) res.redirect("/login");
    let sql = `SELECT * FROM shelf WHERE shelf_id = "${req.body['shelf_id']}"`;
    let result = await cquery(sql, req, res);

    if (result.length > 0) {
        req.session.message = {
            type: 'danger',
            intro: 'Incorrect Data',
            message: "The shelf with same ID already exists."
        }
    }else{
        sql = `INSERT INTO shelf VALUES("${req.body['shelf_id']}", ${req.body['capacity']})`;
        await cquery(sql, req, res);
    }
    res.redirect('/addShelf');
})

app.get("/returnBook", function (req, res) {
    return res.render("return_book");
})

app.post("/returnBook", async function (req, res) {
    if (!req.isAuthenticated()) res.redirect("/login");
    let sql = `UPDATE booksissued SET return_status = 1 WHERE ISBN = "${req.body['ISBN']}" AND copy_number = ${req.body['copy_number']}`;
    await cquery(sql, req, res);
    sql = `UPDATE books_collection SET current_status = "${ON_SHELF}" WHERE ISBN = "${req.body['ISBN']}"`;
    await cquery(sql, req, res);
    sql = `UPDATE all_books SET current_status = 1 WHERE ISBN = "${req.body['ISBN']}"`;
    await cquery(sql, req, res);
    //check if someone needs this book
    sql = `SELECT ID FROM hold_request WHERE ISBN = "${req.body['ISBN']}" ORDER BY date_of_hold, time_of_hold LIMIT 1`;
    let result = await cquery(sql, req, res);
    sql = `UPDATE student SET Number_of_issued_books = Number_of_issued_books - 1 WHERE ID = "${result[0]['ID']}"`;
    //prasheel add the issue function here
    return res.render("librarian_special_dashboard");
})


app.get("/updateBook", function (req, res) {
    return res.render("update_book");
})

app.post("/updateBook", async function (req, res) {
    if (!req.isAuthenticated()) res.redirect("/login");
    let sql = `SELECT * FROM shelf WHERE shelf_id = "${req.body['shelf_id']}"`;
    let result = await cquery(sql, req, res);
    if (result.length === 0) {
        req.session.message = {
            type: 'danger',
            intro: 'Incorrect Data',
            message: "No shelf with that shelf_id exists."
        }
        res.redirect('/updateBook');
    }
    sql = `SELECT shelf_id FROM books_collection WHERE ISBN = "${req.body['ISBN']}"`;
    result = await cquery(sql, req, res);
    if (result.length === 0) {
        req.session.message = {
            type: 'danger',
            intro: 'Incorrect Data',
            message: "No book with such ISBN exists."
        }
        res.redirect('/updateBook');
    }
    sql = `UPDATE books_collection SET shelf_id = "${req.body['shelf_id']}" WHERE ISBN = "${req.body['ISBN']}"`;
    await cquery(sql, req, res)

    res.redirect('/updateBook');
})

app.get('/powerButton', async function (req, res) {
    let sql = `SELECT * from booksissued WHERE overdue_date < "${date()}" AND return_status = 0`;
    let result = await cquery(sql, req, res);
    let to, subject, text;
    subject = `Book Overdue Email`;
    for (let i = 0; i < result.length; i++) {
        let id = result[i]['ID'];
        sql = `SELECT email FROM student WHERE s_id = "${id}"`;
        let result2 = await cquery(sql, req, res);
        to = result2[0]['email'];
        text = `Hello! Your book with ISBN "${result[i]['ISBN']}", copy number ${result[i]['copy_number']} has been overdue on "${result[i]['Overdue_date']}". Kindly return the book.\n
            Thank You`;
        sendEmail(to, subject, text);
        sql = `UPDATE student SET unpaid_fines = unpaid_fines + 2 WHERE s_id = "${id}"`;
        await cquery(sql, req, res);
    }
    sql = `SELECT * FROM student WHERE unpaid_fines > 0`;
    result = await cquery(sql, req, res);
    subject = `Please pay you library fines`
    for (let i = 0; i < result.length; i++) {
        to = result[i]['email'];
        text = `You have unpaid fines of Rs ${result[i]['unpaid_fines']} in your IIT INDORE library's account.\n
            Please pay them.\n
            Thank You`;
        sendEmail(to, subject, text);
    }
    sql = `SELECT * FROM booksissued WHERE return_status = 2`;
    result = await cquery(sql, req, res);
    for (let i = 0; i < result.length; i++) {
        let id = result[i]['ID'];
        sql = `SELECT email FROM student WHERE s_id = "${id}"`;
        let result2 = await cquery(sql, req, res);
        to = result2[0]['email'];
        text = `Hello ! You are receiving this mail because you have put a hold on the book with ISBN "${result[i]['ISBN']}" AND\n
            this hold will become unavailable on ${result[i]['Overdue_date']}.\n
            So if you want this book, Please issue it before your hold becomes invalid.\n
            Thank You`;
        sendEmail(to, subject, text);
    }
    res.send(200);
})



/*
Librarian stuff ends
 */

app.listen(process.env.PORT || port,function(){
    console.log("Server running at port "+port);
})