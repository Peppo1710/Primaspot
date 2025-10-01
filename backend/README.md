# Instagram Dashboard Backend

Backend API for Instagram Influencer Analytics Dashboard with Cloudinary media storage integration.

## Features

- 📊 Instagram data scraping and analytics
- 🎨 **Cloudinary media storage** - All images and videos automatically uploaded to Cloudinary
- 🗄️ MongoDB database for data persistence
- 🔍 User search and profile management
- 📈 Engagement metrics and analytics
- 🤖 ML-powered post analysis
- 🔒 Rate limiting and security features

## Prerequisites

- Node.js >= 18.0.0
- MongoDB (local or cloud instance)
- Cloudinary account (free tier available)

## Installation

1. **Clone the repository**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the backend directory:
   ```env
   # MongoDB Configuration
   MONGODB_URI=mongodb://localhost:27017/instagram_dashboard

   # Cloudinary Configuration (REQUIRED)
   CLOUDINARY_URL=cloudinary://your_api_key:your_api_secret@your_cloud_name

   # Server Configuration
   PORT=8000
   NODE_ENV=development

   # ML Backend Configuration
   ML_API_URL=http://127.0.0.1:5000

   # CORS Configuration
   CORS_ORIGIN=http://localhost:5173
   ```

4. **Get your Cloudinary credentials**
   - Sign up at https://cloudinary.com (free tier available)
   - Go to your Console: https://cloudinary.com/console
   - Copy your `CLOUDINARY_URL` (format: `cloudinary://API_KEY:API_SECRET@CLOUD_NAME`)
   - Paste it in your `.env` file

5. **Test Cloudinary integration**
   ```bash
   npm run test:cloudinary
   ```

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:8000`

## API Endpoints

### User Management
- `GET /api/users/validate/:username` - Validate and fetch user data
- `POST /api/users/scrape/:username` - Scrape user data from Instagram
- `GET /api/users/profile/:username` - Get user profile
- `GET /api/users/posts/:username` - Get user posts
- `GET /api/users/reels/:username` - Get user reels

### Analytics
- `GET /api/users/analytics/:username` - Get post analytics
- `GET /api/users/engagement/:username` - Get engagement metrics

### Image Proxy
- `GET /api/proxy/image` - Proxy Instagram images

See `API.md` for complete API documentation.

## Cloudinary Integration

### How It Works

When you scrape Instagram data, all media is automatically uploaded to Cloudinary:

1. **Profile Pictures** → `instagram/profiles/{username}/profile_picture`
2. **Post Images** → `instagram/posts/{username}/{post_id}`
3. **Post Videos** → `instagram/posts/{username}/{post_id}_video`
4. **Reel Thumbnails** → `instagram/reels/{username}/{reel_id}_thumbnail`
5. **Reel Videos** → `instagram/reels/{username}/{reel_id}_video`

### Benefits

- ✅ Permanent storage (Instagram URLs may expire)
- ✅ Global CDN for fast delivery
- ✅ Automatic image optimization
- ✅ Format conversion (WebP, AVIF)
- ✅ Organized folder structure

### Testing

Run the test script to verify Cloudinary is working:

```bash
npm run test:cloudinary
```

### Monitoring

View your uploaded media in the Cloudinary Console:
https://cloudinary.com/console/media_library

See `CLOUDINARY_INTEGRATION.md` for detailed documentation.

## Project Structure

```
backend/
├── config/
│   └── database.js          # MongoDB connection
├── src/
│   ├── controllers/
│   │   └── UserController.js    # User endpoints
│   ├── middleware/
│   │   └── errorHandler.js      # Error handling
│   ├── models/
│   │   ├── profiles.js           # Profile schema
│   │   ├── posts.js              # Posts schema
│   │   ├── reels.js              # Reels schema
│   │   └── instagramData.js      # Raw Instagram data
│   ├── routes/
│   │   ├── userRoutes.js         # User routes
│   │   └── imageProxy.js         # Image proxy routes
│   ├── services/
│   │   ├── InstagramService.js   # Instagram scraping
│   │   ├── CloudinaryService.js  # Cloudinary uploads ⭐
│   │   └── DatabaseService.js    # Database operations
│   └── utils/
│       ├── logger.js             # Winston logger
│       ├── ApiError.js           # Error handling
│       └── ApiResponse.js        # Response formatting
├── scripts/
│   └── test-cloudinary.js       # Cloudinary test script
├── server.js                     # Express server
├── package.json
└── README.md
```

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `MONGODB_URI` | MongoDB connection string | Yes | - |
| `CLOUDINARY_URL` | Cloudinary credentials | Yes | - |
| `PORT` | Server port | No | 8000 |
| `NODE_ENV` | Environment (development/production) | No | development |
| `ML_API_URL` | ML backend URL | No | http://127.0.0.1:5000 |
| `CORS_ORIGIN` | Frontend URL for CORS | No | http://localhost:5173 |

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start development server with nodemon |
| `npm test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:cloudinary` | Test Cloudinary integration |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint errors |

## Database Models

### Profile
- Username, full name, bio
- Profile picture URL (Cloudinary)
- Followers, following, posts count
- Account type, verification status

### Posts
- Post ID, URL, caption
- Image URL (Cloudinary)
- Video URL (Cloudinary)
- Likes, comments, post date
- Hashtags, tagged users

### Reels
- Reel ID, URL, caption
- Thumbnail URL (Cloudinary)
- Video URL (Cloudinary)
- Views, likes, comments
- Duration

### Instagram Data (Raw)
- All scraped data in raw format
- Used for analytics and ML processing

## Error Handling

The application includes comprehensive error handling:

- API errors with status codes
- Database errors
- Cloudinary upload failures (with fallback to original URLs)
- Rate limiting
- Request validation

## Rate Limiting

- Rate limit check before scraping
- 4-hour cooldown between scrapes per user
- Instagram API rate limits respected

## Security Features

- Helmet.js for security headers
- CORS configuration
- Rate limiting
- Request validation
- Error sanitization

## Logging

Winston logger with:
- Console output (development)
- File output (production)
- Error tracking
- Request logging with Morgan

Logs are stored in:
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only

## Troubleshooting

### Cloudinary Upload Fails

**Error**: "Cloudinary configuration missing"
- Ensure `CLOUDINARY_URL` is set in `.env`

**Error**: "401 Unauthorized"
- Verify Cloudinary credentials are correct
- Check that your Cloudinary account is active

### MongoDB Connection Issues

**Error**: "MongoNetworkError"
- Check MongoDB is running
- Verify `MONGODB_URI` is correct

### Port Already in Use

**Error**: "EADDRINUSE"
- Change `PORT` in `.env`
- Or kill the process using the port

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly (including `npm run test:cloudinary`)
5. Submit a pull request

## License

MIT

## Support

For issues or questions:
- Check the documentation in `CLOUDINARY_INTEGRATION.md`
- Review API documentation in `API.md`
- Check application logs in `logs/` directory
- Cloudinary docs: https://cloudinary.com/documentation

