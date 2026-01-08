// Script to delete ALL Cloudinary images with prefix "gallery/" - with loop until empty
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: 'doasrf18u',
    api_key: '271343821461348',
    api_secret: 'Q6EA3q2rGrJ1glAMF4_koOoqAiA'
});

async function deleteAllGalleryImages() {
    console.log('Starting bulk delete of all gallery images...');

    let totalDeleted = 0;
    let iteration = 0;
    const maxIterations = 50; // Safety limit

    while (iteration < maxIterations) {
        iteration++;
        console.log(`\n--- Iteration ${iteration} ---`);

        try {
            // Get list of resources with prefix
            const result = await cloudinary.api.resources({
                type: 'upload',
                prefix: 'gallery/',
                max_results: 100
            });

            console.log(`Found ${result.resources.length} resources`);

            if (result.resources.length === 0) {
                console.log('✅ No more resources found. All deleted!');
                break;
            }

            // Extract public_ids
            const publicIds = result.resources.map(r => r.public_id);

            // Delete batch
            const deleteResult = await cloudinary.api.delete_resources(publicIds);

            const deletedCount = Object.keys(deleteResult.deleted).length;
            console.log(`Deleted ${deletedCount} resources`);

            totalDeleted += deletedCount;

            // Small delay to avoid rate limiting
            await new Promise(r => setTimeout(r, 500));

        } catch (error) {
            console.error('Error:', error.message);
            if (error.message.includes('Rate Limit')) {
                console.log('Rate limited, waiting 60 seconds...');
                await new Promise(r => setTimeout(r, 60000));
            } else {
                break;
            }
        }
    }

    console.log(`\n========================================`);
    console.log(`✅ TOTAL DELETED: ${totalDeleted} images`);
    console.log(`========================================`);
}

deleteAllGalleryImages().catch(console.error);
