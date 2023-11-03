const http = require("http");
const fs = require("fs");
const path = require("path");
let db = require("./public/db.json")

const updateDbJson = () => {
  console.log('Updating db.json...')
  fs.writeFileSync(path.join(__dirname,'./public/db.json'), JSON.stringify(db))
  console.log('Updated db.json!')
}
const return404 = (res, msg = "Page Not Found") => {
  res.statusCode = 404;
  res.setHeader("Content-Type", "text/plain");
  res.write(msg);
  res.end();
}
const contentTypes = ['application/x-www-form-urlencoded','application/json']

// Create a server using `http`
const server = http.createServer((req, res) => {
  console.log(`Incoming Request - Method: ${req.method} | URL: ${req.url}`);
  // Process the body of the request
  const urlParts = req.url.split('/')
  let reqBody = "";
  req.on("data", (data) => {
    reqBody += data;
  });
  // When the request is finished processing the entire body
  req.on("end", () => {
    // Parsing the body of the request
    if (reqBody) {
      if(req.headers["content-type"] && !contentTypes.includes(req.headers["content-type"])) return return404(res, 'Invalid Content-Type!')
      if(req.headers["content-type"]===contentTypes[0]) {
        req.body = reqBody
          .split("&")
          .map((keyValuePair) => keyValuePair.split("="))
          .map(([key, value]) => [key, value.replace(/\+/g, " ")])
          .map(([key, value]) => [key, decodeURIComponent(value)])
          .reduce((acc, [key, value]) => {
            acc[key] = value;
            return acc;
          }, {});
      } else if(req.headers["content-type"]===contentTypes[1]) {
        req.body = JSON.parse(reqBody)
      }
    }
    // Home Page
    if (req.method === "GET" && req.url === "/") {
      const resBody = fs.readFileSync("./public/index.html");
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html");
      res.end(resBody);
      return;
    }
    // Serving Static Assets
    const ext = path.extname(req.url);
    if (req.method === "GET" && ext) {
      try {
        const resBody = fs.readFileSync('.' + "/public" + req.url);
        res.statusCode = 200;
        if (ext === ".jpg" || ext === ".jpeg") {
          res.setHeader("Content-Type", "image/jpeg");
        } else if (ext === ".css") {
          res.setHeader("Content-Type", "text/css");
        } else if (ext === ".js") {
          res.setHeader("Content-Type", "text/javascript");
        }
        res.end(resBody);
        return;
      } catch {
        console.error(
          "Cannot find asset",
          path.basename(req.url),
          "in assets folder"
        );
      }
    }

    // Get Specific Cat Data
    if(req.method === "GET" && req.url.startsWith('/api/cats')) {
      const catId = urlParts[urlParts.length-1]
      const catData = db[catId]
      if(!catData) return return404(res, 'Cat ID not found')
      catData.id = catId
      res.statusCode = 200
      res.setHeader("Content-Type", "application/json")
      res.end(JSON.stringify(catData))
      delete catData.id
      return
    }
    // Create/Post Specific Cat Data
    if(req.method === "POST" && req.url === '/api/cats') {
      const newCat = req.body
      if(!db[newCat.id]) {
        db[newCat.id] = {
          name: newCat.name.trim().substr(0,32),
          src: newCat.src,
          votes: [0,0],
          desc: newCat.desc.trim().substr(0,160),
          time: new Date().toISOString(),
          comments: {}
        }
        updateDbJson()
      }
      res.statusCode = 201
      res.setHeader("Content-Type", "plain/text")
      res.end(newCat.id)
      return
    }
    // Post Comment on Specific Cat
    if(req.method === "POST" && /\/api\/cats\/[0-9A-Za-z]{1,}\/comments/.test(req.url)) {
      const catData = db[urlParts[3]]
      const nextId = Object.keys(catData.comments).length? +(Object.keys(catData.comments).splice(-1)[0])+1 : 1
      const newComment = {
        name: req.body.name.trim().substr(0,32),
        txt: req.body.txt.trim().substr(0,160),
        time: new Date().toISOString(),
        replies: []
      }
      if(req.body.replyTo) {
        newComment.replyTo = Number(req.body.replyTo)
        const recipient = catData.comments[req.body.replyTo]
        recipient.replies.map(replyId => {
          catData.comments[replyId].replies.push(nextId+'')
        })

        let parentRe = recipient
        while(parentRe) {
          parentRe.replies.push(nextId+'')
          parentRe = catData.comments[parentRe.replyTo]
        }
      }
      catData.comments[nextId] = newComment
      updateDbJson()
      newComment.id = nextId
      res.statusCode = 201
      res.setHeader("Content-Type", "application/json")
      res.end(JSON.stringify(newComment))
      return
    }
    // Delete Comment
    if(req.method === "DELETE" && /\/api\/cats\/[0-9A-Za-z]{1,}\/comments\/\d{1,}/.test(req.url)) {
      const commentId = urlParts[5]
      const catData = db[urlParts[3]]
      if(!catData) return return404(res, 'Cat ID not found')
      const comment = catData.comments[commentId]
      if(!comment) return return404(res, 'Comment ID not found')
      let deletedIds = [commentId]

      comment.replies.map(replyId => {
        delete catData.comments[replyId]
        deletedIds.push(replyId)
      })
      if(comment.replyTo) catData.comments[comment.replyTo].replies = catData.comments[comment.replyTo].replies.filter(e=>!deletedIds.includes(e))

      delete catData.comments[commentId]
      res.statusCode = 200
      res.setHeader("Content-Type", "application/json")
      res.end(JSON.stringify({ success: true, deletedIds, newCount: Object.keys(catData.comments).length }))
      updateDbJson()
      return
    }

    // Post upvote/downvote
    if(req.method === "PUT" && /\/api\/cats\/[0-9A-Za-z]{1,}\/votes/.test(req.url)) {
      const catData = db[urlParts[3]]
      catData.votes[req.body.voteType]++
      if(!isNaN(req.body.decrementOldVote)) catData.votes[req.body.decrementOldVote]--
      res.statusCode = 200
      res.setHeader("Content-Type", "application/json")
      res.end(JSON.stringify(catData.votes))
      updateDbJson()
      return
    }

    // Get Specific Cat Page
    if(req.method === "GET" && req.url.startsWith('/cats')) {
      const resBody = fs.readFileSync("./public/cats.html");
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html");
      res.end(resBody);
      return;
    }


    // Page Not Found
    return404(res)
  });
});
// Set the port to 5000
const port = 5001;
// Tell the port to listen for requests on localhost:5000
server.listen(port, () => console.log("Server is running on port", port));