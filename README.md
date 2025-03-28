#  Fire Circus Course Platform with Image Processing

## Project Overview
This project is a Cloudflare Workers-based platform for managing medical courses with integrated payment processing and image handling capabilities.

## Key Features
- Course management and registration
- Stripe payment integration
- Image processing and storage system
- Real-time database integration (D1)
- Object storage (R2) for processed images
- Variables API for system configuration
## Project Structure
```
medicine/
├── src/                          # Backend source code
│   ├── index.js                  # Main application entry point
│   ├── stripe.js                 # Stripe payment integration
│   ├── services/
│   │   └── imageService.js       # Image processing service
│   └── routes/
│       └── images.js             # Image-related route handlers
├── client/                       # Frontend React application
│   ├── src/
│   │   ├── components/
│   │   │   ├── calendar/         # Calendar-related components
│   │   │   │   ├── CalendarView.jsx
│   │   │   │   ├── EventForm.jsx
│   │   │   │   └── FilterBar.jsx
│   │   │   └── common/          # Shared components
│   │   │       ├── Layout.jsx
│   │   │       └── Loading.jsx
│   │   ├── pages/
│   │   │   └── Calendar.jsx     # Calendar page component
│   │   ├── services/
│   │   │   └── api.js          # API client service
│   │   ├── utils/
│   │   │   └── dateHelpers.js  # Date manipulation utilities
│   │   ├── App.jsx             # Root React component
│   │   └── main.jsx            # Frontend entry point
│   ├── vite.config.js          # Vite configuration
│   └── package.json            # Frontend dependencies
├── test/                        # Test files and assets
│   ├── images/                  # Test image assets
│   ├── videos/                  # Test video assets
│   ├── index.spec.js           # Test specifications
│   └── upload-test.js          # Upload testing utilities
├── migrations/                  # Database migrations
│   ├── 0001_initial.sql        # Initial schema
│   ├── 0002_stripe.sql         # Payment related tables
│   ├── 0003_create_images.sql  # Image metadata table
│   ├── 0004_create_variables.sql  # Variables schema
│   └── 0005_create_variables_table.sql  # Variables table
├── public/                      # Static assets
├── wrangler.jsonc              # Cloudflare Workers configuration
├── vitest.config.js            # Vitest configuration
└── package.json                # Backend dependencies
```
## Project Structure Details

The frontend application can be found in the "client" directory.

### Backend Core Files
- src/index.js - Main application entry point
- src/stripe.js - Payment processing
- src/services/imageService.js - Image handling
- src/routes/images.js - Image routes
- migrations/*.sql - Database schema

### Frontend Core Files
- client/src/main.jsx - Frontend entry point
- client/src/App.jsx - Root component
- client/src/services/api.js - API client
- client/src/components/calendar/* - Calendar components
- client/src/pages/Calendar.jsx - Calendar page

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

### Next Steps

1. **Frontend Variable Management UI**
   - Develop UI for viewing and editing variables
   - Implement validation and error handling
   - Create responsive design for all device sizes

2. **Integration Tests for Variables API**
   - Unit tests for all endpoints
   - Test required field validation
   - Test error conditions and recovery
   - Performance testing under load

3. **System Configuration Documentation**
   - Document all supported variable types
   - Create setup and configuration guides
   - Add examples for common use cases
   - Document security considerations

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

### Image Upload System
```
POST /upload
- Uploads original images to R2 storage
- Dynamically creates Cloudflare Image Resizing URLs
- Returns variant URLs for frontend display
- Associates images with courses via courseId parameter
```

#### Implementation Details

1. **Dynamic URL Construction**
   - Uses request object instead of `self.location.href`
   - Hostname extraction: `new URL(request.url).hostname`
   - URL pattern: `https://{hostname}/cdn-cgi/image/w={width},h={height},fit=crop,quality=80,format=webp/{objectKey}`
   - Supports both local development and production environments

2. **Database Structure**
   - Images are stored in the `images` table in D1
   - Schema:
     ```sql
     CREATE TABLE images (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         original_filename TEXT NOT NULL,
         r2_key TEXT NOT NULL,
         width INTEGER,
         height INTEGER,
         file_size INTEGER,
         format TEXT,
         created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
         related_course_id INTEGER,
         related_session_id INTEGER,
         FOREIGN KEY (related_course_id) REFERENCES Courses(course_id),
         FOREIGN KEY (related_session_id) REFERENCES sessions(id)
     );
     ```
   - Foreign key relationships to `Courses` and `sessions` tables

3. **Frontend Integration Points**
   - Upload Endpoint: `POST /upload` with multipart/form-data
   - Required parameters: `image` (file) and `courseId` (integer)
   - Response format:
     ```json
     {
       "variants": [
         {
           "size": "large",
           "url": "https://example.com/cdn-cgi/image/w=1200,h=800,fit=crop,quality=80,format=webp/images/...",
           "width": 1200,
           "height": 800
         },
         {
           "size": "medium",
           "url": "https://example.com/cdn-cgi/image/w=800,h=600,fit=crop,quality=80,format=webp/images/...",
           "width": 800,
           "height": 600
         },
         {
           "size": "thumbnail",
           "url": "https://example.com/cdn-cgi/image/w=300,h=200,fit=crop,quality=80,format=webp/images/...",
           "width": 300,
           "height": 200
         }
       ]
     }
     ```
   - Metadata Endpoint: `GET /image/metadata/{id}` returns full image details

4. **Key Files**
   - `src/services/imageService.js`: Core image handling service
   - `src/routes/images.js`: Route handlers for image operations
   - `migrations/0003_create_images.sql`: Database schema for images

5. **Development vs Production Considerations**
   - Local development (localhost:8787):
     - Images served through Cloudflare's Image Resizing API emulation
     - R2 is simulated locally by Miniflare
     - URLs use localhost hostname with port
   - Production:
     - Full Cloudflare Image Resizing capabilities
     - R2 bucket accessed directly through Cloudflare infrastructure
     - URLs use your custom domain
   - Consistency: Same URL format and parameters work in both environments

6. **Required Cloudflare Configuration**
   - Enable Image Resizing on your Cloudflare account
   - Configure R2 bucket permissions correctly
   - Ensure Workers have necessary bindings to R2 and D1

### Variables API
```
GET /api/variables
- Retrieve all system variables
- Returns variables with their current values

POST /api/variables
- Create new system variables
- Requires variable name and value
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
- Variables API is now fully functional with support for system configuration

