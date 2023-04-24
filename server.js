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
 * LOGIN ----------------------------------------------------------
 */
app.get("/login", (req,res) => {
    res.render("login",{client_id:process.env.CLIENT_ID})
});

app.post("/login",(req,res)=>{
    let user = jsonwebtoken.decode(req.body["credential"]);
    cookie.set(req.socket.remoteAddress,user);
    res.redirect("../");
});
// ----------------------------------------------------------------


app.get("/",(req,res)=>{
    if(!cookie.get(req.socket.remoteAddress)){
        res.redirect("/login");
        return;
    }

    res.render("dashboard",{user_info:cookie.get(req.socket.remoteAddress)})
});

app.listen(3000,()=>{ console.log("Server Started On Port: 3000"); });