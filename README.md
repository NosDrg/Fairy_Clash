# ⚔️ Fairytale Clash

> Game đấu thẻ bài theo thời gian thực lấy cảm hứng từ các câu chuyện cổ tích. Triệu hồi tướng, phá tháp địch và giành chiến thắng trong 3 phút!

---

## 📋 Yêu cầu hệ thống

| Công cụ | Phiên bản tối thiểu |
|---|---|
| [Node.js](https://nodejs.org/) | v18+ |
| [MongoDB](https://www.mongodb.com/try/download/community) | v6+ (chạy local) |
| npm / pnpm | npm v9+ hoặc pnpm v8+ |

---

## ⚙️ Cấu hình môi trường

### 1. Clone dự án

```bash
git clone https://github.com/<your-username>/GameCNPM.git
cd GameCNPM
```

### 2. Cấu hình biến môi trường cho Server

Tạo file `.env` trong thư mục `server/`:

```bash
# server/.env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/fairytale_clash
JWT_SECRET=your_super_secret_key_123
```

> ⚠️ **Lưu ý:** Thay `your_super_secret_key_123` bằng một chuỗi bí mật ngẫu nhiên, đủ dài (≥ 32 ký tự) trước khi triển khai thực tế.

### 3. Cài đặt dependencies

**Frontend (thư mục gốc):**
```bash
npm install
# hoặc nếu dùng pnpm:
pnpm install
```

**Backend (thư mục `server/`):**
```bash
cd server
npm install
cd ..
```

### 4. Khởi động MongoDB

Đảm bảo MongoDB Community Server đang chạy trên máy local:

```bash
# Windows (chạy với quyền Admin, hoặc dùng MongoDB Compass)
net start MongoDB

# macOS / Linux
brew services start mongodb-community
# hoặc
sudo systemctl start mongod
```

### 5. Seed dữ liệu thẻ bài (chạy một lần)

Lệnh này tạo bộ thẻ mẫu phe **Snow White** vào database:

```bash
cd server
npm run seed
```

Kết quả thành công:
```
Connected to MongoDB for seeding...
✅ Successfully seeded Snow White cards!
```

---

## 🚀 Khởi động ứng dụng

Mở **2 terminal** và chạy đồng thời:

**Terminal 1 – Backend Server:**
```bash
cd server
npm run dev
# Server chạy tại: http://localhost:5000
```

**Terminal 2 – Frontend:**
```bash
# Từ thư mục gốc
npm run dev
# Ứng dụng chạy tại: http://localhost:5173
```

---

## 🔐 Đăng ký & Đăng nhập

Khi truy cập ứng dụng lần đầu, bạn cần tạo tài khoản trước khi vào game.

### Đăng ký tài khoản mới

1. Mở trình duyệt tại `http://localhost:5173`
2. Chọn tab **"Register"** (Đăng ký)
3. Nhập **Username** và **Password** mong muốn
4. Nhấn **"Register"** – hệ thống sẽ tạo tài khoản và chuyển sang màn hình đăng nhập

> ℹ️ Username phải là duy nhất. Nếu username đã tồn tại, hệ thống sẽ báo lỗi.

### Đăng nhập

1. Chọn tab **"Login"** (Đăng nhập)
2. Nhập **Username** và **Password** đã đăng ký
3. Nhấn **"Login"** – sau khi xác thực thành công, token JWT sẽ được lưu và bạn được chuyển vào màn hình chính

### API Authentication (tham khảo)

| Method | Endpoint | Body | Mô tả |
|---|---|---|---|
| `POST` | `/api/auth/register` | `{ username, password }` | Tạo tài khoản mới |
| `POST` | `/api/auth/login` | `{ username, password }` | Đăng nhập, nhận JWT token |

---

## 🎮 Cách chơi

Sau khi đăng nhập thành công:

1. **Chọn bộ bài** – Vào **Deck Builder** để tạo bộ 8 thẻ từ kho thẻ bài của mình
2. **Tìm trận** – Nhấn **"Find Match"** để ghép cặp với người chơi khác qua WebSocket
3. **Chiến đấu** – Kéo thả thẻ bài xuống chiến trường để triệu hồi tướng / kỹ năng
4. **Mục tiêu** – Phá hủy **King Tower** của địch trước khi hết 3 phút để giành chiến thắng

### Hệ thống Fairy Dust (Mana)

- Mana tự động hồi phục theo thời gian (tối đa **10 điểm**)
- Mỗi thẻ bài có **chỉ số Cost** – chỉ có thể triệu hồi khi đủ mana
- Trong **phút cuối (Overtime)**, tốc độ hồi mana tăng gấp đôi

---

## 📁 Cấu trúc dự án

```
GameCNPM/
├── src/                    # Frontend (React + TypeScript + Vite)
│   └── app/
│       ├── App.tsx         # Điểm vào chính, quản lý auth & routing
│       ├── components/     # Các component game (BattleEntity, BattleEffects, ...)
│       └── utils.ts        # Hàm tiện ích
├── server/                 # Backend (Node.js + Express + Socket.IO)
│   ├── index.js            # Entry point server
│   ├── routes/
│   │   └── auth.js         # API đăng ký / đăng nhập (JWT)
│   ├── models/
│   │   ├── User.js         # Schema người dùng (bcrypt password)
│   │   └── Card.js         # Schema thẻ bài
│   ├── game/               # Logic game server-side
│   │   └── Troop.js        # Hành vi tướng / unit
│   ├── seed.js             # Script khởi tạo dữ liệu mẫu
│   └── .env                # ⚠️ KHÔNG commit file này lên Git
├── index.html
├── package.json
└── vite.config.ts
```

---

## 🛠️ Troubleshooting

**Lỗi `Cannot connect to MongoDB`**
→ Kiểm tra MongoDB đang chạy: `net start MongoDB` (Windows) hoặc `sudo systemctl start mongod` (Linux)

**Lỗi `Username already exists`**
→ Username đã được sử dụng, hãy chọn username khác

**Frontend không kết nối được Server**
→ Đảm bảo server backend đang chạy ở port `5000` và không bị firewall chặn

**Token hết hạn / bị văng ra**
→ JWT token có thời hạn **1 ngày**. Đăng nhập lại để lấy token mới