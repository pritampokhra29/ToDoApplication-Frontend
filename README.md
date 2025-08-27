# ToDo Application Frontend

A comprehensive Angular-based ToDo application with user management, task tracking, and administrative features.

## 🌐 Live Application

**Deployed URL**: [https://pritampokhra29.github.io/ToDoApplication-Frontend/](https://pritampokhra29.github.io/ToDoApplication-Frontend/)

The application is automatically deployed to GitHub Pages using GitHub Actions.

## 📁 Project Structure

```
ToDoApplication-Frontend/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions deployment workflow
├── ToDoList/                   # Angular application directory
│   ├── src/
│   │   ├── app/
│   │   │   ├── api.service.ts  # Backend API integration
│   │   │   ├── app.ts          # Main application component
│   │   │   └── ...
│   │   └── ...
│   ├── angular.json           # Angular configuration
│   ├── package.json           # Dependencies and scripts
│   └── README.md             # Detailed application documentation
└── README.md                 # This file
```

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/pritampokhra29/ToDoApplication-Frontend.git
   cd ToDoApplication-Frontend/ToDoList
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm start
   ```

4. **Open application**
   Navigate to `http://localhost:4200/`

## 🔧 Build & Deployment

### Local Build
```bash
cd ToDoList
npm run build
```

### Static Build for GitHub Pages
```bash
cd ToDoList
npm run build -- --configuration=static --base-href="/ToDoApplication-Frontend/"
```

### Automatic Deployment
- Pushes to `main` or `master` branch trigger automatic deployment
- GitHub Actions builds and deploys to GitHub Pages
- No manual deployment needed

## 🔗 Backend Integration

### Backend Repository
[ToDoApplication-Backend](https://github.com/pritampokhra29/ToDoApplication-Backend)

### API Configuration
- **Local Development**: `http://localhost:8080`
- **Production**: Configure in `src/app/api.service.ts`

### Required Backend Endpoints
- **Authentication**: `/auth/login`, `/auth/logout`
- **Tasks**: `/tasks` (GET, POST, PUT, DELETE)
- **Users**: `/users` (Admin operations)

## 🛠️ Technology Stack

- **Framework**: Angular 20.2.0
- **Language**: TypeScript
- **Styling**: SCSS
- **Build Tool**: Angular CLI
- **Deployment**: GitHub Pages
- **CI/CD**: GitHub Actions

## 📋 Features

- ✅ Task Management (Create, Read, Update, Delete)
- ✅ User Authentication & Authorization
- ✅ Admin Panel for User Management
- ✅ Task Status Tracking (Pending, In Progress, Completed)
- ✅ Task Filtering and Search
- ✅ Due Date Management
- ✅ Priority Levels
- ✅ Responsive Design
- ✅ Real-time Updates

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 📞 Support

For detailed documentation and technical details, see [ToDoList/README.md](./ToDoList/README.md).

---

**Repository**: [pritampokhra29/ToDoApplication-Frontend](https://github.com/pritampokhra29/ToDoApplication-Frontend)