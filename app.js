const express = require("express");
const mysql = require('mysql');
const app = express()
const port = 9000
const path = require('path');
const session = require('express-session');
const crypto = require('crypto');
const FileStore = require('session-file-store')(session);
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static("assets"));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true, }));
app.use(bodyParser.json());

const con = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '1234',
  database: 'finance',
});

//세션 등록
app.use(session({
  secret: 'mykey',
  resave: false,
  saveUninitialized: true,
  store: new FileStore()
}));

app.get('/index/:id', (req, res) => {
  console.log('메인페이지');
  con.query('select * from user where id=?', [req.params.id], (err, data) => {
    res.render('index', {
      name: data[0].NAME,
      id: req.params.id,
      is_logined: req.params.is_logined,
    });
  });
})
//회원가입
app.get('/register', (req, res) => {
  console.log('회원가입 페이지');
  res.render('register');
});

app.post('/register', (req, res) => {
  console.log('회원가입 하는 중')
  const body = req.body;
  const id = body.id;
  const pw = body.pw;
  const name = body.name;
  const email = body.email;

  con.query('select * from user where id=?', [id], (err, data) => {
    if (data.length == 0) {
      console.log('회원가입 성공');
      con.query('insert into user(id,pw,name,email) values(?,?,?,?)', [id, pw, name, email]);
      res.send(`<script> alert('회원가입 성공!!'); location.href='/'</script>`);
    } else {
      console.log('회원가입 실패');
      res.send('<script>alert("회원가입 실패!!(동일한 정보가 존재합니다.)"); location.href="/register"</script>')
    }
  });
});

//로그인
app.get('/login', (req, res) => {
  console.log('로그인 작동');
  res.render('login', {
    is_logined: false
  });
});

app.post('/login', (req, res) => {
  const body = req.body;
  const id = body.id;
  const pw = body.pw;

  con.query('select * from user where id=?', [id], (err, data) => {
    //로그인 확인
    console.log(data[0]);
    console.log(id);
    console.log(data[0].ID);
    console.log(data[0].PW);
    console.log(id == data[0].ID);
    console.log(pw == data[0].PW);
    if (id == data[0].ID && pw == data[0].PW) {
      console.log('로그인 성공');
      //세션에 추가
      body.name = data.NAME;
      body.id = data.ID;
      body.pw = data.PW;
      req.session.save(function () {  //세션 스토어에 적용하는 작업
        res.render('index', {  //정보전달
          name: data[0].NAME,
          id: data[0].ID,
          age: data[0].EMAIL,
          is_logined: true,
        });
      });
      console.log(req.body.name);
    } else {
      console.log('로그인 실패');
      res.send('<script>alert("로그인 실패!!(아이디 혹은 비밀번호가 잘못되었습니다.)"); location.href="/login"</script>')
    }
  });
});

//로그아웃
app.get('/logout', (req, res) => {
  console.log('로그아웃 성공');
  req.session.destroy(function (err) {
    //세션 파괴후 할 것들
    res.send('<script>alert("로그아웃"); location.href="/"</script>')
  });
});


//list 페이지
app.get('/list/:id', (req, res) => {
  console.log('거래내역 페이지');
  con.query('select aNUMBER, aPW, bank, NAME from account,user where account.id=user.id and account.id = ?', [req.params.id], (err, data) => {
    if (err) throw err;
    var name = null;
    if (data.length == 0) {
      con.query('select NAME from user where id = ?', [req.params.id], (err, result) => {
        name = result[0].NAME;
        console.log(name);
      });
    } else {
      name = data[0].NAME;
      console.log(name);
    } 
    console.log(name); 
    req.session.save(function () {
      res.render('list', {
        account: data,
        name: name,
        id: req.params.id,
        aNUMBER: data.aNUMBER,
        bank: data.bank,
        is_logined: req.params.is_logined,
      });
    });
  });
});

//연결계좌 추가
app.get('/account/:id', (req, res) => {
  console.log('계좌 추가 페이지');

  con.query('select * from user where id=?', [req.params.id], (err, data) => {
    if (err) throw err;
    req.session.save(function () {
      res.render('account', {
        user: data,
        name: data[0].NAME,
        id: req.params.id,
        is_logined: req.params.is_logined,
      });
    });
  });
});

app.post('/account/:id', (req, res) => {
  console.log('계좌 추가 하는 중')
  const body = req.body;
  const aNUMBER = body.aNUMBER;
  const apw = body.apw;
  const bank = body.bank;

  con.query('select * from user where id = ?', [req.params.id], (err, data) => {
    const name = data[0].NAME;
    con.query('select * from account where aNUMBER=?', [aNUMBER], (err, data) => {
      if (data.length == 0) {
        console.log('계좌 추가 성공');
        con.query('insert into account(id,aNUMBER, apw,bank) values(?,?,?,?)', [req.params.id, aNUMBER, apw, bank]);
        con.query('insert into transaction(aNUMBER, sendName, MONEY, PLUS, sendNumber,NAME,sendbank) values(?,?,?,?,?,?,?)',
          [aNUMBER, "GSMbank", 10000, 0, "99999999999", name, "GSMbank"]);
        res.send(`<script>alert('계좌추가 성공!!'); location.href = document.referrer; </script>`); //아쉬운 점 script에 경우 location.href일 때 파라미터 값을 어떻게 전달해야하나 몰라 이 전의 페이지로 돌아가 거래내역을 눌러야함
      } else {
        console.log('계좌 추가 실패');
        res.send(`<script>alert("계좌추가 실패!!(동일한 정보가 존재합니다.)"); location.href = document.referrer; </script>`)
      }
    });
  })
});

