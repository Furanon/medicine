# FireStream: Live Performance Streaming System

## 1. Project Overview

FireStream is a live streaming platform designed for the Medicine Fire Circus to broadcast weekly performances to registered viewers. The system integrates with the existing application infrastructure, utilizing Cloudflare's technology stack for efficient, scalable content delivery.

**Key Features:**
- Performance scheduling with calendar integration
- Viewer registration for specific performances
- Live broadcasting with real-time streaming
- Automated notifications for registered viewers
- Recording archival for on-demand viewing
- Analytics for performance engagement

## 2. System Architecture

FireStream leverages a serverless architecture built on Cloudflare Workers with these components:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Frontend App   │◄───►│  Worker API     │◄───►│  Cloudflare     │
│  (Calendar,     │     │  (Authentication,│     │  Stream         │
│   Registration, │     │   DB Operations) │     │  (Live Video)   │
│   Video Player) │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                              │
                              ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │                 │     │                 │
                        │  D1 Database    │     │  R2 Storage     │
                        │  (User Data,    │     │  (Video         │
                        │   Performances, │     │   Archives)     │
                        │   Registrations)│     │                 │
                        └─────────────────┘     └─────────────────┘
```

## 3. Database Schema

```sql
-- Performance Schedule
CREATE TABLE performances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    scheduled_time DATETIME NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    stream_key TEXT,          -- For the broadcaster
    stream_id TEXT,           -- Cloudflare Stream ID
    status TEXT DEFAULT 'scheduled', -- scheduled, live, ended
    thumbnail_r2_key TEXT,    -- Thumbnail image in R2
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Viewer Registrations
CREATE TABLE performance_viewers (
    performance_id INTEGER REFERENCES performances(id),
    user_id INTEGER REFERENCES users(id),
    registration_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    notification_preferences TEXT DEFAULT '{"email":true,"sms":false,"browser":true}',
    PRIMARY KEY (performance_id, user_id)
);

