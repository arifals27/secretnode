const http = require('http');
const todo = require("./api/todo.js");
const config = require("./api/config.json");
const semaphore = require('semaphore');
const port = process.env.PORT || 3000;
const express = require('express');
const app = express();

const sem = semaphore(1);
const yuhu = new todo.Manga();
 // yuhu.get();
// yuhu.startCron();

app.listen(port, ()=> console.log(`server running. Aceess your domain:{$port} to start`));
