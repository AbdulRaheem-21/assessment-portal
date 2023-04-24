const express = require("express");

const app = express();

app.get("/",()=>{
    console.log("x");
});

app.listen(8080,()=>{ console.log("Server Started On Port: 8080\nhttps://localhost:8080"); });