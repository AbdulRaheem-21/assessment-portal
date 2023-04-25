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
 * EXAM MODE -----------------------------------------------------
 */
app.get("/a/:id",(req,res)=>{
    connection.query("SELECT * FROM `assessments` WHERE `hash`='"+req.params.id+"' AND `status`='1'",(err,result)=>{
        if(err) throw err;

        if(cookie.get(req.socket.remoteAddress)){
        connection.query("SELECT * FROM `submission` WHERE `assessment`='"+req.params.id+"' AND `mail`='"+cookie.get(req.socket.remoteAddress).email+"'",(err,submission)=>{
            if(result.length > 0) res.render("assessment_view",{client_id:process.env.CLIENT_ID,submission,assessment:result[0],user_info:cookie.get(req.socket.remoteAddress)});
            else res.sendStatus(404);
        });
        }else{
            if(result.length > 0) res.render("assessment_view",{client_id:process.env.CLIENT_ID,submission:[],assessment:result[0],user_info:cookie.get(req.socket.remoteAddress)});
            else res.sendStatus(404);
        }
        
    });
    
});

app.post("/a/:id",(req,res)=>{
    if("send-next" in req.body){
        if(!cookie.get(req.socket.remoteAddress)){
            res.sendStatus(403);
            return;
        }

        connection.query("INSERT INTO `submission`( `mail`, `assessment`, `start_datetime`, `status`) VALUES ('"+cookie.get(req.socket.remoteAddress).email+"','"+req.params.id+"','"+(new Date().toISOString().slice(0, 19).replace('T', ' '))+"','1')",(err,result)=>{
            res.redirect(`../b/${req.params.id}/0`);
        });
        return;
    }

    let user = jsonwebtoken.decode(req.body["credential"]);
    cookie.set(req.socket.remoteAddress,user);
    res.redirect(`../a/${req.params.id}`);
});

app.get("/b/:id/:page",(req,res)=>{
    if(!cookie.get(req.socket.remoteAddress)){
        res.redirect(`../a/${req.params.id}`);
        return;
    }

    connection.query("SELECT * FROM `submission` WHERE `mail`='"+cookie.get(req.socket.remoteAddress).email+"' AND `assessment`='"+req.params.id+"' AND `status`='1'",(err,result)=>{
    if(err) throw err;

    if(result.length <= 0){
        res.redirect(`../a/${req.params.id}`);
        return;
    }
    
    connection.query("SELECT * FROM `questions` WHERE `assessment`='"+req.params.id+"'",(err,questions)=>{
    connection.query("SELECT * FROM `answers` WHERE `assessment`='"+req.params.id+"' AND `owner`='"+cookie.get(req.socket.remoteAddress).email+"' ORDER BY `question`",(err,answers)=>{
        let completeAnswer = answers.length;
        for(let i  = 0; i < questions.length; i++){
            if(i >= answers.length || answers[i].question != i+1){
                answers.splice(i, 0, undefined);
            }
        }
    connection.query("SELECT * FROM `assessments` WHERE `hash`='"+req.params.id+"' AND `status`='1'",(err,result)=>{
        if(err) throw err;

        if(result.length > 0 && req.params.page <= questions.length) res.render("assessment_run",{assessment:result[0],questions,answers,completeAnswer,page:req.params.page,user_info:cookie.get(req.socket.remoteAddress)});
        else res.sendStatus(404);
        
    });
    });
    });

    });
});

app.post("/b/:id/:page",(req,res)=>{
    if("endAssessment" in req.body){
        connection.query("UPDATE `submission` SET `status`='0' WHERE `mail`='"+cookie.get(req.socket.remoteAddress).email+"' AND `assessment`='"+req.params.id+"' ",(err,result)=>{
            if(err) throw err;
            res.redirect(`../../a/${req.params.id}`);
        })
        return;
    }

    if("answer" in req.body){
        if(req.body.option == -1){
            connection.query("DELETE FROM `answers` WHERE `owner`='"+cookie.get(req.socket.remoteAddress).email+"' AND `assessment`='"+req.params.id+"' AND `question`='"+req.params.page+"'",(err,result)=>{
                if(err) throw err;
                res.sendStatus(200);
            })
            return;
        }
        console.log(req.body.option);
        connection.query("SELECT * FROM `answers` WHERE `question`='"+req.params.page+"' AND `owner`='"+cookie.get(req.socket.remoteAddress).email+"' AND `assessment`='"+req.params.id+"'",(err,result)=>{
            if(err) throw err;

            if(result.length > 0){
                connection.query("UPDATE `answers` SET `answer`='"+req.body.option+"' WHERE `owner`='"+cookie.get(req.socket.remoteAddress).email+"' AND `assessment`='"+req.params.id+"' AND `question`='"+req.params.page+"'",(err,result)=>{
                    if(err) throw err;
                    res.sendStatus(200);
                })
            }else{
                connection.query("INSERT INTO `answers`(`owner`, `assessment`, `question`, `answer`) VALUES ('"+cookie.get(req.socket.remoteAddress).email+"','"+req.params.id+"','"+req.params.page+"','"+req.body.option+"')",(err,result)=>{
                    if(err) throw err;
                    res.sendStatus(200);
                })
            }
        })
        return;
    }
});
// ---------------------------------------------------------------
 
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

app.get("/logout",(req,res)=>{
   cookie.delete(req.socket.remoteAddress);
    res.redirect("../");
});
app.get("/logout/:id",(req,res)=>{
    cookie.delete(req.socket.remoteAddress);
    res.redirect(`../a/${req.params.id}`);
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
        res.render("dashboard",{assessments:result,user_info:cookie.get(req.socket.remoteAddress)});
    })
});

app.listen(3000,()=>{ console.log("Server Started On Port: 3000"); });