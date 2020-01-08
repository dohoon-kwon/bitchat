//npm
var express = require('express');
var app = express();
const path = require('path');
var fs = require('fs');
var mongoose = require('mongoose');
const socket = require('socket.io')
const http = require('http')
var url = require('url');
var ejs = require('ejs');
var ip = require("ip");
var url = require('url');
var multer = require('multer');
var winston = require('winston');
var colors = require('colors');

//몽고디비
var MongoClient = require('mongodb').MongoClient;
//데이터베이스 객체를 위한 변수
var database;
//데이터베이스 스키마 객체 변수
var UserSchema;
//데이터베이스 모델 객체
var UserModel;
//포트번호
var port = process.env.PORT || 5091;

//데이터 교환
const bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({ extended: false }))
app.locals.pretty = true;
app.use(express.static('static'));
app.set('view engine', 'jade');
app.set('views', './views');

//파일관리
var _storage = multer.diskStorage({
    //객체 리터럴
    //cb == callback
    destination: function (req, file, cb) {
        //if()
        //elseif()로 디렉토리를 나눠줄수도 있다..
        /*
        if (file.mimetype == 'text/plain') {
            cb(null, 'uploads/textfolder/')
        }
        else {
        */
        cb(null, 'uploads/'+`${roomname}`)
        /*
        }
        */
    },
    filename: function (req, file, cb) {
        //if(이미 파일이 존재한다면..?)
        cb(null, file.originalname)
    }
})
var upload = multer({ storage: _storage });
app.use('/userfile', express.static('uploads')); //파일접근..

//유저정보
var auID = new Array();
var setPW = new Array();
var userIP;
var roomname;

//화상회의
var options = {
    key: fs.readFileSync('./keys/private.pem'),
    cert: fs.readFileSync('./keys/mycommoncrt.crt')
};
var https = require('https')
function serverHandler(request, response) {
    try {
        var uri = url.parse(request.url).pathname,
            filename = path.join(process.cwd(), uri);

        if (filename && filename.search(/ss.js/g) !== -1) {
            response.writeHead(404, {
                'Content-Type': 'text/plain'
            });
            response.write('404 Not Found: ' + path.join('/', uri) + '\n');
            response.end();
            console.log('1');
            return;
        }

        var stats;

        try {
            stats = fs.lstatSync(filename);
        } catch (e) {
            response.writeHead(404, {
                'Content-Type': 'text/plain'
            });
            response.write('404 Not Found: ' + path.join('/', uri) + '\n');
            response.end();
            console.log('2');
            return;
        }

        if (fs.statSync(filename).isDirectory()) {
            response.writeHead(404, {
                'Content-Type': 'text/html'
            });

            filename += '/meeting.html';
        }


        fs.readFile('meeting.html', function (err, file) {
            if (err) {
                response.writeHead(500, {
                    'Content-Type': 'text/html'
                });
                response.write('404 Not Found: ' + path.join('/', uri) + '\n');
                response.end();
                return;
            }

            response.writeHead(200, { 'Content-Type': 'text/html' });
            response.end(file);
        });
    } catch (e) {
        response.writeHead(404, {
            'Content-Type': 'text/plain'
        });
        response.write('<h1>Unexpected error:</h1><br><br>' + e.stack || e.message || JSON.stringify(e));
        response.end();
        console.log('error');
    }
}
var test = https.createServer(options, serverHandler);
function runServer() {
    test = test.listen(port, process.env.IP || '0.0.0.0', function () {
        var addr = test.address();

        if (addr.address === '0.0.0.0') {
            addr.address = 'localhost';
        }

        console.log('Server listening at https://' + addr.address + ':' + addr.port);
    });
}

//파일드래그드롭
function fileDropDown() {
    var dropZone = $("#dropZone");
    //Drag기능 
    dropZone.on('dragenter', function (e) {
        e.stopPropagation();
        e.preventDefault();
        // 드롭다운 영역 css
        dropZone.css('background-color', '#E3F2FC');
    });
    dropZone.on('dragleave', function (e) {
        e.stopPropagation();
        e.preventDefault();
        // 드롭다운 영역 css
        dropZone.css('background-color', '#FFFFFF');
    });
    dropZone.on('dragover', function (e) {
        e.stopPropagation();
        e.preventDefault();
        // 드롭다운 영역 css
        dropZone.css('background-color', '#E3F2FC');
    });
    dropZone.on('drop', function (e) {
        e.preventDefault();
        // 드롭다운 영역 css
        dropZone.css('background-color', '#FFFFFF');

        var files = e.originalEvent.dataTransfer.files;
        if (files != null) {
            if (files.length < 1) {
                alert("폴더 업로드 불가");
                return;
            }
            selectFile(files)
        } else {
            alert("ERROR");
        }
    });
}

//채팅
/* express http 서버 생성 */
const server = https.createServer(options, app);
/* 생성된 서버를 socket.io에 바인딩 */
const io = socket(server);
app.use('/css', express.static('./css'))
app.use('/js', express.static('./js'))
var socketRoom = {};
io.sockets.on('connection', function (socket) {
    socket.on('newUser', function (data) {
        socket.join(data);
        socket.name = auID[userIP];
        console.log(data + '회의실 ' + socket.name + '님 접속');
        console.log("=====================================================================".green);
        socketRoom[socket.id] = data;
        io.sockets.in(socketRoom[socket.id]).emit('update', { type: 'connect', name: 'SERVER', message: auID[userIP] + ' 접속하였습니다.' });
    })

    socket.on('message', function (data) {
        data.name = socket.name
        console.log(data)
        io.sockets.in(socketRoom[socket.id]).emit('update', data);
    })

    socket.on('disconnect', function () {
        console.log(socket.name + '님이 나가셨습니다.')
        io.sockets.in(socketRoom[socket.id]).emit('update', { type: 'disconnect', name: 'SERVER', message: socket.name + '님이 나가셨습니다.' });
    })
})

