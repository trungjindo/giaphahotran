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
const hinhDaiDienDir = path.join(storageBase, 'hinh_dai_dien');
const tinTucDir = path.join(storageBase, 'tin_tuc');

[storageBase, hinhDaiDienDir, tinTucDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const type = req.body.type; // 'avatar' or 'news'
    if (type === 'news') {
      cb(null, tinTucDir);
    } else {
      cb(null, hinhDaiDienDir);
    }
  },
  filename: function (req, file, cb) {
    // Generate safe filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, uniqueSuffix + '-' + safeName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
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
    const type = req.body.type;
    const folder = type === 'news' ? 'tin_tuc' : 'hinh_dai_dien';
    const imageUrl = `/storage/${folder}/${req.file.filename}`;
    
    res.json({ success: true, url: imageUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Backend Server đang chạy tại http://localhost:${port}`);
});
