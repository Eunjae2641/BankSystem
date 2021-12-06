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
  res.render('login');
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
      res.render('login');
    }
  });
});

//로그아웃
app.get('/logout', (req, res) => {
  console.log('로그아웃 성공');
  req.session.destroy(function (err) {
    //세션 파괴후 할 것들
    res.render('index', {
      is_logined: false,
    });
  });
});


//list 페이지
app.get('/list/:id', (req, res) => {
  console.log('거래내역 페이지');
  con.query('select * from user where id=?', [req.params.id], (err, result) => {
    const name1 = result[0].NAME
    con.query('select * from account where id=?', [req.params.id], (err, data) => {
      if (err) throw err;
      req.session.save(function () {
        res.render('list', {
          account: data,
          name: name1,
          id: req.params.id,
          aNUMBER: data.aNUMBER,
          bank: data.bank,
          is_logined: req.params.is_logined,
        });
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
        con.query('insert into account(id,aNUMBER, apw,NAME,bank) values(?,?,?,?,?)', [req.params.id, aNUMBER, apw, name, bank]);
        con.query('insert into transaction(aNUMBER, sendName, MONEY, PLUS, sendNumber,NAME) values(?,?,?,?,?,?)',[aNUMBER, "GSMbank", 10000, 0, "99999999999", name]);
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

  con.query('delete from account where aNUMBER=?', [req.params.aNUMBER], (err, data) => {
    if (err) throw err;
    console.log(data);
    console.log('거래내역 삭제 성공');
    con.query('select * from user where id = ?', [req.params.id], (err, result) => {
      const name = result[0].name;
      con.query('select * from account where id=?', [req.params.id], (err, data) => {
        if (err) throw err;
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
});

  app.get('/remain/:aNumber/:id', (req, res) => {
    console.log('거래내역 조회');
    const body = req.body;
    const PLUS = body.PLUS;
    con.query('select * from user where id=?',[req.params.id],(err, result) =>{
      console.log(result);
      const name = result[0].NAME;
    con.query('select * from transaction where aNUMBER=?', [req.params.aNumber], (err, data) => {
      if (err) throw err;
      console.log('거래내역 조회 성공')
      req.session.save(function () {
          res.render('remain', {
            transaction: data,
            id: req.params.id,
            name: name,
            is_logined: body.is_logined,
            plus : data.PLUS
          });

      });
    });
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
          pw: data[0].PW,
          email: data[0].EMAIL,
          is_logined: req.params.is_logined,
        });
      });
    });
  });

  app.post('/update/:id', (req, res) => { // 수정링크를 타고 들어온 데이터의 id 값과 des 값을 받아서 update ejs 파일로 넘긴다
    var id = req.body.id;
    var pw = req.body.pw;
    var name = req.body.name;
    var email = req.body.email;
    var data = [id, pw, name, email];

    console.log("업데이트 시도");

    var sql = "UPDATE user SET id = ?, pw = ?, name = ?, email = ?";

    con.query(sql, data, function (err, result, fields) {
      if (err) throw err;
      console.log(result);
      res.render('index', {
        name: req.body.name,
        id: req.body.id,
        is_logined: req.params.is_logined,
      });
    });
  });


  app.listen(port, () => {
    console.log(`${port}번 포트에서 서버 대기중입니다.`)
  });