//데이터베이스 연결
function connectDB() {
    //데이터베이스 연결 정보
    var databaseUrl = 'mongodb://localhost:27017/local';

    //데이터베이스 연결
    //mongoose.Promise = global.Promise;
    //mongoose.connect(databaseUrl);
    //database = mongoose.connection;

    //database.on('error', console.error.bind(console, 'mongoose connection error'));
    //database.on('open', function () {
        //logger.log('info', "데이터베이스 연결... : " + databaseUrl);
        //스키마정의
        //UserSchema = mongoose.Schema({
            //id: { type: String, required: true, unique: true },
            //password: { type: String, required: true },
            //name: String,
            //phone: String,
            //birth: String,
            //mail: String
        //});
        //console.log("스키마 정의..");

        //usermodel 정의
        //UserModel = mongoose.model("user", UserSchema);
        //console.log("UserModel 정의...");
    //});

    //연결이 끊어졌을경우 1초 후 연결
    /*
    database.on('disconnected', function () {
        console.log('연결이 끊김...5초 후 재연결...');
        setInterval(connectDB, 1000);
    });*/
    //데이터베이스 연결
    MongoClient.connect(databaseUrl, function (err, db) {
        if (err) {
            throw err;
        }
        //logger.log('info', '데이터베이스 연결,,, : ' + databaseUrl);
        //database 변수에 할당
        database = db.db('local');//데이터베이스 폴더명
    });
}
//아이디 비밀번호 비교(로그인)데이터베이스
var authUSer = function (database, id, password, callback) {
    //user 컬렉션 참조
    var user = database.collection('user');

    //아이디와 비밀번호를 사용해 검색
    user.find({ "id": id, "password": password }).toArray(function (err, docs) {
        if (err) {
            callback(err, null);
            return;
        }
        if (docs.length > 0) {
            console.log('아이디[%s] 비밀번호[%s]가 일치', id, password);
            console.log("=====================================================================".green);
            callback(null, docs);
        }
        else {
            console.log('일치하는 사용자 없음');
            console.log("=====================================================================".green);
            callback(null, null);
        }
    });
}
//방이름 비밀번호 비교(회의실)데이터베이스
var authRoom = function (database, name, password, callback) {
    //user 컬렉션 참조
    var room = database.collection('room');

    //아이디와 비밀번호를 사용해 검색
    room.find({ "name": name, "password": password }).toArray(function (err, docs) {
        if (err) {
            callback(err, null);
            return;
        }
        if (docs.length > 0) {
            console.log('방이름[%s] 비밀번호[%s]가 일치', name, password);
            console.log("=====================================================================".green);
            callback(null, docs);
        }
        else {
            console.log('일치하는 회의실 없음 : 방이름[%s] 비밀번호[%s]', name, password);
            console.log("=====================================================================".green);
            callback(null, null);
        }
    });
}
//회원가입데이터베이스
var addUser = function (database, id, password, name, birth, phone, mail, callback) {
    //user 컬렉션 참조
    var user = database.collection('user');

    //usermodel 인스턴스
    //var userdb = new UserModel({ "id": id, "password": password, "name": name, "birth": birth, "phone": phone, "mail": mail});

    //save()로 저장
    //userdb.save(function (err) {
        //if (err) {
           // callback(err, null);
            //return;
       // }
       // console.log("사용자 회원가입..");
        //callback(null, userdb);
   // });

    //사용자 추가
    user.insertMany([{ "id": id, "password": password, "name": name, "birth": birth, "phone": phone, "mail": mail }], function (err, result) {
    if (err) {
    //오류 발생
    callback(err, null);
    return;
    }


    //오류가 아닌경우
    if (result.insertedCount > 0) {
        console.log("사용자 추가 : " + result.insertedCount);
        console.log("=====================================================================".green);
    }
     else {
        console.log("사용자 추가 취소");
        console.log("=====================================================================".green);
    }
    callback(null, result);
    });
};
//회의실추가데이터베이스
var addRoom = function (database, name, password, callback) {
    //user 컬렉션 참조
    var user = database.collection('room');

    //사용자 추가
    user.insertMany([{ "name": name, "password": password }], function (err, result) {
        if (err) {
            //오류 발생
            callback(err, null);
            return;
        }


        //오류가 아닌경우
        if (result.insertedCount > 0) {
            console.log("회의실 추가 : " + result.insertedCount);
            console.log("=====================================================================".green);
        }
        else {
            console.log("회의실 추가 취소");
            console.log("=====================================================================".green);
        }
        callback(null, result);
    });
}
//캘린더 추가
var addMemo = function (database, id, date, text, callback) {
    //user 컬렉션 참조
    var todo = database.collection('todo');

    //사용자 추가
    todo.insertMany([{ "id": id, "date": date, "text": text }], function (err, result) {
        if (err) {
            //오류 발생
            callback(err, null);
            return;
        }


        //오류가 아닌경우
        if (result.insertedCount > 0) {
            console.log("캘린더 추가 : " + result.insertedCount);
            console.log("=====================================================================".green);
        }
        else {
            console.log("캘린더 추가 취소");
            console.log("=====================================================================".green);
        }
        callback(null, result);
    });
}
//아이디 검색
var findUserID = function (database, name, birth, callback) {
    //user 컬렉션 참조
    var user = database.collection('user');

    //이름, 생일 사용해 검색
    user.find({ "name": name, "birth" : birth }).toArray(function (err, docs) {
        if (err) {
            callback(err, null);
            return;
        }
        if (docs.length > 0) {
            callback(null, docs);
        }
        else {
            callback(null, null);
        }
    });
};
//비밀번호 검색
var findUserPW = function (database, name, id, birth, phone, callback) {
    //user 컬렉션 참조
    var user = database.collection('user');

    //이름, 생일 사용해 검색
    user.find({ "name": name, "id": id, "birth": birth, "phone": phone }).toArray(function (err, docs) {
        if (err) {
            callback(err, null);
            return;
        }
        if (docs.length > 0) {
            callback(null, docs);
        }
        else {
            callback(null, null);
        }
    });
};
//비밀번호 수정
var UpdatePW = function (database, uid, pw, callback) {
    console.log("아이디 : " + uid + "비밀번호 : " + pw);
    database.collection('user').update({ "id": uid }, { $set: { "password": pw } }, function (err, docs) {
        if (err) {
            throw err;
        }

        if (docs) {
            console.log("비밀번호 수정 완료");
            callback(null, docs);
        }
        else {
            console.log("비밀번호 수정 실패");
            callback(null, null);
        }
    });
}
//캘린더 데이터베이스
var authTodo = function (database, id, callback) {
    //user 컬렉션 참조
    var todo = database.collection('todo');

    //아이디와 비밀번호를 사용해 검색
    todo.find({ "id": id }).toArray(function (err, docs) {
        if (err) {
            callback(err, null);
            return;
        }
        if (docs.length > 0) {
            callback(null, docs);
        }
        else {
            console.log('일치하는 사용자 캘린더 없음');
            callback(null, null);
        }
    });
}
//로그
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        // console
        new (winston.transports.Console)(),
        // file
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'serverlog.log' })
    ]
});
//메인화면캘린더
var mainui;
function mainset(today, yesday, tomday) {
    mainui = `
<div id="mysidenav" class="sidenav">
        <a href="#" class="closebtn" onclick='closeNav()'>x</a>
        <a value="page move" onClick="roompage()">회의실</a>
    </div>

    <span class="openmenu" onclick='roompage()'><i class="fa fa-angle-double-left fa-5" aria-hidden="true"></i> 회의실</span>
    <span class="openmenu2" onclick='openNav2()'><i class="fa fa-angle-double-left fa-5" aria-hidden="true"></i>사용자목록</span>
    <span class="openmenu2" onclick='logout()'><i class="fa fa-angle-double-left fa-5" aria-hidden="true"></i>로그아웃</span>
    <script>
        function logout() {
            location.href = "/loginweb"
        }
        function openNav2() {
            document.getElementById('mysidenav2').style.width = '250px';
        }
        function closeNav2() {
            document.getElementById('mysidenav2').style.width = '0';
        }
        function roompage() {
            location.href = "/roomsearch"
        }
        function meetingpage() {
            location.href = "/meeting"
        }
        function filepage() {
            location.href = "/filecontrol"
        }
        function filelistpage() {
            location.href = "/list"
        }
        function draw() {
            location.href = "/draw"
        }
        function chatpage() {
            location.href = "javascript:chatpopup()"
        }
    </script>
<form action="mainp" method="post">
<div id="wrap">
    <p>일정관리</p>
    <!-- header -->
        <div id="header">
        <p id="dateview">시간</p>
        <p>일정 추가 :<br />[날짜] <input type="date" id="choicedate" name="datevalue"/> [일정]<input type="text" id="todo" name="todovalue"/><input class="memobtn" type="submit" value="저장" /></p>
    </div>
    <!-- //header -->
        <!-- container -->
        <div id="container">
        <!-- snb -->
            <div class="snb">
            <p style="color:#829c2c;">어제일</p>
${yesday}
            <p id="yes"></p>
        </div>
        <!-- //snb -->
            <!-- content -->
            <div id="content">
            <p style="color:#829c2c;">오늘할일</p>
${today}
            <p id="today"></p>
        </div>
        <!-- //content -->
            <!-- aside -->
            <div class="aside">
            <p style="color:#829c2c;">내일할일</p>
${tomday}
            <p id="tom"></p>
        </div>
        <!-- //aside -->
            <div class="clear">
        </div>
    </div>
    <!-- //container -->
    </div>
</form>
    <script type="text/javascript">
        function timeset() {
            var date = new Date();
        var datetxt = document.getElementById("dateview");
        var datetext = "[ 오늘의 날짜 ] ";
        datetext += date.getFullYear() + "년";
        datetext += (date.getMonth() + 1) + "월";
        datetext += date.getDate() + "일 ";
        datetext += date.getHours() + "시";
        datetext += date.getMinutes() + "분";
        datetext += date.getSeconds() + "초";
        datetxt.innerText = datetext;

            var timeout = setTimeout(function () {timeset()}, 1000);
    }
        function memoset() {
            var date = $('#choicedate').val();
        var todo = $('#do').val();
        var todaytodo = document.getElementById("today");
        var yestodo = document.getElementById("yes");
        var tomtodo = document.getElementById("tom");
        var time = new Date();
        var today = time.getFullYear() + "-" + (time.getMonth() + 1) + "-" + time.getDate();
        var yes = time.getFullYear() + "-" + (time.getMonth() + 1) + "-" + (time.getDate() - 1);
        var tom = time.getFullYear() + "-" + (time.getMonth() + 1) + "-" + (time.getDate() + 1);
            if (date == '') {
            alert("날짜를 입력하세요.");
    }
            else if (todo == '') {
            alert("일정을 입력하세요.")
        }
        else {
                if (date == today) {
            todaytodo.innerHTML += todo + "<br/>";
        alert("일정이 저장되었습니다.");
    }
                else if (date == yes) {
            yestodo.innerHTML += todo + "<br/>";
        alert("일정이 저장되었습니다.");
    }
                else if (date == tom) {
            tomtodo.innerHTML += todo + "<br/>";
        alert("일정이 저장되었습니다.");
    }
                else {
            alert("일정이 저장되었습니다.");
    }
}
}
window.onload = timeset();
/*
        $("#choicedate").change(function () {
            alert("날짜값 변경!");
    })
        $("#todo").change(function () {
            alert("일정값 변경!");
})*/
    </script>`;
}
var time = new Date();
var today = time.getFullYear() + "-" + (time.getMonth() + 1) + "-" + time.getDate();
var yes = time.getFullYear() + "-" + (time.getMonth() + 1) + "-" + (time.getDate() - 1);
var tom = time.getFullYear() + "-" + (time.getMonth() + 1) + "-" + (time.getDate() + 1);

