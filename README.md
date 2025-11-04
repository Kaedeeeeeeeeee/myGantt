# My Gantt - SaaS Project Gantt Chart Application

一个功能丰富的现代化甘特图 SaaS 应用，用于项目管理和任务跟踪。

## 架构

本项目采用前后端分离架构：

- **前端**: React 18 + TypeScript + Vite，部署在 Vercel
- **后端**: Express.js + TypeScript + Prisma，部署在 Railway/Render
- **数据库**: PostgreSQL (Supabase)

## 功能特性

- ✅ **Google 登录**: 使用 Google OAuth 2.0 进行身份验证
- ✅ **任务管理**: 创建、编辑和删除任务
- ✅ **项目管理**: 支持多个项目，每个项目独立管理任务
- ✅ **时间线视图**: 在日/周/月视图之间切换
- ✅ **拖拽操作**: 通过拖拽调整任务时间线
- ✅ **进度跟踪**: 可视化任务完成进度
- ✅ **资源分配**: 为任务分配负责人
- ✅ **数据持久化**: 数据存储在 PostgreSQL 数据库中
- ✅ **响应式设计**: 适配不同屏幕尺寸
- ✅ **多语言支持**: 支持中文、英文和日文

## 技术栈

### 前端
- **React 18** + **TypeScript**
- **Vite** - 构建工具
- **React Router** - 路由管理
- **React Query** - 数据获取和缓存
- **Axios** - HTTP 客户端
- **@react-oauth/google** - Google 登录集成
- **date-fns** - 日期处理

### 后端
- **Express.js** - Web 框架
- **TypeScript** - 类型安全
- **Prisma** - ORM 和数据库管理
- **PostgreSQL** - 关系型数据库
- **JWT** - 身份验证令牌
- **Passport.js** - Google OAuth 认证

## 项目结构

```
myGantt/
├── frontend/              # 前端项目
│   ├── src/
│   │   ├── api/           # API 调用封装
│   │   ├── components/    # React 组件
│   │   ├── contexts/      # React Contexts
│   │   ├── pages/         # 页面组件
│   │   └── utils/         # 工具函数
│   ├── package.json
│   └── vite.config.ts
├── backend/               # 后端项目
│   ├── src/
│   │   ├── config/        # 配置文件
│   │   ├── controllers/  # 控制器
│   │   ├── middleware/   # 中间件
│   │   ├── routes/       # 路由
│   │   ├── services/     # 业务逻辑
│   │   └── utils/        # 工具函数
│   ├── prisma/           # Prisma schema 和迁移
│   └── package.json
└── README.md
```

## 本地开发

### 前置要求

- Node.js 18+ 
- PostgreSQL 数据库（或 Supabase 账号）
- Google OAuth 客户端 ID

### 后端设置

1. 进入后端目录：
```bash
cd backend
```

2. 安装依赖：
```bash
npm install
```

3. 配置环境变量：
```bash
cp .env.example .env
```

编辑 `.env` 文件，填入以下配置：
```env
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5174

# 数据库连接（Supabase 提供的连接字符串）
DATABASE_URL=""

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# JWT 密钥（生产环境请使用强随机字符串）
JWT_SECRET=your-jwt-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

4. 初始化数据库：
```bash
# 生成 Prisma Client
npm run db:generate

# 推送数据库 schema（开发环境）
npm run db:push

# 或使用迁移（生产环境推荐）
npm run db:migrate
```

5. 启动开发服务器：
```bash
npm run dev
```

后端将在 `http://localhost:3000` 运行

### 前端设置

1. 进入前端目录：
```bash
cd frontend
```

2. 安装依赖：
```bash
npm install
```

3. 配置环境变量：
```bash
cp .env.example .env
```

编辑 `.env` 文件：
```env
VITE_API_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=your-google-client-id
VITE_BUY_ME_A_COFFEE_URL=https://buymeacoffee.com/yourusername  # 可选：Buy Me a Coffee 链接
```

4. 启动开发服务器：
```bash
npm run dev
```

前端将在 `http://localhost:5174` 运行

