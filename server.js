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
// 处理post请求参数
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json());


// Set up the middleware for handling file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 动态获取上传路径
    const folderPath = 'E:\\研1上\\网络攻防基础\\project1\\uploads';
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

// Define a route for file uploads
app.post('/upload', upload.single('file'), (req, res) => {
  if (req.file) {

    console.log(req.body.path);
    console.log(req.file.path);
    const uploadedFilePath = req.file.path; // 获取上传的文件临时路径


    // 构建目标路径，假设你要将文件移动到 /uploads 目录下
    const folderPath = 'E:\\研1上\\网络攻防基础\\project1\\uploads';
    const targetDirectory = path.join(folderPath, req.body.path);
    const targetFilePath = path.join(targetDirectory, req.file.originalname);


    fs.rename(uploadedFilePath, targetFilePath, (err) => {
      if (err) {
        console.error('文件移动失败', err);
        res.json({ message: '文件移动失败' });
      } else {
        console.log('文件移动成功');
        res.json({ message: '文件上传成功' });
      }
    });
  } else {
    res.json({ message: '文件上传失败' });
  }
});

app.post('/download', (req, res) => {
  //console.log(req.body.filename);
  const filename = req.body.filename; // Assuming the filename is sent in the request body
  //res.download(`uploads/${filename}`);
  const folderPath = 'E:\\研1上\\网络攻防基础\\project1\\uploads';
  res.download(path.join(folderPath, filename));
});

app.post('/show_file', (req, res) => {
  // 指定本地文件夹的路径
  folderPath = 'E:\\研1上\\网络攻防基础\\project1\\uploads'; // 请替换成实际文件夹的路径
  //传入的path
  const curDir = req.body.curDir;
  folderPath =path.join(folderPath, curDir);

  // 读取文件夹中的文件列表
  fs.readdir(folderPath, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Unable to read folder contents.' });
    }

    const data = { files: {} };

    // 循环处理每个文件
    files.forEach((fileName) => {
      //只挂载upload这一个文件夹
      const filePath = path.join(folderPath, fileName);
      const relativePath = path.relative("E:\\研1上\\网络攻防基础\\project1\\uploads", filePath);
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

    res.json(data);
  });
});

app.post('/goback', (req, res) => {
  //console.log(req.body.filename);
  const nowDir = req.body.nowDir; // Assuming the filename is sent in the request body
  //res.download(`uploads/${filename}`);
  const folderPath = 'E:\\研1上\\网络攻防基础\\project1\\uploads';
  full_dir=path.join(folderPath, nowDir)
  const parentDir = path.dirname(full_dir); // 获取上级目录
  const relativePath = path.relative(folderPath, parentDir);
  res.send(relativePath+"\\");
});

app.post('/delete', (req, res) => {
  const deleteFileList = req.body.delete; // Assuming 'delete' is an array of file/folder names to be deleted
  //console.log(deleteFileList);

  folderPath = 'E:\\研1上\\网络攻防基础\\project1\\uploads'; // 请替换成实际文件夹的路径

  
  const full_dir = path.join(folderPath, deleteFileList);
  try {
    fs.rmSync(full_dir, { recursive: true });
  } catch (error) {
    return res.status(500).json({ error: `Error deleting ${deleteFileList}` });
  }
  const parentDir = path.dirname(full_dir); // 获取上级目录
  const relativePath = path.relative(folderPath, parentDir);
  res.send(relativePath+"\\");
  //res.status(200).json({ message: 'Files deleted successfully' });
});

app.post('/rename', (req, res) => {
  const { newFileName, file } = req.body;

  if (!newFileName || newFileName.trim() === '') {
      return res.status(400).json({ error: 'New file name cannot be empty' });
  }

  if (newFileName.indexOf('/') !== -1) {
      return res.status(400).json({ error: 'File name cannot contain "/"' });
  }

  folderPath = 'E:\\研1上\\网络攻防基础\\project1\\uploads';

  // Construct the old and new file paths
  const oldFilePath = path.join(folderPath, file);
  const newFilePath = path.join(folderPath, newFileName);

  fs.rename(oldFilePath, newFilePath, (err) => {
      if (err) {
          return res.status(500).json({ error: 'Failed to rename the file' });
      }

      // Rename was successful, respond with the updated directory listing
      const parentDir = path.dirname(newFilePath); // 获取上级目录
      const relativePath = path.relative(folderPath, parentDir);
      const files = relativePath+"\\"
      console.log(files);
      res.send(relativePath+"\\");
  });
  
});

app.post('/newFolder', (req, res) => {
  const { newFolder,nowDir } = req.body;

  if (!newFolder || newFolder.trim() === '') {
      return res.status(400).json({ error: 'Folder name cannot be empty' });
  }

  if (newFolder.indexOf('/') !== -1) {
      return res.status(400).json({ error: 'Folder name cannot contain "/"' });
  }

  // Construct the path for the new folder
  folderPath = 'E:\\研1上\\网络攻防基础\\project1\\uploads';

  const newFilePath = path.join(folderPath, nowDir, newFolder);

  fs.mkdir(newFilePath, (err) => {
      if (err) {
          return res.status(500).json({ error: 'Failed to create the folder' });
      }

      // Folder creation was successful, respond with the updated directory listing
      const parentDir = path.dirname(newFilePath); // 获取上级目录
      const relativePath = path.relative(folderPath, parentDir);
      const files = relativePath+"\\"
      console.log(files);
      res.send(relativePath+"\\");
  });
});