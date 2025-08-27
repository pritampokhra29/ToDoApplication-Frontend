# ToDoApplication-Frontend-ReactJS

A modern, full-featured Todo application built with React.js and TypeScript, implementing the same functionality as the Angular version from the RELEASE_1.0.0 branch.

![Login Screen](https://github.com/user-attachments/assets/fa116b10-b69a-4e3d-8702-b2d3ea5b8ba4)

## Features

### 🔐 Authentication System
- User login with validation
- JWT token management
- Role-based access control (Admin/User)
- Session persistence with localStorage

### 📋 Task Management
- Create, read, update, delete tasks
- Task status tracking (Pending, In Progress, Completed)
- Priority levels (High, Medium, Low)
- Categories and tags
- Due dates with overdue detection
- Task search and filtering
- Bulk operations

### 👥 User Management (Admin Only)
- User registration and management
- Role assignment (Admin/User)
- User status control (Active/Inactive)
- User editing and deletion

### 📊 Dashboard & Analytics
- Task statistics and metrics
- Visual charts for task distribution
- Recent activity tracking
- Progress monitoring

### 🎨 Enhanced UI/UX
- Modern, responsive design
- Beautiful gradient backgrounds
- Real-time form validation
- Loading states and error handling
- Success/error notifications
- Accessibility features

## Technology Stack

- **Frontend Framework**: React.js 18 with TypeScript
- **HTTP Client**: Axios for API communication
- **Styling**: CSS3 with modern features (flexbox, grid, backdrop-filter)
- **Validation**: Custom validation service
- **State Management**: React Hooks (useState, useEffect)
- **Build Tool**: Create React App
- **Package Manager**: npm

## Architecture

### Component Structure
```
src/
├── App.tsx                 # Main application component
├── App.css                 # Enhanced styling
├── services/
│   ├── apiService.ts       # Backend API communication
│   └── validationService.ts # Form validation logic
└── ...
```

### Key Services

#### API Service
- Centralized HTTP client with Axios
- Automatic JWT token handling
- Error handling and retry logic
- Support for all backend endpoints:
  - Authentication (login, logout)
  - Task management (CRUD operations)
  - User management (Admin operations)
  - Dashboard statistics

#### Validation Service
- Real-time form validation
- Comprehensive validation rules:
  - Username: 3-50 characters, alphanumeric + underscore
  - Email: Valid format, max 100 characters
  - Password: 6-100 characters with complexity requirements
  - Task fields: Title, description, dates, etc.

## Backend API Compatibility

This React.js application is fully compatible with the existing backend API:

### Authentication Endpoints
- `POST /auth/login` - User login
- `POST /auth/register` - User registration (Admin only)

### Task Management Endpoints
- `GET /tasks` - Get all tasks
- `POST /tasks` - Create new task
- `POST /tasks/update` - Update task
- `POST /tasks/delete` - Delete task
- `POST /tasks/get` - Get specific task
- `GET /tasks/categories` - Get task categories

### User Management Endpoints (Admin)
- `GET /auth/admin/users` - Get all users
- `POST /auth/admin/users/{id}` - Update user
- `DELETE /auth/admin/users/{id}` - Delete user
- `GET /auth/users/active` - Get active users

### Dashboard Endpoints
- `GET /dashboard/stats` - Get dashboard statistics
- `GET /dashboard/analytics` - Get analytics data

## Installation & Setup

### Prerequisites
- Node.js 16+ and npm
- Backend server running on `http://localhost:8080`

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd todoapplication-reactjs

# Install dependencies
npm install

# Start development server
npm start
```

### Available Scripts
```bash
npm start          # Runs the app in development mode
npm run build      # Builds the app for production
npm test           # Launches the test runner
npm run eject      # Ejects from Create React App (one-way operation)
```

### Environment Configuration

The application uses different API endpoints for development and production:

#### Environment Files
- `.env.development` - Development environment (localhost backend)
- `.env.production` - Production environment (deployed backend)
- `.env` - Default fallback environment

#### Environment Variables
```bash
# Development (.env.development)
REACT_APP_API_URL=http://localhost:8080
REACT_APP_ENVIRONMENT=development

# Production (.env.production)
REACT_APP_API_URL=https://todoapplication-wlvh.onrender.com
REACT_APP_ENVIRONMENT=production
```

#### Usage
- **Development**: `npm start` - Uses `.env.development`
- **Production Build**: `npm run build` - Uses `.env.production`
- **Custom Environment**: Set `NODE_ENV=production npm start` to use production API in development

## Usage

### Default Login Credentials
- **Username**: `admin`
- **Password**: `admin123`

### Application Views

#### Tasks View
- View all tasks in a responsive grid layout
- Search tasks by title, description, or category
- Filter by status, priority, and category
- Create, edit, and delete tasks
- Mark tasks as complete
- Visual indicators for overdue tasks

#### Dashboard View
- Overview statistics (total, completed, pending, in-progress, overdue)
- Tasks breakdown by category and priority
- Visual charts and metrics
- Recent activity tracking

#### Admin View (Admin Users Only)
- User management interface
- Create new users
- Edit user details and roles
- Activate/deactivate users
- Delete users

## Features Comparison with Angular Version

| Feature | Angular Version | React.js Version | Status |
|---------|----------------|------------------|---------|
| Authentication | ✅ | ✅ | Complete |
| Task CRUD | ✅ | ✅ | Complete |
| Task Filtering | ✅ | ✅ | Complete |
| User Management | ✅ | ✅ | Complete |
| Dashboard | ✅ | ✅ | Complete |
| Validation | ✅ | ✅ | Complete |
| Responsive Design | ✅ | ✅ | Complete |
| Role-based Access | ✅ | ✅ | Complete |

## Development Notes

### State Management
- Uses React hooks for state management
- No external state management library required
- Local component state with prop drilling where needed

### Error Handling
- Comprehensive error boundaries
- API error handling with user-friendly messages
- Network error detection and retry logic

### Performance Optimizations
- Functional components with hooks
- Minimal re-renders with proper dependency arrays
- Efficient list rendering with keys
- Image optimization and code splitting ready

### Future Enhancements
- Task creation and editing modals
- User creation and editing modals
- Real-time updates with WebSocket
- Drag-and-drop task management
- Advanced filtering options
- File attachments for tasks
- Task comments and collaboration
- Push notifications

## Browser Support

- Chrome 88+
- Firefox 85+
- Safari 14+
- Edge 88+

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is part of the ToDoApplication suite and follows the same licensing terms.

## Screenshots

### Login Screen
![Login Screen](https://github.com/user-attachments/assets/fa116b10-b69a-4e3d-8702-b2d3ea5b8ba4)

The application features a beautiful, modern login interface with:
- Gradient background design
- Clean, centered login form
- Real-time validation feedback
- Responsive design for all devices

### Key Features Implemented
- ✅ **Complete UI/UX**: Modern design matching the Angular version
- ✅ **Authentication**: JWT-based login system
- ✅ **Task Management**: Full CRUD operations
- ✅ **Admin Panel**: User management for administrators
- ✅ **Dashboard**: Statistics and analytics
- ✅ **Validation**: Real-time form validation
- ✅ **Responsive**: Mobile-first responsive design
- ✅ **Accessibility**: WCAG compliant interface

---

This React.js implementation provides the same robust functionality as the Angular version while leveraging React's ecosystem and modern development practices.