const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testImageUpload(imagePath, courseId = 1) {
    const form = new FormData();
    form.append('image', fs.createReadStream(imagePath));
    form.append('courseId', courseId.toString());

    console.log(`Testing upload for: ${path.basename(imagePath)}`);

    try {
        const response = await fetch('http://localhost:8787/upload', {
            method: 'POST',
            body: form
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Upload successful!');
        console.log('Image variants:', result.variants);
        return result;
    } catch (error) {
        console.error('Upload failed:', error);
        throw error;
    }
}

// Test with first image
const testImage = path.join(__dirname, 'most-popular-color-palettes-of-2015-dumma-branding-3.jpg');
testImageUpload(testImage)
    .then(result => {
        console.log('Test completed successfully');
        process.exit(0);
    })
    .catch(error => {
        console.error('Test failed:', error);
        process.exit(1);
    });

