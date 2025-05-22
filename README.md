# Express Sequelize Boilerplate

A production-ready Express.js boilerplate with Sequelize ORM, comprehensive authentication, and structured project architecture.

## Features

- **Authentication System**: Complete JWT authentication with refresh tokens
- **Database Integration**: Sequelize ORM with migrations and seeding
- **Validation**: Request validation with Yup
- **Error Handling**: Comprehensive error handling system
- **File Upload**: Support for local and S3 file storage
- **Rate Limiting**: Configurable rate limiting for API protection
- **Logging**: Structured logging with Winston
- **Environment Management**: Environment-specific configurations
- **Security**: Best practices implemented for web security

## Getting Started

### Prerequisites

- Node.js 14+ and npm/yarn/pnpm
- MySQL, PostgreSQL, or another database supported by Sequelize

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/express-sequelize-boilerplate.git
cd express-sequelize-boilerplate
```

2. Install dependencies:

```bash
pnpm install
```

3. Create your environment file:

```bash
cp .env.example .env
```

4. Configure your environment variables in the `.env` file:

```
SERVER_PORT=3000
NODE_ENV=development
DB_DIALECT=mysql
DB_HOST=localhost
DB_USER=root
DB_PASS=password
DB_NAME=myapp
```

5. Run database migrations:

```bash
npx sequelize-cli db:migrate
```

6. create docker image:

```bash
$ docker run -d -p 6379:6379 --name redis redis
```

7. Start the development server:

```bash
pnpm dev
```

### Project Structure

```
├── src/
│   ├── config/              # Configuration files
│   ├── controllers/         # Request handlers
│   ├── data-access/         # Repository layer for database operations
│   ├── database/            # Database migrations and seeders
│   ├── middlewares/         # Express middlewares
│   ├── models/              # Sequelize models
│   ├── routes/              # API routes
│   ├── services/            # Business logic and external services
│   ├── utils/               # Utility functions and helpers
│   └── index.js             # Application entry point
├── .env.example             # Environment variables template
├── .sequelizerc             # Sequelize configuration
├── DEVELOPER.md             # Detailed guide for developers
└── package.json
```

## Authentication

The boilerplate includes a complete authentication system with:

- User registration and login
- JWT tokens with configurable expiration
- Refresh tokens for extended sessions
- Password reset functionality
- Role-based access control

## Adding Your Own Features

1. **Create a model**:

```bash
npx sequelize-cli model:generate --name YourModel --attributes name:string,description:text
```

2. **Create a repository**:

- Add a new file under `src/data-access/your-model/index.js`
- Extend the BaseRepository class

3. **Create a controller**:

- Add a new file under `src/controllers/your-model.controller.js`
- Use the provided example.controller.js as a reference

4. **Create routes**:

- Add a new file under `src/routes/your-model.routes.js`
- Use the provided example.routes.js as a reference

5. **Add validations**:

- Create Yup schemas for your data entities

## Customizing Authentication

The authentication system is designed to be flexible and extensible:

- Modify `src/controllers/auth.controller.js` for custom login logic
- Update `src/middlewares/auth.middleware.js` for custom token validation
- Customize `src/services/jwt.service.js` for token handling

## Environment Variables

| Variable           | Description                           | Default     | Required |
| ------------------ | ------------------------------------- | ----------- | -------- |
| SERVER_PORT        | Port on which the Express server runs | 3000        | No       |
| NODE_ENV           | Environment mode                      | development | No       |
| DB_DIALECT         | Database dialect                      | mysql       | Yes      |
| DB_HOST            | Database host                         | localhost   | Yes      |
| DB_USER            | Database username                     | -           | Yes      |
| DB_PASS            | Database password                     | -           | Yes      |
| DB_NAME            | Database name                         | -           | Yes      |
| SERVER_JWT_SECRET  | Secret for JWT tokens                 | -           | Yes      |
| SERVER_JWT_TIMEOUT | JWT token expiry time (ms)            | 600000      | No       |

## Development

For more detailed development instructions, please refer to the [DEVELOPER.md](./DEVELOPER.md) guide.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
