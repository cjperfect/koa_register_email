const Koa = require("koa");
const koaBody = require("koa-body");
const cors = require("@koa/cors");
const Router = require("koa-router");
const app = new Koa();
const nodemailer = require("nodemailer");
const smtpTransport = require("nodemailer-smtp-transport");
const mysql = require("mysql");

const mysql_config = {
  host: "localhost",
  user: "root",
  password: "root",
  database: "blog",
};

let connection;
function handleDisconnection() {
  connection = mysql.createConnection(mysql_config);
  connection.connect(function (err) {
    if (err) {
      setTimeout("handleDisconnection()", 2000);
    }
  });

  connection.on("error", function (err) {
    if (err.code === "PROTOCOL_CONNECTION_LOST") {
      handleDisconnection();
    } else {
      throw err;
    }
  });
}

handleDisconnection();
app.use(cors());

let router = new Router();
app.use(koaBody());

const transport = nodemailer.createTransport(
  smtpTransport({
    host: "smtp.163.com", // 服务 由于我用的163邮箱
    port: 465, // smtp端口 默认无需改动
    secure: true,
    auth: {
      user: "15927202962@163.com", // 用户名
      pass: "STAZMJIXJRXHDJFG", // SMTP授权码
    },
  })
);

function mailSend(mail, code) {
  // 邮件信息
  let mainInfo = {
    from: "15927202962@163.com", // sender address
    to: mail, // 接收者邮箱 可以是多个 以,号隔开
    subject: "hello", // Subject line
    html: `
    <p>你好！</p>
    <p>你的验证码是：<strong style="color: #ff4e2a;">${code}</strong></p>
    <p>***该验证码5分钟内有效***</p>`, // html 内容
  };

  return new Promise((resolve, reject) => {
    // 发送邮件
    transport.sendMail(mainInfo, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

const randomFns = () => {
  // 生成6位随机数
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += parseInt(Math.random() * 10);
  }
  return code;
};

router.post("/sendEmail", async (ctx) => {
  let { email } = ctx.request.body;
  if (email) {
    let code = randomFns(); // 随机验证码
    try {
      const addSql = "INSERT INTO users(email,code,create_time) VALUES(?,?,?)";
      const addSqlParams = [email, code, new Date()];
      connection.query(addSql, addSqlParams, function (error) {
        if (error) throw error;
        console.log("插入成功");
      });
      await mailSend(email, code);
      ctx.body = JSON.stringify({ code: 200, msg: "验证码发送成功", email });
    } catch (error) {
      ctx.body = JSON.stringify({ err: -1, msg: "出现错误" });
    }
  } else {
    ctx.body = JSON.stringify({ err: -1, msg: "参数错误", email: "拉闸了" });
  }
});

router.post("/register", async (ctx) => {
  let { email, password, code, username } = ctx.request.body;

  const selectSql = `select * from users where email='${email}'`;
  connection.query(selectSql, function (error, res) {
    if (error) throw error;
    if (res.length) {
      const updateSql = `update users set password='${password}' where email='${email}'`;
      const updateSqlParams = [password];
      connection.query(updateSql, updateSqlParams, function (error) {
        if (error) throw error;
        console.log("更新成功");
      });
    }
  });
  ctx.body = JSON.stringify({ code: 200, msg: "注册成功", email, username });
});

app.use(router.routes()).use(router.allowedMethods());

app.listen(3000, () => {
  console.log("服务器启动3000端口");
});
