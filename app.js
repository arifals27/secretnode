const http = require('http');
const todo = require("./todo.js");
const config = require("./config.json");
const semaphore = require('semaphore');
const port = args['--port'] || process.env.PORT || 3000;

const sem = semaphore(1);
const yuhu = new todo.Manga();
 // yuhu.get();
// yuhu.startCron();

http.createServer(function(req, res) {
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
}).listen(3000, ()=> {
    console.log("server running. Aceess your domain:3001 to start");
});
