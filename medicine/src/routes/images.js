import { ImageService } from '../services/imageService';

export async function handleImageRoutes(request, env) {
    const imageService = new ImageService(env.IMAGES, env.DB, request);
    const url = new URL(request.url);
    const path = url.pathname;

    // POST /upload - Handle image upload
    if (path === '/upload' && request.method === 'POST') {
        try {
            const formData = await request.formData();
            const file = formData.get('image');
            const courseId = formData.get('courseId');
            const sessionId = formData.get('sessionId');

            if (!file || !(file instanceof File)) {
                return new Response('No image file provided', { status: 400 });
            }

            // Validate file type
            if (!file.type.startsWith('image/')) {
                return new Response('Invalid file type. Only images are allowed.', { status: 400 });
            }

            const result = await imageService.processAndStoreImage(file, {
                courseId: courseId || undefined,
                sessionId: sessionId || undefined
            });

            return new Response(JSON.stringify(result), {
                status: 201,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            console.error('Upload error:', error);
            return new Response('Error processing image', { status: 500 });
        }
    }

    // GET /images/:id - Retrieve image (redirect to Cloudflare Image Resizing URL)
    const imageMatch = path.match(/^\/images\/(\d+)$/);
    if (imageMatch && request.method === 'GET') {
        try {
            const id = parseInt(imageMatch[1]);
            const size = url.searchParams.get('size') || 'large';

            const image = await imageService.getImage(id, size);
            // Return a redirect to the Cloudflare Image Resizing URL
            return Response.redirect(image.redirect, 302);
        } catch (error) {
            console.error('Retrieval error:', error);
            return new Response(error.message, { 
                status: error.message.includes('not found') ? 404 : 500 
            });
        }
    }

    // GET /image/metadata/:id - Get image metadata
    const metadataMatch = path.match(/^\/image\/metadata\/(\d+)$/);
    if (metadataMatch && request.method === 'GET') {
        try {
            const id = parseInt(metadataMatch[1]);
            const metadata = await imageService.getMetadata(id);
            
            if (!metadata) {
                return new Response('Image not found', { status: 404 });
            }

            return new Response(JSON.stringify(metadata), {
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            console.error('Metadata error:', error);
            return new Response('Error retrieving metadata', { status: 500 });
        }
    }

    // POST /image/associate - Associate image with course/session
    if (path === '/image/associate' && request.method === 'POST') {
        try {
            const { id, courseId, sessionId } = await request.json();
            
            if (!id) {
                return new Response('Image ID is required', { status: 400 });
            }

            const result = await imageService.associateImage(id, { courseId, sessionId });
            return new Response(JSON.stringify(result), {
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            console.error('Association error:', error);
            return new Response('Error associating image', { status: 500 });
        }
    }

    // If no route matches
    return null;
}