function timeset() {
    if ((time.getMonth() + 1) < 10) {
        today = time.getFullYear() + "-0" + (time.getMonth() + 1) + "-0" + time.getDate();
        yes = time.getFullYear() + "-0" + (time.getMonth() + 1) + "-0" + (time.getDate() - 1);
        tom = time.getFullYear() + "-0" + (time.getMonth() + 1) + "-0" + (time.getDate() + 1);
    }
    else {
        today = time.getFullYear() + "-" + (time.getMonth() + 1) + "-" + time.getDate();
        yes = time.getFullYear() + "-" + (time.getMonth() + 1) + "-" + (time.getDate() - 1);
        tom = time.getFullYear() + "-" + (time.getMonth() + 1) + "-" + (time.getDate() + 1);
    }
}

//로그인화면
//app.get('', (req, res) => {
    //res.sendFile(path.join(__dirname + '/loginweb.html'));
//})
app.get('/', (req, res) => {
    var id = auID[req.connection.remoteAddress];
    var todo;

    if (id == null) {
        res.sendFile(path.join(__dirname + '/loginweb.html'));
    }
    else {
        authTodo(database, id, function (err, docs) {
            if (err) { throw err; }

            if (docs) {
                todo = docs;

            }
        });

        fs.readFile('main.html', function (error, data) {
            var list = '<b>';
            var todaytodo = '<p>';
            var yestodo = '<p>';
            var tomtodo = '<p>';
            var i = 0;
            for (var temp in auID) {
                if (auID[temp] != null) {
                    list = list + auID[temp] + '<br>';
                }
            }
            for (var temp in todo) {
                if (todo[temp].date == today) {
                    todaytodo += todo[temp].text + '<br>';
                }
                else if (todo[temp].date == yes) {
                    yestodo += todo[temp].text + '<br>';
                }
                else if (todo[temp].date == tom) {
                    tomtodo += todo[temp].text + '<br>';
                }
                else {
                }
            }
            todaytodo = todaytodo + '</p>';
            yestodo = yestodo + '</p>';
            tomtodo = tomtodo + '</p>';
            mainset(todaytodo, yestodo, tomtodo);
            list = list + '</b>' + '<br>';
            var template = `
                        <header style="font-size:20px; font-weight:bold;text-align: right; color: #829c2c;">${auID[req.connection.remoteAddress]}님 환영합니다</header>
                        <div id="mysidenav2" class="sidenav2">
                            <b href="#" class="closebtn2" onclick='closeNav2()'>x</b>
                            ${list}
                        </div>
                        ${mainui}`;
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf8' });
            res.end(template + data);
        });
    }
})
app.get('/loginweb', (req, res) => {
    if (auID[req.connection.remoteAddress] != null) {
        console.log(auID[req.connection.remoteAddress] + "님 로그아웃");
        console.log("=====================================================================".green);
        auID[req.connection.remoteAddress] = null;
    }
    res.sendFile(path.join(__dirname + '/loginweb.html'));
})
app.post('/loginweb', (req, res) => {
    var id = req.body.idtext;
    var pw = req.body.pwtext;
    var pwre = req.body.pwretext;
    var birth = req.body.bdtext;
    var phone = req.body.phtext;
    var name = req.body.ntext;
    var email = req.body.mtext;

    phone = phone.replace(/-/g, "");
    console.log(phone);

    //데이터베이스 가입 요청
    if (database) {
        addUser(database, id, pw, name, birth, phone, email, function (err, result) {

            if (err) {
                throw err;
            }
            
            if (result && result.insertedCount > 0) {
                logger.log('info', "[회원가입성공]" + req.connection.remoteAddress
                    + "[ID] " + id + "[PW] " + pw + "[PW확인] " + pwre + "[생년월일] " + birth + "[전화번호] " + phone + "[이름] " + name + "[이메일] " + email);

                fs.readFile('loginweb.html', function (error, data) {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(data);
                });
            }
            else {
                logger.log('info', "[회원가입실패]" + req.connection.remoteAddress);

                fs.readFile('loginweb.html', function (error, data) {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(data);
                });
            }

        });
    } else {
        res.writeHead('200', { 'Content-Type': 'text/html;charset=utf8' });
        res.write('<h1>데이터베이스 연결실패</h1>');
        res.end();
    }
});

