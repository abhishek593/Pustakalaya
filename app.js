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

app.get("/dashboard",function(req,res){
    res.render("user_dashboard");
})

app.get("/dashboard/search_book",function(req,res){
    res.render("search_book");
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
})

app.listen(process.env.PORT || port,function(){
    console.log("Server running at port "+port);
})