const http = require('http');
const todo = require("./todo");
const config = require("./config.json");
const port = process.env.PORT || 3000;

const yuhu = new todo.Manga();


http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.write('Hello World!');
  res.end();
}).listen(port);
