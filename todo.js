const http = require('http');
const https = require('https');
const CronJob = require('cron').CronJob;
const fs = require('fs');
const config = require('./config.json');
const querystring = require('querystring');
const semaphore = require('semaphore');

const sem = semaphore(1);

class Manga{
    constructor(){
        this.api = "45.83.122.108";
        this.path = "/"+config.site.path+"/" + config.site.page;
        this.currentData = [];
        this.prevApi = "";
        this.domain = config.site.host;
        this.currentPage = config.site.page;
    }
    get(path = this.path, hostname = this.api){
        const options = {
            hostname: hostname,
            port: 89,
            path: path,
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
        };

        const req = http.request(options, (res) => {
            let json = "";
            res.on('data', (d) => {
                json += d;
            });
            res.on('end', () =>{
                let ojbson = JSON.parse(json);


                // store main data to custructor
                this.currentData = ojbson.data.reverse();
                this.prevApi = ojbson.prev_page;
                this.currentPage = (this.currentPage)-1;
                config.site.page = (this.currentPage > 0) ? this.currentPage: 1;
                this.updateConfig(config);
                if(config.grabber.status === "complete"){
                    if(!config.cron.status){
                        // if false, so cron not running
                        console.log("jalankan cron");
                        return this.startCron();
                    } else {
                        console.log("cron sudah jalan, set data");
                        // curIndex, check index last cron if available
                        const curIndex = indexTitle(this.currentData, config.cron.latest);
                        if(curIndex){
                            // if curIndex true
                            const dataCron = this.currentData;
                            this.currentData = dataCron.slice(curIndex);
                        }
                        return this.create(0);
                    }
                }
                return this.create();
            })
        });

        req.on('error', (e) => {
            console.error(e);
        });
        req.end();
    }
    create(i = config.grabber.position){
        const m = this;
        const data = this.currentData;
        const j = data.length;
if(j <= 1) {
                 config.cron.status = false;
                 this.updateConfig(config);
                return;
        }
        if(i >= j){
            if(config.cron.status === true){
                console.log("update latest");
                config.cron.status = false;
		config.cron.latest = data[j-1].title;
                this.updateConfig(config);
                return;
            }
            console.log(this.prevApi);
            if(typeof this.prevApi === 'undefined' || !this.prevApi){
                config.grabber.status = "complete";
                this.updateConfig(config);
                console.log("selesai atau jalankan cron");
                return this.get();
            } else {
                config.grabber.position = 0;
                this.updateConfig(config);
                const url = new URL(this.prevApi);
                const path = url.pathname;
                this.get(path);
            }
            return;
        }

        // post data
        console.log("create manga");
        const postData = querystring.stringify({
            'action': "buat_manga",
            'api' : data[i].api

        });
        // the post options
        const optionspost = {
            host: this.domain,
            path: '/wp-admin/admin-ajax.php',
            method : 'POST',
            port : 443,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        // do the POST call
        const reqPost = https.request(optionspost, function(res) {
            console.log("statusCode: ", res.statusCode);
            let result = "";
            res.on('data', function(d) {
                result += d;
            });
            res.on('end', () =>{
                let ojbson = JSON.parse(result);
                    config.cron.latest = data[i].title;
                i++;
                //save next manga position
                config.grabber.position = i;
                m.updateConfig(config);
                //send data chapter and manga's position
                return m.chapter(ojbson, i);
            })
        });

        reqPost.on('error', function(e) {
            console.log("post error");
            console.error(e);
        });
        reqPost.write(postData);
        reqPost.end();
    }
    chapter(data, position){
        const k = this;
        const j = data.chapters.length;
        const chapters = data.chapters.reverse();
        const manga_id = data.manga;
        const cat_id = data.category;
        const title = data.name;
        let i;
        const current_count = (data.current_count > 1) ? data.current_count - 1 : data.current_count;
        if(current_count > j){
            i = j - 3;
        } else {
            i = current_count;
        }
        const createChapter = setInterval(function () {
            if(i === j){
                clearInterval(createChapter);
                return k.create(position);
            }

            const postData = querystring.stringify({
                'action': "buat_chapter",
                'api' : chapters[i].api,
                'chapter' : chapters[i].chapter,
                'cat' : cat_id,
                'mid' : manga_id,
                'manga' : title

            });
            const optionspost = {
                host: k.domain,
                path: '/wp-admin/admin-ajax.php',
                method : 'POST',
                port : 443,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };
            // do the POST call
            const reqPost = https.request(optionspost, function(res) {
                console.log("statusCode: ", res.statusCode);
                let result = "";
                res.on('data', function(d) {
                    result += d;
                });
                res.on('end', () =>{
                    console.log(result);
                })
            });

            reqPost.on('error', function(e) {
                console.log("post error");
                console.error(e);
            });
            reqPost.write(postData);
            reqPost.end();
            i++;
        }, 10000)
    }
    postData(options, postData){
        const reqPost = https.request(options, function(res) {
            console.log("statusCode postdata: ", res.statusCode);
            let result = "";
            res.on('data', function(d) {
                result += d;
            });
            res.on('end', () =>{
                console.log(result);
            })
        });

        reqPost.on('error', function(e) {
            console.log("post error dong");
            console.error(e);
        });
        reqPost.write(postData);
        reqPost.end();

    }
    show(data){
        console.log(data);
    }
    updateConfig(data){
        if(isJson(data) && Object.keys(data).length == 3){
            fs.writeFileSync("./config.json", JSON.stringify(data), {encoding: "utf8", flag: "w"});
        } else {
            console.log(data);
        }
    }
    startCron(){
        const m = this;
        console.log("cron berjalan");
        const job = new CronJob(config.cron.expressions, function() {
if(!config.cron.status){
 	console.log("cron di jalankan kembali. periksa");
	m.get();
            config.cron.status = true;
            m.updateConfig(config);
        }
}, null, true, null, null, true);
        job.start();
    }
}

function indexTitle(data, judul){
    for (let index in data){
        if(data[index].title === judul){
console.log(index);
            return index;
        }
    }
    return 1;
}
function isJson(item) {
    item = typeof item !== "string"
        ? JSON.stringify(item)
        : item;

    try {
        item = JSON.parse(item);
    } catch (e) {
        return false;
    }

    if (typeof item === "object" && item !== null) {
        return true;
    }

    return false;
}

module.exports = {Manga};