//메인화면
app.get('/main', (req, res) => {
    var id;
    var todo;
    /*
  res.send(`id : ${id}, pw : ${pw}`);
  */
    id = auID[req.connection.remoteAddress];
    authTodo(database, id, function (err, docs) {
        if (err) { throw err; }

        if (docs) {
            todo = docs;
            
        }
    });
   
    fs.readFile('main.html', function (error, data) {
        var list = '<b>';
        var todaytodo = '<p>';
        var yestodo = '<p>';
        var tomtodo = '<p>';
        var i = 0;
        for (var temp in auID) {
            if (auID[temp] != null) {
                list = list + auID[temp] + '<br>';
            }
        }
        for (var temp in todo) {
            if (todo[temp].date == today) {
                todaytodo += todo[temp].text + '<br>';
            }
            else if (todo[temp].date == yes) {
                yestodo += todo[temp].text + '<br>';
            }
            else if (todo[temp].date == tom) {
                tomtodo += todo[temp].text + '<br>';
            }
            else {
            }
        }
        todaytodo = todaytodo + '</p>';
        yestodo = yestodo + '</p>';
        tomtodo = tomtodo + '</p>';
        mainset(todaytodo, yestodo, tomtodo);
        list = list + '</b>' + '<br>';
        var template = `
                        <header style="font-size:20px; font-weight:bold;text-align: right; color: #829c2c;">${auID[req.connection.remoteAddress]}님 환영합니다</header>
                        <div id="mysidenav2" class="sidenav2">
                            <b href="#" class="closebtn2" onclick='closeNav2()'>x</b>
                            ${list}
                        </div>
                        ${mainui}`;
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf8' });
        res.end(template + data);
    });
})
app.post('/main', (req, res) => {
    var id = req.body.id;
    var pw = req.body.pw;
    var todo;
    if (database) {
        authUSer(database, id, pw, function (err, docs) {
            if (err) { throw err; }

            if (docs) {

                authTodo(database, id, function (err, docs) {
                    if (err) { throw err; }

                    if (docs) {
                        todo = docs;
                    }
                });

                if (auID[req.connection.remoteAddress] == null) {
                    auID[req.connection.remoteAddress] = id;
                    console.log("[로그인 성공]" + req.connection.remoteAddress + "[접속자ID] " + id + "[접속자PW] " + pw);
                    console.log("=====================================================================".green);
                    fs.readFile('main.html', 'utf8', function (error, data) {
                        var list = '<b>';
                        var todaytodo = '<p>';
                        var yestodo = '<p>';
                        var tomtodo = '<p>';
                        for (var temp in auID) {
                            if (auID[temp] != null) {
                                list = list + auID[temp] +  '<br>';
                            }
                        }
                        for (var temp in todo) {
                            if (todo[temp].date == today) {
                                todaytodo += todo[temp].text + '<br>';
                            }
                            else if (todo[temp].date == yes) {
                                yestodo += todo[temp].text + '<br>';
                            }
                            else if (todo[temp].date == tom) {
                                tomtodo += todo[temp].text + '<br>';
                            }
                            else {

                            }
                        }
                        todaytodo = todaytodo + '</p>';
                        yestodo = yestodo + '</p>';
                        tomtodo = tomtodo + '</p>';
                        list = list + '</b>' + '<br>';
                        mainset(todaytodo, yestodo, tomtodo);
                        var template = `<script></script>
                        <header style="font-size:20px; font-weight:bold;text-align: right; color: #829c2c;">${auID[req.connection.remoteAddress]}님 환영합니다</header>
                        <div id="mysidenav2" class="sidenav2">
                            <b href="#" class="closebtn2" onclick='closeNav2()'>x</b>
                            ${list}
                        </div>
                        ${mainui}`;
                        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf8' });
                        res.end(template + data);
                    });
                }
                else {
                    res.writeHead('200', { 'Content-Type': 'text/html;charset=utf8' });
                    res.write('<h1>로그인실패</h1>');
                    res.write("<br><br><a href='/'>다시 로그인하기</a>");
                    res.end();
                }
            }
            else {
                res.writeHead('200', { 'Content-Type': 'text/html;charset=utf8' });
                res.write('<h1>로그인실패</h1>');
                res.write("<br><br><a href='/'>다시 로그인하기</a>");
                res.end();
            }
        });
    } else {
        res.writeHead('200', { 'Content-Type': 'text/html;charset=utf8' });
        res.write('<h1>데이터베이스 연결실패</h1>');
        res.end();
    }
});
app.post('/mainp', (req, res) => {
    var d = req.body.datevalue;
    var t = req.body.todovalue;
    var id = auID[req.connection.remoteAddress];

    if (database) {
        addMemo(database, id, d, t, function (err, result) {

            if (err)
                throw err;
            else {
                authTodo(database, id, function (err, docs) {
                    if (err) { throw err; }

                    if (docs) {
                        todo = docs;
                    }
                })
                fs.readFile('main.html', function (error, data) {

                    var list = '<b>';
                    var todaytodo = '<p>';
                    var yestodo = '<p>';
                    var tomtodo = '<p>';
                    var i = 0;
                    for (var temp in auID) {
                        if (auID[temp] != null) {
                            list = list + auID[temp] + '<br>';
                        }
                    }
                    for (var temp in todo) {
                        if (todo[temp].date == today) {
                            todaytodo += todo[temp].text + '<br>';
                        }
                        else if (todo[temp].date == yes) {
                            yestodo += todo[temp].text + '<br>';
                        }
                        else if (todo[temp].date == tom) {
                            tomtodo += todo[temp].text + '<br>';
                        }
                        else {
                        }
                    }
                    todaytodo = todaytodo + '</p>';
                    yestodo = yestodo + '</p>';
                    tomtodo = tomtodo + '</p>';
                    mainset(todaytodo, yestodo, tomtodo);
                    list = list + '</b>' + '<br>';
                    var template = `
                    <header style="font-size:20px; font-weight:bold;text-align: right; color: #829c2c;">${auID[req.connection.remoteAddress]}님 환영합니다</header>
                    <div id="mysidenav2" class="sidenav2">
                        <b href="#" class="closebtn2" onclick='closeNav2()'>x</b>
                        ${ list}
                    </div>
                    ${mainui}`;
                    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf8' });
                    res.end(template + data);
                });

            }
        });
    }
});