//연결 계좌 삭제
app.get('/delete/:aNUMBER/:id', (req, res) => {
  console.log('거래내역 삭제 시도');

  con.query('delete from account where aNUMBER=?', [req.params.aNUMBER], (err, deletedata) => {
    if (err) throw err;
    console.log(deletedata);
    console.log('거래내역 삭제 성공');
    con.query('select aNUMBER,aPW, bank, NAME from account,user where account.id = user.id and account.id=?', [req.params.id], (err, data) => {
      if (err) throw err;
      var name = null;
    if (data.length == 0) {
      con.query('select NAME from user where id = ?', [req.params.id], (err, result) => {
        name = result[0].NAME;
        console.log(name);
      });
    } else {
      name = data[0].NAME;
      console.log(name);
    } 
    console.log(name); 
    req.session.save(function () {
      res.render('list', {
        account: data,
        name: name,
        id: req.params.id,
        aNUMBER: data.aNUMBER,
        bank: data.bank,
        is_logined: req.params.is_logined,
      });
    });
    });
  });
});

//거래내역 조회
app.get('/remain/:aNumber/:id', (req, res) => {
  console.log('거래내역 조회');
  const body = req.body;
  con.query('select * from finance.transaction, finance.user where transaction.NAME = user.NAME and aNUMBER=? and user.id = ?;', 
  [req.params.aNumber,req.params.id], (err, data) => {
    if (err) throw err;
    console.log('거래내역 조회 성공')
    var name = null;
    if (data.length == 0) {
      con.query('select NAME from user where id = ?', [req.params.id], (err, result) => {
        name = result[0].NAME;
        console.log(name);
      });
    } else {
      name = data[0].NAME;
      console.log(name);
    }
    console.log(name); 
    req.session.save(function () {
      res.render('remain', {
        transaction: data,
        id: req.params.id,
        name: name,
        is_logined: body.is_logined,
        aNUMBER: req.params.aNumber,
        plus: data.PLUS
      });
    });
  });
});


app.get('/withdraw/:aNumber/:id', (req, res) => {
  console.log('이체하기 작동');
  con.query('select * from user where id=?', [req.params.id], (err, data) => {
    if (err) throw err;
    req.session.save(function () {
      res.render('withdraw', {
        user: data,
        name: data[0].NAME,
        id: req.params.id,
        is_logined: req.params.is_logined,
      });
    });
  });
})
app.post('/withdraw/:aNumber/:id', (req, res) => {
  console.log('이체하기');
  const body = req.body;
  const sendNumber = body.sendNumber;
  const money = body.money;
  const sendName = body.sendName;
  const sendbank = body.sendbank;
  const apw = body.apw;


  con.query('select * from user, account where user.ID = account.ID and user.ID=?', [req.params.id], (err, result) => {
    console.log(result);
    const name = result[0].NAME;
    if (apw == result[0].aPW) {
      con.query('insert into transaction(aNUMBER, sendName, MONEY, PLUS, sendNumber, sendbank, NAME) values(?,?,?,?,?,?,?)',
        [req.params.aNumber, sendName, money, 1, sendNumber, sendbank, name], (err) => {
          con.query('select * from transaction where aNumber = ?', [req.params.aNumber], (err, data) => {
            if (err) throw err;
            console.log('이체 성공') //콤보박스로 선택하게하려 했으나 오류나서 불가했음
            req.session.save(function () {
              res.render('remain', {
                transaction: data,
                id: req.params.id,
                name: name,
                is_logined: body.is_logined,
                aNUMBER: req.params.aNumber,
              });
            });
          });
        });
    } else {
      console.log('이체 실패');
      res.send(`<script>alert("이체 실패!!(비밀번호가 틀렸습니다.)"); location.href = document.referrer; </script>`)
    }
  });
});

app.get('/mypage/:id', (req, res) => {
  console.log("마이페이지 접속 성공");

  con.query('select * from user where id=?', [req.params.id], (err, data) => {
    if (err) throw err;
    console.log(data);
    req.session.save(function () {
      res.render('mypage', {
        user: data,
        name: data[0].NAME,
        id: req.params.id,
        is_logined: req.params.is_logined,
      });
    });
  });
});

app.post('/update/:id', (req, res) => {
  var id = req.params.id;
  var pw = req.body.pw;
  var name = req.body.name;
  var email = req.body.email;
  var data = [pw, name, email, id];

  console.log("업데이트 시도");

  var sql = "UPDATE user SET pw = ?, name = ?, email = ? where id = ?";

  con.query(sql, data, function (err, result, fields) {
    if (err) throw err;
    console.log("업데이트 성공");
    res.render('index', {
      name: req.body.name,
      id: req.params.id,
      is_logined: req.params.is_logined,
    });
  });
});


app.listen(port, () => {
  console.log(`${port}번 포트에서 서버 대기중입니다.`)
});