-- Performance Analytics
CREATE TABLE performance_analytics (
    performance_id INTEGER REFERENCES performances(id),
    peak_viewers INTEGER DEFAULT 0,
    total_views INTEGER DEFAULT 0,
    average_watch_time INTEGER DEFAULT 0,
    countries TEXT, -- JSON string of country counts
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 4. API Endpoints

### Organizer Endpoints
```
POST /api/performances
  - Create new performance slot
  - Returns: performance details with stream key

PUT /api/performances/:id
  - Update performance details
  - Returns: updated performance

POST /api/performances/:id/start
  - Start the broadcast
  - Returns: stream status

POST /api/performances/:id/end
  - End the broadcast
  - Returns: recording details

GET /api/performances/analytics
  - Get performance analytics
  - Returns: viewer count, engagement metrics
```

### Viewer Endpoints
```
GET /api/performances
  - List upcoming performances
  - Optional params: startDate, endDate
  - Returns: array of performances

POST /api/performances/:id/register
  - Register as a viewer
  - Returns: registration confirmation

DELETE /api/performances/:id/register
  - Unregister from a performance
  - Returns: success status

GET /api/performances/:id/stream
  - Get authenticated stream URL
  - Returns: playback URL with token
```

### Notification Endpoints
```
POST /api/notifications/settings
  - Update notification preferences
  - Returns: updated settings

GET /api/performances/:id/notifications
  - Get specific performance notifications
  - Returns: array of notifications
```

## 5. Implementation Steps

1. **Database Setup** (Week 1)
   - Create the performances and registration tables
   - Implement data migration for existing users
   - Setup analytics tables

2. **Core API Implementation** (Week 2)
   - Build performance CRUD operations
   - Implement registration system
   - Create authentication middleware

3. **Cloudflare Stream Integration** (Week 3)
   - Set up Stream API connections
   - Configure RTMP ingestion endpoints
   - Implement stream key management
   - Test live streaming capabilities

4. **Frontend Calendar Development** (Week 4)
   - Build performance calendar interface
   - Create registration workflow
   - Implement viewer dashboard

5. **Video Player Integration** (Week 5)
   - Build customized video player
   - Implement adaptive streaming
   - Add viewer analytics tracking

6. **Notification System** (Week 6)
   - Implement notification service
   - Configure scheduled notifications
   - Set up real-time alerts

7. **Testing and Optimization** (Week 7)
   - Conduct load testing for concurrent viewers
   - Optimize streaming parameters
   - Test across various devices and connections

8. **Launch Preparation** (Week 8)
   - Documentation for organizers
   - User guides for viewers
   - Final security audit

## 6. Technical Components

### Streaming Service
Utilizing Cloudflare Stream for:
- RTMP ingestion for broadcasters
- HLS delivery for viewers
- Adaptive bitrate streaming
- Automatic recording
- DRM protection (optional)

```javascript
// Example: Setting up a stream
async function createStreamForPerformance(performanceId, title) {
  const { result } = await fetch('https://api.cloudflare.com/client/v4/stream/live_inputs', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      meta: { performanceId },
      recording: { mode: 'automatic', timeoutSeconds: 10 },
      allowedOrigins: ['yourdomain.com'],
      requireSignedURLs: true
    })
  }).then(r => r.json());
  
  // Update performance with stream details
  await env.DB.prepare(
    'UPDATE performances SET stream_key = ?, stream_id = ? WHERE id = ?'
  ).bind(result.rtmps.streamKey, result.uid, performanceId).run();
  
  return result;
}
```

### Authentication System
- JWT-based authentication for viewers
- Signed URLs for stream access
- Role-based permissions (organizer vs. viewer)

### Calendar Integration
- Interactive calendar with performance slots
- Registration status indicators
- Custom views (week, month, agenda)
- iCal export for registered performances

## 7. Streaming Flow

1. **Pre-broadcast**
   - Organizer creates performance in calendar
   - System generates unique stream key
   - Viewers register for the performance
   - 24h and 1h reminder notifications sent

2. **Broadcast Start**
   - Organizer uses OBS/streaming software with stream key
   - Worker detects stream start and updates performance status
   - Notification sent to all registered viewers
   - Stream becomes available to authenticated viewers

3. **During Broadcast**
   - Adaptive streaming based on viewer bandwidth
   - Real-time analytics tracked (viewer count, engagement)
   - Chat/reaction system available (optional feature)

4. **Post-broadcast**
   - Stream automatically recorded
   - Recording processed for on-demand viewing
   - Performance marked as "completed"
   - Analytics summarized and stored

```
┌────────────┐       ┌────────────┐      ┌────────────┐      ┌─────────────┐
│            │       │            │      │            │      │             │
│  Schedule  │──────►│  Prepare   │─────►│  Broadcast │─────►│  Archive    │
│            │       │            │      │            │      │             │
└────────────┘       └────────────┘      └────────────┘      └─────────────┘
      │                    │                   │                    │
      ▼                    ▼                   ▼                    ▼
┌────────────┐       ┌────────────┐      ┌────────────┐      ┌─────────────┐
│            │       │            │      │            │      │             │
│  Register  │       │  Notify    │      │  Watch     │      │  Analytics  │
│  Viewers   │       │  Viewers   │      │  Stream    │      │  Review     │
│            │       │            │      │            │      │             │
└────────────┘       └────────────┘      └────────────┘      └─────────────┘
```

## 8. Frontend Integration

### Calendar Component
```javascript
// Calendar integration example
function PerformanceCalendar() {
  const [performances, setPerformances] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  useEffect(() => {
    // Fetch performances for the selected month
    fetchPerformances(selectedDate);
  }, [selectedDate]);
  
  const registerForPerformance = async (performanceId) => {
    await fetch(`/api/performances/${performanceId}/register`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });
    // Update UI to show registration
    fetchPerformances(selectedDate);
  };
  
  return (
    <div className="calendar-container">
      <MonthSelector value={selectedDate} onChange={setSelectedDate} />
      <CalendarGrid 
        performances={performances}
        onPerformanceSelect={showPerformanceDetails}
        onRegisterClick={registerForPerformance}
      />
    </div>
  );
}
```

### Video Player Component
```javascript
// Stream player integration
function PerformanceStream({ performanceId }) {
  const [streamUrl, setStreamUrl] = useState(null);
  const [isLive, setIsLive] = useState(false);
  
  useEffect(() => {
    // Get authenticated stream URL
    async function getStreamUrl() {
      const response = await fetch(`/api/performances/${performanceId}/stream`);
      const { url, live } = await response.json();
      setStreamUrl(url);
      setIsLive(live);
    }
    
    getStreamUrl();
    // Poll for live status every 30 seconds
    const interval = setInterval(getStreamUrl, 30000);
    return () => clearInterval(interval);
  }, [performanceId]);
  
  return (
    <div className="stream-container">
      {isLive && <div className="live-indicator">LIVE</div>}
      <video 
        src={streamUrl}
        controls
        poster={`/api/performances/${performanceId}/thumbnail`}
        className="video-player"
      />
      <StreamControls performanceId={performanceId} />
    </div>
  );
}
```

## 9. Security Considerations

1. **Access Control**
   - Restrict stream access to registered viewers only
   - Use signed URLs with expiration for stream content
   - Implement rate limiting for registration endpoints

2. **Stream Protection**
   - Configure geographical restrictions if needed
   - Implement token-based authentication for stream access
   - Set up domain-level restrictions for embedding

3. **Privacy Compliance**
   - Store viewer preferences securely
   - Implement data retention policies
   - Provide clear opt-out mechanisms for notifications

4. **Monitoring and Alerts**
   - Set up alerts for unusual viewer activity
   - Monitor stream health metrics
   - Implement fallback procedures for technical issues

```javascript
// Example: Generating a secure stream URL
function generateSecureStreamUrl(streamId, userId, performanceId) {
  // Create a signed JWT with viewer information and expiration
  const token = jwt.sign(
    { 
      sub: userId,
      performanceId: performanceId,
      exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
    },
    STREAM_SECRET_KEY
  );
  
  return `https://videodelivery.net/${streamId}/manifest/video.m3u8?token=${token}`;
}
```

---

This implementation plan serves as a comprehensive guide for developing the FireStream system for Medicine Fire Circus performances. By following these guidelines and leveraging the existing infrastructure, the platform can be deployed efficiently with minimal additional resources while providing a professional streaming experience.