//회원가입
app.get('/account', function(request, response) {
  fs.readFile('make.html', function (error, data){
	response.writeHead(200, { 'Content-Type': 'text/html' });
	response.end(data);
	});
});
//아이디찾기
app.get('/findID', function(request, response) {
  fs.readFile('searchid.html', function (error, data){
	response.writeHead(200, { 'Content-Type': 'text/html' });
	response.end(data);
	});
});
app.post('/idresult', (request, response) => {
    var name = request.body.name;
    var birth = request.body.birth;

    if (database) {
        findUserID(database, name, birth, function (err, docs) {
            if (err) {
                throw err;
            }
            if (docs) {
                var result = docs;
                var text = '';
                var idx = 0;
                for (var temp in result) {
                    text = text + '[아이디] ' + result[temp].id + '<br>';
                    idx = idx + 1;
                }
                fs.readFile('idresult.html', function (error, data) {
                    var template = `
                                    <h2 style="text-align: center; font-size: 35px; font-family: dotum; font-weight: bold; background: #829c2c; color:#fff;">
                                        검색된 아이디 수 : ${idx}개</h2>
                                    <div style="color:#829c2c; background: #fff; text-align: center; font-size: 25px; font-family: dotum; font-weight: bold;">
                                      ${text}
                                    </div>
                                    <div>
                                        <input type="button" value="확인" onclick="closeresult()" style="background: #829c2c;color: #fff;font-size: 15px;font-weight: bold;font-family: dotum;text-align: center;padding: 10px;margin: 100px 220px;"/>
                                    </div>

                                    <script type="text/javascript">
                                        function closeresult() {
                                            window.close();
                                        }
                                    </script>`;
                    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf8' });
                    response.end(template + data);
                });
            }
            else {
                response.writeHead('200', { 'Content-Type': 'text/html;charset=utf8' });
                response.write('<h1>계정이 없습니다</h1>');
                response.end();
            }
        });
    } else {
        response.writeHead('200', { 'Content-Type': 'text/html;charset=utf8' });
        response.wirte('<h1>데이터베이스 연결실패</h1>');
        response.end();
    }
});
//비밀번호찾기
app.get('/findPW', function(request, response) {
  fs.readFile('searchpassword.html', function (error, data){
	response.writeHead(200, { 'Content-Type': 'text/html' });
	response.end(data);
	});
    //logger.log('info', "[비밀번호 찾기]" + request.connection.remoteAddress);
});
app.post('/pwresult', (request, response) => {
    var name = request.body.name;
    var id = request.body.id;
    var birth = request.body.birth;
    var phone = request.body.phone;

    phone = phone.replace(/-/g, "");

    if (database) {
        findUserPW(database, name, id, birth, phone, function (err, docs) {
            if (err) {
                throw err;
            }
            if (docs) {
                fs.readFile('passwordresult.html', function (error, data) {
                    setPW[request.connection.remoteAddress] = id;
                    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf8' });
                    response.end(data);
                });
            }
            else {
                response.writeHead('200', { 'Content-Type': 'text/html;charset=utf8' });
                response.write('<h1>계정이 없습니다</h1>');
                response.end();
            }
        });
    } else {
        response.writeHead('200', { 'Content-Type': 'text/html;charset=utf8' });
        response.wirte('<h1>데이터베이스 연결실패</h1>');
        response.end();
    }
});
app.post('/setpassword', (request, response) => {
    var pw = request.body.newpassword;
    console.log("새로운비번: " + pw);
    if (database) {
        UpdatePW(database, setPW[request.connection.remoteAddress], pw, function (err, docs) {
            if (err) {
                throw err;
            }
            if (docs) {
                fs.readFile('setpassword.html', function (error, data) {
                    setPW[request.connection.remoteAddress] = null;
                    response.writeHead(200, { 'Content-Type': 'text/html' });
                    response.end(data);
                });
            }
            else {
                response.writeHead('200', { 'Content-Type': 'text/html;charset=utf8' });
                response.write('<h1>계정이 없습니다</h1>');
                response.end();
            }
        });
    }
});
//화상회의
app.get('/meeting', function (request, response) {
    logger.log('info', "[회의화면 접속]" + request.connection.remoteAddress);
    try {

        fs.readFile('meeting.html', function (err, file) {
            if (err) {
                response.writeHead(500, {
                    'Content-Type': 'text/html'
                });
                response.write('404 Not Found: ' + path.join('/', uri) + '\n');
                response.end();
                return;
            }

            response.writeHead(200, { 'Content-Type': 'text/html' });
            response.end(file);
        });
    } catch (e) {
        response.writeHead(404, {
            'Content-Type': 'text/plain'
        });
        response.write('<h1>Unexpected error:</h1><br><br>' + e.stack || e.message || JSON.stringify(e));
        response.end();
        console.log('error');
    }
});
app.post('/meeting', (req, res) => {
    var name = req.body.name;
    var password = req.body.password;

    roomname = name;
    userIP = req.connection.remoteAddress;

    if (database) {
        authRoom(database, name, password, function (err, docs) {
            if (err) { throw err; }

            if (docs) {
                console.log("[회의실입장]" + req.connection.remoteAddress + " [방이름] " + name + " [PW] " + password);
                console.log("=====================================================================".green);
                fs.readFile('meeting.html', function (error, data) {
                    if (err) {
                        res.writeHead(500, {
                            'Content-Type': 'text/html'
                        });
                        res.write('404 Not Found: ' + path.join('/', uri) + '\n');
                        res.end();
                        return;
                    }

                    var template = `
                    <script>
                        if (!location.hash.replace('#', '').length) {
                            location.href = location.href.split('#')[0] + '#' + "${name}";
                            location.reload();
                        }
                    </script>`;
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(template+data);
                });
            }
            else {
                res.writeHead('200', { 'Content-Type': 'text/html;charset=utf8' });
                res.write('<h1>방입장실패</h1>');
                res.write("<br><br><a href='/main'>메인으로</a>");
                res.end();
            }
        });
    } else {
        res.writeHead('200', { 'Content-Type': 'text/html;charset=utf8' });
        res.write('<h1>데이터베이스 연결실패</h1>');
        res.end();
    }
});
app.get('/roomsearch', function (request, response) {
    fs.readFile('searchroom.html', function (error, data) {
        response.writeHead(200, { 'Content-Type': 'text/html' });
        response.end(data);
    });
});
app.post('/roomsearch', (req, res) => {

    var name = req.body.name;
    var password = req.body.password;

    //데이터베이스 가입 요청
    if (database) {
        addRoom(database, name, password, function (err, result) {

            if (err) {
                throw err;
            }

            if (result && result.insertedCount > 0) {
                console.dir(result);
                logger.log('info', "[회의실생성 성공]" + req.connection.remoteAddress
                    + "[name] " + name + "[PW] " + password);

                fs.readFile('searchroom.html', function (error, data) {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(data);
                });
                try {
                    fs.mkdirSync(__dirname + "/uploads/" + name);
                } catch (e) {
                    if (e.code != 'EEXIST') throw e;
                }
            }
            else {
                logger.log('info', "[회의실생성 실패]" + req.connection.remoteAddress);

                fs.readFile('searchroom.html', function (error, data) {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    alert("생성실패");
                    res.end(data);
                });
            }

        });
    } else {
        res.writeHead('200', { 'Content-Type': 'text/html;charset=utf8' });
        res.write('<h1>데이터베이스 연결실패</h1>');
        res.end();
    }
});
app.get('/makeroom', function (request, response) {
    fs.readFile('makeroom.html', function (error, data) {
        response.writeHead(200, { 'Content-Type': 'text/html' });
        response.end(data);
    });
});

