import cors from 'cors';

// Allow requests from planted website domains
const allowedOrigins = [
  'https://planted.com',
  'https://www.planted.com',
  'https://cgjen-box.github.io',
  /^https:\/\/.*\.planted\.com$/,
  // Development origins (localhost on any port)
  /^http:\/\/localhost:\d+$/,
];

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) {
      callback(null, true);
      return;
    }

    // Check if origin is allowed
    const isAllowed = allowedOrigins.some((allowed) => {
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return allowed === origin;
    });

    if (isAllowed) {
      // Pass the origin back to set Access-Control-Allow-Origin header
      callback(null, origin);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400, // 24 hours
});
