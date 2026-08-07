import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Ensure storage directories exist inside 'public/storage'
const storageBase = path.join(__dirname, 'public', 'storage');

// Ánh xạ type -> thư mục lưu trữ. 'avatar' là mặc định khi type không khớp mục nào.
const TYPE_FOLDERS = {
  avatar: 'hinh_dai_dien',
  news: 'tin_tuc',
  receipt: 'chung_tu',
  banner: 'banner',
  gallery: 'thu_vien',
  about: 'gioi_thieu'
};

Object.values(TYPE_FOLDERS).forEach(folder => {
  const dir = path.join(storageBase, folder);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure Multer
// Lưu ý: type đọc từ query string (req.query), không phải req.body — vì multer/busboy
// chỉ parse xong các field text trong multipart SAU field file nếu client gửi file trước,
// khiến req.body.type có thể chưa sẵn sàng tại thời điểm callback destination() chạy.
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const folder = TYPE_FOLDERS[req.query.type] || TYPE_FOLDERS.avatar;
    cb(null, path.join(storageBase, folder));
  },
  filename: function (req, file, cb) {
    // Generate safe filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, uniqueSuffix + '-' + safeName);
  }
});

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10MB

const upload = multer({
  storage: storage,
  limits: { fileSize: MAX_UPLOAD_SIZE },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ cho phép tải lên định dạng hình ảnh!'));
    }
  }
});

app.post('/api/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Không có file nào được tải lên.' });
    }

    // Create the public URL (since 'public' is the root for Vite dev server)
    const folder = TYPE_FOLDERS[req.query.type] || TYPE_FOLDERS.avatar;
    const imageUrl = `/storage/${folder}/${req.file.filename}`;

    res.json({ success: true, url: imageUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Xử lý lỗi từ Multer (VD: file vượt quá dung lượng cho phép) để trả về JSON thay vì lỗi mặc định
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: `File vượt quá dung lượng tối đa ${MAX_UPLOAD_SIZE / (1024 * 1024)}MB!` });
  }
  if (err) {
    return res.status(400).json({ error: err.message || 'Có lỗi xảy ra khi tải file lên.' });
  }
  next();
});

app.listen(port, () => {
  console.log(`Backend Server đang chạy tại http://localhost:${port}`);
});
