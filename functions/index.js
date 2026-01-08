/**
 * Firebase Cloud Functions for Stammtisch Web App
 * Includes Cloudinary image deletion (requires API Secret)
 */

const { setGlobalOptions } = require("firebase-functions");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const cloudinary = require("cloudinary").v2;
const logger = require("firebase-functions/logger");

// Hardcoded configuration (for Spark plan without Secrets)
// In production with Blaze plan, use defineSecret instead
const CLOUDINARY_CONFIG = {
    cloud_name: "doasrf18u",
    api_key: "271343821461348",
    api_secret: "Q6EA3q2rGrJ1glAMF4_koOoqAiA"
};

// Global options for cost control
setGlobalOptions({ maxInstances: 10 });

/**
 * Delete an image from Cloudinary
 * Called from frontend after successful Firestore deletion
 */
exports.deleteCloudinaryImage = onCall(async (request) => {
    // Auth check - user must be logged in
    if (!request.auth) {
        logger.error("Unauthorized delete attempt");
        throw new HttpsError("unauthenticated", "Login erforderlich");
    }

    const { publicId } = request.data;

    if (!publicId) {
        logger.error("Missing publicId in request");
        throw new HttpsError("invalid-argument", "publicId fehlt");
    }

    logger.info(`Deleting Cloudinary image: ${publicId}`, {
        uid: request.auth.uid,
        publicId,
    });

    // Configure Cloudinary
    cloudinary.config(CLOUDINARY_CONFIG);

    try {
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: "image",
            invalidate: true,
        });

        logger.info("Cloudinary delete result:", result);

        if (result.result === "ok" || result.result === "not found") {
            return { success: true, result: result.result };
        } else {
            logger.warn("Cloudinary delete returned unexpected result:", result);
            return { success: false, result: result.result };
        }
    } catch (error) {
        logger.error("Cloudinary delete error:", error);
        throw new HttpsError("internal", `Cloudinary Fehler: ${error.message}`);
    }
});

/**
 * Bulk delete multiple images from Cloudinary
 */
exports.bulkDeleteCloudinaryImages = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Login erforderlich");
    }

    const { publicIds } = request.data;

    if (!publicIds || !Array.isArray(publicIds) || publicIds.length === 0) {
        throw new HttpsError("invalid-argument", "publicIds Array fehlt oder leer");
    }

    logger.info(`Bulk deleting ${publicIds.length} Cloudinary images`, {
        uid: request.auth.uid,
        count: publicIds.length,
    });

    cloudinary.config(CLOUDINARY_CONFIG);

    const results = [];

    for (const publicId of publicIds) {
        try {
            const result = await cloudinary.uploader.destroy(publicId, {
                resource_type: "image",
                invalidate: true,
            });
            results.push({ publicId, success: result.result === "ok" || result.result === "not found", result: result.result });
        } catch (error) {
            logger.error(`Failed to delete ${publicId}:`, error);
            results.push({ publicId, success: false, error: error.message });
        }
    }

    const successCount = results.filter(r => r.success).length;
    logger.info(`Bulk delete complete: ${successCount}/${publicIds.length} succeeded`);

    return { results, successCount, totalCount: publicIds.length };
});
