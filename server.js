const connection = require("./src/database.js");

const cookieParser = require("cookie-parser");
const jsonwebtoken = require('jsonwebtoken');
const bodyParser = require("body-parser");
const express = require('express');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config();

const cookie= new Map();
const app = express();
app.use(cookieParser())
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname,'public')));
app.set("view engine","ejs");




/*
 * ASSESSMENT ----------------------------------------------------
 */
app.get("/assessment/:id",(req,res)=>{
    if(!cookie.get(req.socket.remoteAddress)){
        res.redirect("/login");
        return;
    }

    connection.query("SELECT * FROM `questions` WHERE `assessment`='"+req.params.id+"'",(err,result)=>{
        if(err) throw err;

        if(result.length <= 0) res.render("create",{user_info:cookie.get(req.socket.remoteAddress)});
        else res.sendStatus(404);
        
    });

});

app.post("/assessment/:id",(req,res)=>{

    if("create" in req.body){
        req.body.Questions = JSON.parse(req.body.Questions);
        connection.query("INSERT INTO `assessments`(`hash`, `owner`, `name`, `description`, `status`) VALUES ('"+req.body.hash+"','"+cookie.get(req.socket.remoteAddress).email+"','"+req.body.name+"','"+req.body.description+"','1')");
        req.body.Questions.forEach(element => {
            connection.query("INSERT INTO `questions`(`assessment`, `question`, `answer_1`, `answer_2`, `answer_3`, `answer_4`, `correct`) VALUES ('"+req.body.hash+"','"+element.question+"','"+element.answers[0]+"','"+element.answers[1]+"','"+element.answers[2]+"','"+element.answers[3]+"','"+element.correct+"')");
        });
    }
    
    res.sendStatus(200);
});

// ---------------------------------------------------------------


/*
 * LOGIN ----------------------------------------------------------
 */
app.get("/login", (req,res) => {
    res.render("login",{client_id:process.env.CLIENT_ID})
});

app.post("/login",(req,res)=>{
    let user = jsonwebtoken.decode(req.body["credential"]);
    console.log(user);
    cookie.set(req.socket.remoteAddress,user);
    res.redirect("../");
});
// ----------------------------------------------------------------

app.get("/create",(req,res)=>{
    if(!cookie.get(req.socket.remoteAddress)){
        res.redirect("/login");
        return;
    }

    let hash = crypto.createHash('md5').update((new Date()).toLocaleString(undefined,{timeZone: 'Asia/Kolkata'})+crypto.randomInt(1000)+"x"+crypto.randomInt(1000)).digest('hex');
    res.redirect(`../assessment/${hash}`);
});

app.post("/",(req,res)=>{
    if("changeStatus" in req.body){
        connection.query("UPDATE `assessments` SET `status`='"+req.body.status+"' WHERE `hash`='"+req.body.hash+"'",(err,result)=>{
            res.redirect("/");
        })
        return;
    }
});

app.get("/",(req,res)=>{
    if(!cookie.get(req.socket.remoteAddress)){
        res.redirect("/login");
        return;
    }
    connection.query("SELECT * FROM `assessments` WHERE `owner`='"+cookie.get(req.socket.remoteAddress).email+"' ORDER BY `status` DESC",(err,result)=>{
        if(err) throw err
        console.log(result);
        res.render("dashboard",{assessments:result,user_info:cookie.get(req.socket.remoteAddress)});
    })
});

app.listen(3000,()=>{ console.log("Server Started On Port: 3000"); });