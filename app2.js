const http = require('http');
const todo = require("./todo");
const config = require("./config.json");
const port = process.env.PORT || 3000;

const yuhu = new todo.Manga();


http.listen(port, ()=> console.log(`server running. Aceess your domain:{$port} to start`));