## Google OAuth 配置

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目
3. 启用 Google+ API
4. 创建 OAuth 2.0 客户端 ID：
   - 应用类型：Web 应用
   - 授权重定向 URI：
     - 开发环境：`http://localhost:5174`
     - 生产环境：你的前端域名（如 `https://yourdomain.com`）
5. 获取客户端 ID 和密钥，配置到环境变量中

## Buy Me a Coffee 配置（可选）

如果你想在用户菜单中添加 Buy Me a Coffee 选项：

1. 访问 [Buy Me a Coffee](https://www.buymeacoffee.com/) 并注册账号
2. 创建你的 Buy Me a Coffee 页面
3. 获取你的页面链接（例如：`https://buymeacoffee.com/yourusername`）
4. 在 `.env` 文件中设置 `VITE_BUY_ME_A_COFFEE_URL` 环境变量：
   ```env
   VITE_BUY_ME_A_COFFEE_URL=https://buymeacoffee.com/yourusername
   ```
5. 如果不设置此环境变量，点击 "Buy Me a Coffee" 选项会跳转到默认的 Buy Me a Coffee 首页

## 部署

### 前端部署到 Vercel

1. 将代码推送到 GitHub
2. 在 [Vercel](https://vercel.com) 中导入项目
3. 选择 `frontend` 目录作为根目录
4. 配置环境变量：
   - `VITE_API_URL`: 你的后端 API URL
   - `VITE_GOOGLE_CLIENT_ID`: Google OAuth 客户端 ID
   - `VITE_BUY_ME_A_COFFEE_URL`: (可选) Buy Me a Coffee 链接，如果不设置则使用默认链接
5. 部署

### 后端部署到 Railway

1. 在 [Railway](https://railway.app) 中创建新项目
2. 从 GitHub 导入项目，选择 `backend` 目录
3. 添加 PostgreSQL 数据库插件
4. 配置环境变量（参考后端 `.env.example`）
5. 设置构建命令：`npm install && npm run build`
6. 设置启动命令：`npm start`
7. 部署

### 数据库设置（Supabase）

1. 在 [Supabase](https://supabase.com) 创建新项目
2. 获取数据库连接字符串
3. 运行 Prisma 迁移：
```bash
cd backend
npx prisma migrate deploy
```

或使用 Supabase 的 SQL 编辑器直接运行 Prisma schema 生成的 SQL

## API 端点

### 认证
- `POST /api/auth/google` - Google OAuth 登录
- `POST /api/auth/refresh` - 刷新访问令牌
- `POST /api/auth/logout` - 登出
- `GET /api/auth/me` - 获取当前用户信息

### 项目
- `GET /api/projects` - 获取用户所有项目
- `POST /api/projects` - 创建项目
- `GET /api/projects/:id` - 获取项目详情
- `PUT /api/projects/:id` - 更新项目
- `DELETE /api/projects/:id` - 删除项目

### 任务
- `GET /api/tasks/projects/:projectId/tasks` - 获取项目任务列表
- `POST /api/tasks/projects/:projectId/tasks` - 创建任务
- `GET /api/tasks/:id` - 获取任务详情
- `PUT /api/tasks/:id` - 更新任务
- `DELETE /api/tasks/:id` - 删除任务

## 使用指南

1. **登录**: 使用 Google 账号登录
2. **创建项目**: 点击项目下拉菜单，输入项目名称创建新项目
3. **创建任务**: 点击"添加新任务"按钮或直接在甘特图上拖拽创建
4. **编辑任务**: 点击任务条打开编辑表单
5. **调整时间线**: 拖拽任务条调整开始和结束日期
6. **切换视图**: 使用日期范围控件切换不同的时间视图
7. **切换语言**: 点击右上角的地球图标切换语言

## 故障排除

### 数据库连接错误
- 检查 `DATABASE_URL` 环境变量是否正确
- 确认数据库服务是否运行
- 检查网络连接和防火墙设置

### Google OAuth 错误
- 确认 Google OAuth 客户端 ID 配置正确
- 检查重定向 URI 是否在 Google Cloud Console 中配置
- 确认前端和后端的客户端 ID 一致

### API 请求失败
- 检查后端服务是否运行
- 确认 `VITE_API_URL` 环境变量配置正确
- 检查 CORS 设置是否正确

## 许可证

MIT License
