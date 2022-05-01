const http = require('http');
const todo = require("./todo");
const config = require("./config.json");
const port = process.env.PORT || 3000;
const express = require('express');
const app = express();

const sem = semaphore(1);
const yuhu = new todo.Manga();

app.get('/', (req, res) => {
  const url = req.url;
    res.writeHead(200, { 'Content-Type' : 'application/json'});
	
    if(config.grabber.status === "ready"){
        config.grabber.status = "running";
        yuhu.updateConfig(config);
        yuhu.get();
    } else if(config.grabber.status === "complete"){
if(url === "/reset"){
config.cron.status = false;
yuhu.updateConfig(config);
}
        sem.take(function(){yuhu.startCron()});
    }
res.end(JSON.stringify(config));
})
app.listen(port, ()=> console.log(`server running. Aceess your domain:{$port} to start`));
