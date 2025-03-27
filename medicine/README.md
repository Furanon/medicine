# Medical Course Platform with Image Processing

## Project Overview
This project is a Cloudflare Workers-based platform for managing medical courses with integrated payment processing and image handling capabilities.

## Key Features
- Course management and registration
- Stripe payment integration
- Image processing and storage system
- Real-time database integration (D1)
- Object storage (R2) for processed images

## Project Structure
```
medicine/
├── src/
│   ├── index.js                 # Main application entry point
│   ├── stripe.js                # Stripe payment integration
│   ├── services/
│   │   └── imageService.js      # Image processing service
│   └── routes/
│       └── images.js            # Image-related route handlers
├── migrations/
│   ├── 0001_initial.sql        # Initial schema
│   ├── 0002_stripe.sql         # Payment related tables
│   └── 0003_create_images.sql  # Image metadata table
├── public/                      # Static assets
├── wrangler.jsonc              # Cloudflare Workers configuration
└── package.json
```

## Implementation Progress

### Completed Features
1. **Payment Processing**
   - Stripe integration for secure payments
   - Webhook handling for payment events
   - Transaction management

2. **Image Processing System**
   - Multi-size image processing (large, medium, thumbnail)
   - WebP conversion for optimization
   - Structured storage in R2
   - Metadata management in D1

3. **Database Schema**
   - Course and session management
   - Payment tracking
   - Image metadata storage
   - Relational integrity with foreign keys

### Next Steps for Sharp Integration

1. **Development Environment Setup**
   - Install Sharp dependencies:
     ```bash
     npm install sharp
     ```
   - Verify Node.js compatibility flags in wrangler.jsonc

2. **Local Testing**
   - Set up local development environment
   - Test image processing with sample images
   - Verify all image variants are generated correctly
   - Confirm proper storage in R2

3. **Production Deployment**
   - Review Sharp compatibility with Cloudflare Workers
   - Deploy with proper environment variables
   - Monitor performance and resource usage
   - Set up error tracking

4. **Performance Optimization**
   - Implement caching strategies
   - Optimize image processing parameters
   - Add image compression options
   - Consider implementing lazy loading

## API Endpoints

### Image Processing
```
POST /upload
- Upload and process new images
- Supports multipart/form-data
- Returns processed image variants

GET /images/:id
- Retrieve processed images
- Supports size parameter (?size=large|medium|thumbnail)

GET /image/metadata/:id
- Retrieve image metadata

POST /image/associate
- Associate images with courses/sessions
```

## Environment Configuration

Required environment variables:
```
STRIPE_PUBLISHABLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
```

## Development Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables:
   ```bash
   wrangler secret put STRIPE_SECRET_KEY
   wrangler secret put STRIPE_WEBHOOK_SECRET
   ```
4. Start development server:
   ```bash
   wrangler dev
   ```

## Testing

Test image upload:
```bash
curl -X POST http://localhost:8787/upload \
  -F "image=@/path/to/your/image.jpg" \
  -F "courseId=1"
```

## Notes
- Ensure proper error handling for image processing
- Monitor R2 storage usage
- Regular backup of image metadata
- Consider implementing image cleanup policies

