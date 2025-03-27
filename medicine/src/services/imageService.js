
const IMAGE_SIZES = {
    large: { width: 1200, height: 800 },
    medium: { width: 800, height: 600 },
    thumbnail: { width: 300, height: 200 }
};

export class ImageService {
    constructor(r2Client, db, request) {
        this.r2 = r2Client;
        this.db = db;
        this.request = request;
    }
    
    get hostname() {
        return new URL(this.request.url).hostname;
    }

    async processAndStoreImage(file, options = {}) {
        const { courseId, sessionId } = options;
        const uniqueId = crypto.randomUUID();
        const datePrefix = new Date().toISOString().split('T')[0].replace(/-/g, '/');
        const baseKey = `images/${courseId ? `course/${courseId}` : `session/${sessionId}`}/${datePrefix}/${uniqueId}`;
        
        // Process original image only
        const buffer = await this.processImage(file);
        
        // Store only the original file in R2
        const r2Key = `${baseKey}_original`;
        
        // Upload to R2
        await this.r2.put(r2Key, buffer, {
            httpMetadata: {
                contentType: file.type
            }
        });

        // Create virtual entries for different sizes using Cloudflare Image Resizing
        const processedImages = Object.entries(IMAGE_SIZES).map(([size, dimensions]) => {
            return {
                size,
                r2Key,
                width: dimensions.width,
                height: dimensions.height,
                fileSize: buffer.length
            };
        });

        // Store metadata in database
        const mainImage = processedImages.find(img => img.size === 'large');
        const { width, height } = mainImage;

        const imageId = await this.db.prepare(
            `INSERT INTO images (
                original_filename, r2_key, width, height,
                file_size, format, related_course_id, related_session_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
            file.name,
            r2Key,
            width,
            height,
            file.size,
            'webp',
            courseId || null,
            sessionId || null
        )
        .run()
        .then(result => result.lastRowId);

        return {
            id: imageId,
            variants: processedImages.map(img => ({
                size: img.size,
                url: `https://${this.hostname}/cdn-cgi/image/w=${img.width},h=${img.height},fit=crop,quality=80,format=webp/${r2Key}`,
                width: img.width,
                height: img.height
            }))
        };
    }

    async processImage(file) {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Return the original buffer without processing
        return buffer;
    }

    async getImage(id, size = 'large') {
        const image = await this.db
            .prepare('SELECT * FROM images WHERE id = ?')
            .bind(id)
            .first();

        if (!image) {
            throw new Error('Image not found');
        }

        const dimensions = IMAGE_SIZES[size];
        if (!dimensions) {
            throw new Error('Invalid image size requested');
        }

        // Generate a Cloudflare Image Resizing URL
        const imageUrl = `https://${this.hostname}/cdn-cgi/image/w=${dimensions.width},h=${dimensions.height},fit=crop,quality=80,format=webp/${image.r2_key}`;
        
        // Return a redirect response to the Cloudflare Image URL
        return {
            redirect: imageUrl,
            contentType: 'image/webp'
        };
    }

    async getMetadata(id) {
        return this.db
            .prepare('SELECT * FROM images WHERE id = ?')
            .bind(id)
            .first();
    }

    async associateImage(id, { courseId, sessionId }) {
        await this.db
            .prepare(
                `UPDATE images 
                 SET related_course_id = ?, related_session_id = ?
                 WHERE id = ?`
            )
            .bind(courseId || null, sessionId || null, id)
            .run();

        return this.getMetadata(id);
    }
}

