const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');
const multer = require('multer'); // For handling file uploads
const port = 3000;
// 引入body-parser模块，用来处理post请求参数
const bodyParser = require('body-parser');
const https = require('https');
const options = {
  key: fs.readFileSync('CA/myServer.pem'),
  cert: fs.readFileSync('CA/myServer.crt'),
};
const folderPath = 'E:\\研1上\\网络攻防基础\\project1\\uploads';

var jwt = require("jsonwebtoken")
// 创建服务器对象
const mysql = require("mysql")
const conn = mysql.createConnection({
	host: "127.0.0.1",
	user: "root",
	password: "",
    //此处是你添加的数据库名
	database: "mySecureFileSystem",
	multipleStatements: true,

})

// 处理post请求参数
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json());


// Set up the middleware for handling file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 动态获取上传路径
    const dynamicPath = path.join(folderPath);
    
    cb(null, dynamicPath);
  },
  filename: (req, file, cb) => {
    const decodedFilename = decodeURIComponent(file.originalname); 
    cb(null, decodedFilename);
  },
});

const fileFilter = (req, file, callback) => {
  // 解决中文名乱码的问题 latin1 是一种编码格式
  file.originalname = Buffer.from(file.originalname, "latin1").toString(
      "utf8"
  );
  callback(null, true);
};

const upload = multer({ storage: storage , fileFilter: fileFilter});

// 配置静态资源目录
app.use(express.static(path.join(__dirname, 'public')));

const server = https.createServer(options, app);
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Serve the uploaded files
app.use('/uploads', express.static('uploads'));

// 创建 token 类
class Jwt {
  constructor(data) {
      this.data = data;

  }

  //生成token
  generateToken() {
      let data = this.data;
      let created = Math.floor(Date.now() / 1000);
      let cert = fs.readFileSync(path.join('E:\\研1上\\网络攻防基础\\project1\\CA\\tokenKey_private.pem'));//私钥 可以自己生成
      let token = jwt.sign({
          data,
          exp: created + 60 * 30,
      }, cert, {algorithm: 'RS256'});
      return token;
  }

  // 校验token
  verifyToken() {
      let token = this.data;
      let cert = fs.readFileSync(path.join('E:\\研1上\\网络攻防基础\\project1\\CA\\tokenKey_public.pem'));//公钥 可以自己生成
      let res;
      try {
          let result = jwt.verify(token, cert, {algorithms: ['RS256']}) || {};
          let {exp = 0} = result, current = Math.floor(Date.now() / 1000);
          if (current <= exp) {
              res = result.data || {};
          }
      } catch (e) {
          res = 'err';
      }
      return res;
  }
}

app.use(function (req, res, next) {
  // 我这里知识把登陆和注册请求去掉了，其他的多有请求都需要进行token校验 
  if (req.url != '/login' && req.url != '/register') {
      let token = req.headers.authorization;
      let jwt = new Jwt(token);
      let result = jwt.verifyToken();
      // 如果考验通过就next，否则就返回登陆信息不正确
      if (result == 'err') {
          res.send({code :0,msg:"登录已过期,请重新登录"});
          console.log('登录已过期,请重新登录');
          //res.send({status: 403, msg: '登录已过期,请重新登录'});
          //res.render('login.html');
      } else {
          next();
      }
  } else {
      next();
  }
});

// Define a route for file uploads
app.post('/upload', upload.single('file'), (req, res) => {
  if (req.file) {

    console.log(req.body.path);
    console.log(req.file.path);
    const uploadedFilePath = req.file.path; // 获取上传的文件临时路径


    // 构建目标路径，假设你要将文件移动到 /uploads 目录下
    const targetDirectory = path.join(folderPath, req.body.path);
    const targetFilePath = path.join(targetDirectory, req.file.originalname);
    //校验是否允许访问目录
    const relativePath = path.relative(folderPath, targetFilePath);
    if (relativePath.startsWith('..')) {
      res.status(403).send({ error: 'Access to parent directory is not allowed.' });
    } 
    else {
      fs.rename(uploadedFilePath, targetFilePath, (err) => {
        if (err) {
          console.error('文件移动失败', err);
          res.json({code:1, message: '文件移动失败' });
        } else {
          console.log('文件移动成功');
          res.json({ code:1, message: '文件上传成功' });
        }
      });
    }
  } else {
    res.json({code:1,  message: '文件上传失败' });
  }
});

