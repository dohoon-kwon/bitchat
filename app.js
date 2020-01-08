const express = require('express'); // express 모듈 추가하기

var fs = require('fs');
const app = express();
app.use(express.static('static'));
const port = 5091;
const path = require('path');


const bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({extended:false}))

app.locals.pretty = true;
app.use(express.static('static'))



app.get('/', function(request, response) {
	response.sendFile(path.join(__dirname + '/loginweb.html'));
    console.log("[로그인화면 접속]"+request.connection.remoteAddress);
});

app.post('/main', function(request, response) {
  fs.readFile('main.html', function (error, data){
	response.writeHead(200, { 'Content-Type': 'text/html' });
	response.end(data);
	});
	var id = req.body.id;
	var pw = req.body.pw;
	console.log("접속자ID : " + id);
	console.log("접속자PW : " + pw);
	console.log("[로그인 성공]"+request.connection.remoteAddress);
});

app.get('/account', function(request, response) {
  fs.readFile('make.html', function (error, data){
	response.writeHead(200, { 'Content-Type': 'text/html' });
	response.end(data);
	});
	console.log("[회원가입화면]"+request.connection.remoteAddress);
});

app.get('/findID', function(request, response) {
  fs.readFile('searchid.html', function (error, data){
	response.writeHead(200, { 'Content-Type': 'text/html' });
	response.end(data);
	});
	console.log("[아이디 찾기]"+request.connection.remoteAddress);
});

app.get('/findPW', function(request, response) {
  fs.readFile('searchpassword.html', function (error, data){
	response.writeHead(200, { 'Content-Type': 'text/html' });
	response.end(data);
	});
	console.log("[비밀번호 찾기]"+request.connection.remoteAddress);
});

app.get('/idresult', function(request, response) {
  fs.readFile('idresult.html', function (error, data){
	response.writeHead(200, { 'Content-Type': 'text/html' });
	response.end(data);
	});
	console.log("[아이디찾기 성공]"+request.connection.remoteAddress);
});

app.get('/setpassword', function(request, response) {
  fs.readFile('setpassword.html', function (error, data){
	response.writeHead(200, { 'Content-Type': 'text/html' });
	response.end(data);
	});
	console.log("[비밀번호 수정]"+request.connection.remoteAddress);
});

app.get('/pwresult', function(request, response) {
  fs.readFile('passwordresult.html', function (error, data){
	response.writeHead(200, { 'Content-Type': 'text/html' });
	response.end(data);
	});
	console.log("[비밀번호찾기 성공]"+request.connection.remoteAddress);
});

app.get('/meeting', function(request, response) {
  fs.readFile('meeting.html', function (error, data){
	response.writeHead(200, { 'Content-Type': 'text/html' });
	response.end(data);
	});
	console.log("[회의화면 접속]"+request.connection.remoteAddress);
});

app.listen(port, function(err) {
  console.log('서버실행 : [포트번호] ' + port);
  if (err) {
    return console.log('Found error - ', err);
  }
});