/********************************************************************/
app.get('/share', function (request, response) {
    fs.readFile('share.html', function (error, data) {
        response.writeHead(200, { 'Content-Type': 'text/html' });
        response.end(data);
    });
});
app.get('/stt', function (request, response) {
    fs.readFile('mic.html', function (error, data) {
        response.writeHead(200, { 'Content-Type': 'text/html' });
        response.end(data);
    });
});
/********************************************************************/

//파일저장소
app.get('/filecontrol', function (request, response) {
    fs.readFile('filecontrol.html', function (error, data) {
        response.writeHead(200, { 'Content-Type': 'text/html' });
        response.end(data);
    });
});
app.post('/upload', upload.single('userfile'), (request, response) => {
    console.log(request.file);
    console.log("=====================================================================".green);
    fs.readFile('fileresult.html', function (error, data) {
        response.writeHead(200, { 'Content-Type': 'text/html' });
        response.end(data);
    });
    logger.log('info', "[파일 업로드 완료]" + request.connection.remoteAddress + "[파일명]" + request.file.filename);
    console.log("=====================================================================".green);
});
app.get('/list', function (request, response) {
    var _url = request.url;
    var queryData = url.parse(_url, true).query;
    var pathname = url.parse(_url, true).pathname;
    if (pathname === '/list') {
        if (queryData.id === undefined) {

            fs.readdir('./uploads' + '/' + `${roomname}`, function (error, filelist) {
                var title = '파일리스트';
                var list = '<ul>';
                var i = 0;
                while (i < filelist.length) {
                    list = list + `<li><a href="/userfile/${roomname}/${ filelist[i] }">${filelist[i]}</a></li>`;
                    i = i + 1;
                }
                list = list + '</ul>';
                

            /*
             타이틀 밑에 있던것...
            <p>${description}</p>
            */
                var template = `
          <!doctype html>
          <html>
          <head>
            <title>${title}</title>
            <link rel="stylesheet" href="default.css"/>
            <style type="text/css">
            body{
                padding: 20px;
            }
            li{
                padding: 10px;
                color: #fff;
                background: #829c2c;
                border: 1px solid #778f28;
            }
            </style>
            <link rel="stylesheet" href="default2.css" />
             <link rel="stylesheet" href="filestyle.css" />
            <link rel="shortcut icon" type="image/x-icon" href="sanaicon.ico" />
            <meta charset="utf-8">
          </head>
          <body>
            <h1>파일 업로드</h1>
            <form action="upload" method="post" enctype="multipart/form-data">
                    <fieldset>
                        <legend>파일 업로드</legend>
                        <div class="uploadform">
                            <ul class="upload">
                                <li><a><input type="file" name="userfile" /></a></li>
                                <li><a><input type="submit" name="제출" /></a></li>
                            </ul>
                        </div>
                    </fieldset>

                </form>
            <h1>${title}</h1>
            ${list}
          </body>
          </html>
          `;
                response.writeHead(200);
                response.end(template);
            })
        } else {
            fs.readdir('./uploads', function (error, filelist) {
                var title = 'Welcome';
                var description = 'Hello, Node.js';
                var list = '<ul>';
                var i = 0;
                while (i < filelist.length) {
                    list = list + `<li><a href="/?id=${filelist[i]}">${filelist[i]}</a></li>`;
                    i = i + 1;
                }
                list = list + '</ul>';
                fs.readFile(`data/${queryData.id}`, 'utf8', function (err, description) {
                    var title = queryData.id;
                    var template = `
            <!doctype html>
            <html>
            <head>
              <title>WEB1 - ${title}</title>
              <meta charset="utf-8">
            </head>
            <body>
              <h1><a href="/">WEB</a></h1>
              ${list}
              <h2>${title}</h2>
              <p>${description}</p>
            </body>
            </html>
            `;
                    response.writeHead(200);
                    response.end(template);
                });
            });
        }
    } else {
        response.writeHead(404);
        response.end('Not found');
    }
});
app.get('/roomlist', function (request, response) {
    var _url = request.url;
    var queryData = url.parse(_url, true).query;
    var pathname = url.parse(_url, true).pathname;
    if (pathname === '/roomlist') {
        if (queryData.id === undefined) {

            fs.readdir('./room', function (error, filelist) {
                var title = '회의실리스트';
                var list = '<ul>';
                var i = 0;
                while (i < filelist.length) {
                    list = list + `<li><a href="/meeting#${filelist[i]}">${filelist[i]}</a></li>`;
                    i = i + 1;
                }
                list = list + '</ul>';

                /*
                 타이틀 밑에 있던것...
                <p>${description}</p>
                */
                var template = `
          <!doctype html>
          <html>
          <head>
            <title>${title}</title>
            <link rel="stylesheet" href="listdefault.css"/>
            <style type="text/css">
            body{
                padding: 20px;
            }
            li{
                padding: 10px;
                color: #fff;
                background: #829c2c;
                border: 1px solid #778f28;
            }
            </style>
            <meta charset="utf-8">
          </head>
          <body>
            <h1>${title}</h1>
            ${list}
            <h2><b href="/main">메인으로</b></h2>
          </body>
          </html>
          `;
                response.writeHead(200);
                response.end(template);
            })
        } else {
            fs.readdir('./room', function (error, filelist) {
                var title = 'Welcome';
                var description = 'Hello, Node.js';
                var list = '<ul>';
                var i = 0;
                while (i < filelist.length) {
                    list = list + `<li><a href="/?id=${filelist[i]}">${filelist[i]}</a></li>`;
                    i = i + 1;
                }
                list = list + '</ul>';
                fs.readFile(`data/${queryData.id}`, 'utf8', function (err, description) {
                    var title = queryData.id;
                    var template = `
            <!doctype html>
            <html>
            <head>
              <title>WEB1 - ${title}</title>
              <meta charset="utf-8">
            </head>
            <body>
              <h1><a href="/">WEB</a></h1>
              ${list}
              <h2>${title}</h2>
              <p>${description}</p>
            </body>
            </html>
            `;
                    response.writeHead(200);
                    response.end(template);
                });
            });
        }
    } else {
        response.writeHead(404);
        response.end('Not found');
    }
});
//잼보드
app.get('/draw', function (request, response) {
    fs.readFile('widget.html', function (error, data) {
        response.writeHead(200, { 'Content-Type': 'text/html' });
        response.end(data);
    });
    logger.log('info', "[그림보드 접속]" + request.connection.remoteAddress);
});
//채팅
app.get('/chat', function (request, response) {
    fs.readFile('chat.html', function (err, data) {
        /*
        if (err) {
            response.send('에러')
        } else {
            response.writeHead(200, { 'Content-Type': 'text/html' })
            response.write(data)
            response.end()
        }*/
        if (err) {
            res.writeHead(500, {
                'Content-Type': 'text/html'
            });
            res.write('404 Not Found: ' + path.join('/', uri) + '\n');
            res.end();
            return;
        }

        var template = `
                    <script>
                        if (!location.hash.replace('#', '').length) {
                            location.href = location.href.split('#')[0] + '#' + "${roomname}";
                            location.reload();
                        }
                    </script>`;
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(template + data);
    });
    //response.sendFile(__dirname + '/chat.html');
    logger.log('info', "[채팅 접속]" + request.connection.remoteAddress);
});
//서버 실행
server.listen(port, process.env.IP || '0.0.0.0', function () {
    var addr = server.address();

    if (addr.address === '0.0.0.0') {
        addr.address = 'localhost';
    }
    console.log("=====================================================================".green);
    console.log('3조 화상회의 프로그램');
    console.log(time);
    console.log('[서버실행] https://' + addr.address + ':' + addr.port);
    console.log("=====================================================================".green);
    connectDB();
    timeset();
});