app.post('/download', (req, res) => {
  const filename = req.body.filename; // Assuming the filename is sent in the request body
  //校验是否允许访问目录
  const Path= path.join(folderPath, filename);
  const relativePath = path.relative(folderPath, Path);
  console.log(Path)
  console.log(relativePath)
  if (relativePath.startsWith('..')) {
    res.status(403).send({ error: 'Access to parent directory is not allowed.' });
  } 
  else {
    res.download(path.join(folderPath, filename));
  }
});

app.post('/show_file', (req, res) => {
  // 指定本地文件夹的路径
  //传入的path
  const curDir = req.body.curDir;
  var Path =path.join(folderPath, curDir);
  //校验是否允许访问目录
  const relativePath = path.relative(folderPath, Path);
  if (relativePath.startsWith('..')) {
    res.status(403).send({ error: 'Access to parent directory is not allowed.' });
  } 
  else {
    // 读取文件夹中的文件列表
    fs.readdir(Path, (err, files) => {
      if (err) {
        return res.status(500).send({ error: 'Unable to read folder contents.' });
      }

      const data = { code:1,files: {} };

      // 循环处理每个文件
      files.forEach((fileName) => {
        //只挂载upload这一个文件夹
        const filePath = path.join(Path, fileName);//文件真实路径
        const relativePath = path.relative(folderPath, filePath);//相对与挂载目录的路径
        filePath_user = path.join(relativePath);
        const fileStats = fs.statSync(filePath);
        
        let fileType = 'file'; // 默认为文件类型
        if (fileStats.isDirectory()) {
            fileType = 'dir'; // 如果是文件夹则设置为文件夹类型
            filePath_user += '\\'; // 如果是文件夹，添加斜杠
        }

        data.files[fileName] = {
          fileName: fileName,
          fileSize: fileStats.size,
          fileType: fileType, // 或者 'dir'，具体根据文件类型判断
          fileDir: filePath_user,
          fileUploadDate: fileStats.mtime.toISOString(),
        };
      });

      res.send(data);
    });
  }


});

app.post('/goback', (req, res) => {
  //console.log(req.body.filename);
  const nowDir = req.body.nowDir; // Assuming the filename is sent in the request body
  //res.download(`uploads/${filename}`);
  full_dir=path.join(folderPath, nowDir)
  const parentDir = path.dirname(full_dir); // 获取上级目录
  const relativePath = path.relative(folderPath, parentDir);

  //校验是否允许访问目录
  if (relativePath.startsWith('..')) {
    res.status(403).send({error: 'Access to parent directory is not allowed.' });
  } else {
    res.send({code:1, dir:relativePath+"\\"});
  }
  
});

app.post('/delete', (req, res) => {
  const deleteFileList = req.body.delete; 
  
  const full_dir = path.join(folderPath, deleteFileList);
  const parentDir = path.dirname(full_dir); // 获取上级目录
  const relativePath = path.relative(folderPath, parentDir);
  //校验是否允许访问目录
  if (relativePath.startsWith('..')) {
    res.status(403).send({ error: 'Access to parent directory is not allowed.' });
  } 
  else {
    //删除文件或文件夹
    try {
      fs.rmSync(full_dir, { recursive: true });
    } catch (error) {
      return res.status(500).send({ error: `Error deleting ${deleteFileList}` });
    }
    res.send({code:1, dir:relativePath+"\\"});
  }
});

