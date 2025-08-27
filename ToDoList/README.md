# ToDoList

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.2.0.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Deployment

### Live Application

🌐 **Live URL**: [https://pritampokhra29.github.io/ToDoApplication-Frontend/](https://pritampokhra29.github.io/ToDoApplication-Frontend/)

The application is automatically deployed to GitHub Pages whenever changes are pushed to the main branch.

### Build for GitHub Pages

To build the application for static hosting (GitHub Pages), use:

```bash
ng build --configuration=static --base-href="/ToDoApplication-Frontend/"
```

This creates a static build without server-side rendering, optimized for GitHub Pages deployment.

### Deployment Workflow

The application uses GitHub Actions for automatic deployment:
- **Trigger**: Push to main/master branch or manual dispatch
- **Build**: Installs dependencies, builds the static application
- **Deploy**: Automatically deploys to GitHub Pages
- **URL**: Available at the GitHub Pages URL above

## Backend Configuration

### API Integration

The application integrates with a backend API service. The API configuration is located in `src/app/api.service.ts`.

### Default Backend Settings

```typescript
private baseUrl = 'http://localhost:8080';
private tasksUrl = `${this.baseUrl}/tasks`;
private authUrl = `${this.baseUrl}/auth`;
```

### Required Backend Endpoints

The application expects the following backend endpoints:

#### Authentication
- `POST /auth/login` - User login with Basic Auth
- `POST /auth/logout` - User logout

#### Task Management
- `GET /tasks` - Get all tasks for authenticated user
- `POST /tasks` - Create a new task
- `PUT /tasks/{id}` - Update existing task
- `DELETE /tasks/{id}` - Delete task

#### User Management (Admin)
- `GET /users` - Get all users (Admin only)
- `POST /users/register` - Register new user (Admin only)
- `PUT /users/{id}` - Update user (Admin only)
- `DELETE /users/{id}` - Delete user (Admin only)

### Backend Repository

For the complete backend implementation, visit: [ToDoApplication-Backend](https://github.com/pritampokhra29/ToDoApplication-Backend)

### Running with Local Backend

1. Start the backend service on `http://localhost:8080`
2. Ensure CORS is configured to allow requests from the frontend
3. Start the frontend development server with `ng serve`

### Production Backend Configuration

For production deployment, update the `baseUrl` in `api.service.ts` to point to your production backend server:

```typescript
private baseUrl = 'https://your-backend-domain.com';
```

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