app.post('/rename', (req, res) => {
  const { newFileName, file } = req.body;
  //先校验字符是否合法
  if (!newFileName || newFileName.trim() === '') {
      return res.status(400).send({ error: 'New file name cannot be empty' });
  }

  if (newFileName.indexOf('/') !== -1) {
      return res.status(400).send({ error: 'File name cannot contain "/"' });
  }

  const oldFilePath = path.join(folderPath, file);
  const parentDir = path.dirname(oldFilePath); // 获取上级目录
  const newFilePath = path.join(parentDir, newFileName);
  const relativePath = path.relative(folderPath, parentDir);
  //校验是否允许访问目录
  if (relativePath.startsWith('..')) {
    res.status(403).send({ error: 'Access to parent directory is not allowed.' });
  } 
  else {
    // 重命名文件或文件夹
    fs.rename(oldFilePath, newFilePath, (err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to rename the file' });
        }

        // Rename was successful, respond with the updated directory listing
        
        res.send({code:1, dir:relativePath+"\\"});
    });
  }
});

app.post('/newFolder', (req, res) => {
  const { newFolder,nowDir } = req.body;

  //校验新文件夹名称有没有非法字符
  if (!newFolder || newFolder.trim() === '') {
      return res.status(400).send({ error: 'Folder name cannot be empty' });
  }

  if (newFolder.indexOf('/') !== -1) {
      return res.status(400).send({ error: 'Folder name cannot contain "/"' });
  }

  //校验是否允许访问目录
  const newFilePath = path.join(folderPath, nowDir, newFolder);
  const parentDir = path.dirname(newFilePath); // 获取上级目录
  const relativePath = path.relative(folderPath, parentDir);
  if (relativePath.startsWith('..')) {
    res.status(403).send({ error: 'Access to parent directory is not allowed.' });
  } 
  else {
    fs.mkdir(newFilePath, (err) => {
      if (err) {
          return res.status(500).send({ error: 'Failed to create the folder' });
      }

      // Folder creation was successful, respond with the updated directory listing
      res.send({code:1, dir:relativePath+"\\"});
    });
  }
});


app.post("/register", (req, res) => {
	var userName = req.body.userName
	var passWord = req.body.passWord
	if (!userName || !passWord) {
		res.send({
			code: 0,
			msg: "用户名与密码为必传参数...",
		})
		return
	}
	if (userName && passWord) {
		const result = `SELECT * FROM user_account WHERE name = '${userName}'`
		conn.query(result, [userName], (err, results) => {
			if (err) throw err
			if (results.length >= 1) {
				//2、如果有相同用户名，则注册失败，用户名重复
				res.send({ code: 0, msg: "注册失败，用户名重复" })
			} else {
				const sqlStr = "insert into user_account(name,password) values(?,?)"
				conn.query(sqlStr, [userName, passWord], (err, results) => {
					if (err) throw err
					if (results.affectedRows === 1) {
						res.send({ code: 1, msg: "注册成功" })
					} else {
						res.send({ code: 0, msg: "注册失败" })
					}
				})
			}
		})
	}
 
})


app.post("/login", (req, res) => {
	var userName = req.body.userName
	var passWord = req.body.passWord
	if (!userName || !passWord) {
		res.send({
			code: 0,
			msg: "用户名与密码为必传参数...",
		})
		return
	}
	const sqlStr = "select * from user_account WHERE name=? AND password=?"
	conn.query(sqlStr, [userName, passWord], (err, result) => {
		if (err) throw err
		if (result.length > 0) {
			// 生成token
      console.log(result[0].name)
      console.log(result[0].password)
      let jwt = new Jwt({
        identity: result[0].identity,
        userName: result[0].userName,
      });
      let token = jwt.generateToken();
			
			res.send({ code: 1, msg: "登录成功", token: token })
			// 如果没有登录成功，则返回登录失败
		} else {
			// 判断token
			if (req.headers.authorization == undefined || req.headers.authorization == null) {
				if (req.headers.authorization) {
					var token = req.headers.authorization.split(" ")[1] // 获取token
				}
				jwt.verify(token, "secret", (err, decode) => {
					if (err) {
						res.send({ code: 0, msg: "登录失败" })
					}
				})
			}
		}
	})
})
