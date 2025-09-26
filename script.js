// WebP Converter Application
class WebPConverter {
    constructor() {
        this.files = [];
        this.results = [];
        this.quality = 0.85;
        this.isConverting = false;

        this.initializeElements();
        this.bindEvents();
        this.checkWebPSupport();
    }

    initializeElements() {
        // Core elements
        this.uploadArea = document.getElementById("uploadArea");
        this.fileInput = document.getElementById("fileInput");
        this.qualitySlider = document.getElementById("qualitySlider");
        this.qualityValue = document.getElementById("qualityValue");
        this.resultsContainer = document.getElementById("resultsContainer");
        this.resultsList = document.getElementById("resultsList");
        this.downloadAllBtn = document.getElementById("downloadAllBtn");
        this.clearAllBtn = document.getElementById("clearAllBtn");
        this.loadingOverlay = document.getElementById("loadingOverlay");

        // Quality preset buttons
        this.presetButtons = document.querySelectorAll(".preset-btn");
    }

    bindEvents() {
        // File upload events
        this.uploadArea.addEventListener("click", () => this.fileInput.click());
        this.fileInput.addEventListener("change", (e) =>
            this.handleFileSelect(e),
        );

        // Drag and drop events
        this.uploadArea.addEventListener("dragover", (e) =>
            this.handleDragOver(e),
        );
        this.uploadArea.addEventListener("dragleave", (e) =>
            this.handleDragLeave(e),
        );
        this.uploadArea.addEventListener("drop", (e) => this.handleDrop(e));

        // Quality control events
        this.qualitySlider.addEventListener("input", (e) =>
            this.updateQuality(e.target.value),
        );
        this.presetButtons.forEach((btn) => {
            btn.addEventListener("click", (e) =>
                this.setQualityPreset(e.target.dataset.quality),
            );
        });

        // Bulk action events
        this.downloadAllBtn.addEventListener("click", () => this.downloadAll());
        this.clearAllBtn.addEventListener("click", () => this.clearAll());

        // Prevent default drag behaviors on document
        document.addEventListener("dragover", (e) => e.preventDefault());
        document.addEventListener("drop", (e) => e.preventDefault());
    }

    checkWebPSupport() {
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;

        try {
            const dataURL = canvas.toDataURL("image/webp", 0.5);
            if (dataURL.indexOf("data:image/webp") === 0) {
                console.log("WebP support confirmed");
            } else {
                this.showError(
                    "Your browser does not support WebP format conversion.",
                );
            }
        } catch (e) {
            this.showError("WebP conversion is not supported in your browser.");
        }
    }

    handleDragOver(e) {
        e.preventDefault();
        this.uploadArea.classList.add("dragover");
    }

    handleDragLeave(e) {
        e.preventDefault();
        if (!this.uploadArea.contains(e.relatedTarget)) {
            this.uploadArea.classList.remove("dragover");
        }
    }

    handleDrop(e) {
        e.preventDefault();
        this.uploadArea.classList.remove("dragover");

        const files = Array.from(e.dataTransfer.files);
        this.processFiles(files);
    }

    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        this.processFiles(files);

        // Reset file input
        e.target.value = "";
    }

    processFiles(files) {
        const validFiles = files.filter((file) => this.validateFile(file));

        if (validFiles.length === 0) {
            this.showError(
                "Please select valid image files (JPG, PNG, GIF, BMP).",
            );
            return;
        }

        this.files = [...this.files, ...validFiles];
        this.convertFiles(validFiles);
    }

    validateFile(file) {
        const validTypes = [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/gif",
            "image/bmp",
        ];
        const maxSize = 10 * 1024 * 1024; // 10MB

        if (!validTypes.includes(file.type)) {
            this.showError(`${file.name} is not a supported image format.`);
            return false;
        }

        if (file.size > maxSize) {
            this.showError(`${file.name} is too large. Maximum size is 10MB.`);
            return false;
        }

        return true;
    }

    async convertFiles(files) {
        if (this.isConverting) return;

        this.isConverting = true;
        this.showLoading(true);

        try {
            for (const file of files) {
                await this.convertSingleFile(file);
            }
        } catch (error) {
            console.error("Conversion error:", error);
            this.showError(
                "An error occurred during conversion. Please try again.",
            );
        } finally {
            this.isConverting = false;
            this.showLoading(false);
            this.updateResultsDisplay();
        }
    }

    convertSingleFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                const img = new Image();

                img.onload = () => {
                    try {
                        const result = this.imageToWebP(img, file);
                        this.results.push(result);
                        resolve(result);
                    } catch (error) {
                        reject(error);
                    }
                };

                img.onerror = () =>
                    reject(new Error(`Failed to load image: ${file.name}`));
                img.src = e.target.result;
            };

            reader.onerror = () =>
                reject(new Error(`Failed to read file: ${file.name}`));
            reader.readAsDataURL(file);
        });
    }

    imageToWebP(img, originalFile) {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        // Set canvas dimensions
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        // Draw image to canvas
        ctx.drawImage(img, 0, 0);

        // Convert to WebP
        const webpDataURL = canvas.toDataURL("image/webp", this.quality);

        // Calculate file sizes
        const originalSize = originalFile.size;
        const webpSize = this.dataURLToSize(webpDataURL);
        const savings = Math.round(
            ((originalSize - webpSize) / originalSize) * 100,
        );

        // Create thumbnail
        const thumbnailCanvas = document.createElement("canvas");
        const thumbnailCtx = thumbnailCanvas.getContext("2d");
        const thumbnailSize = 100;

        thumbnailCanvas.width = thumbnailSize;
        thumbnailCanvas.height = thumbnailSize;

        // Calculate aspect ratio for thumbnail
        const aspectRatio = img.naturalWidth / img.naturalHeight;
        let drawWidth, drawHeight, offsetX, offsetY;

        if (aspectRatio > 1) {
            drawHeight = thumbnailSize;
            drawWidth = thumbnailSize * aspectRatio;
            offsetX = (thumbnailSize - drawWidth) / 2;
            offsetY = 0;
        } else {
            drawWidth = thumbnailSize;
            drawHeight = thumbnailSize / aspectRatio;
            offsetX = 0;
            offsetY = (thumbnailSize - drawHeight) / 2;
        }

        thumbnailCtx.fillStyle = "#f3f4f6";
        thumbnailCtx.fillRect(0, 0, thumbnailSize, thumbnailSize);
        thumbnailCtx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

        return {
            id: Date.now() + Math.random(),
            originalFile,
            originalName: originalFile.name,
            webpName: this.generateWebPName(originalFile.name),
            webpDataURL,
            thumbnailDataURL: thumbnailCanvas.toDataURL("image/jpeg", 0.8),
            originalSize,
            webpSize,
            savings: Math.max(0, savings),
            quality: Math.round(this.quality * 100),
            dimensions: {
                width: img.naturalWidth,
                height: img.naturalHeight,
            },
        };
    }

    generateWebPName(originalName) {
        const nameWithoutExtension = originalName.replace(/\.[^/.]+$/, "");
        return `${nameWithoutExtension}.webp`;
    }

    dataURLToSize(dataURL) {
        // Approximate size calculation for data URL
        const base64String = dataURL.split(",")[1];
        return Math.round((base64String.length * 3) / 4);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    }

    updateQuality(value) {
        this.quality = value / 100;
        this.qualityValue.textContent = value;

        // Update active preset button
        this.presetButtons.forEach((btn) => {
            btn.classList.toggle("active", btn.dataset.quality == value);
        });

        // Track quality change
        this.trackEvent("quality_changed", { quality: value });
    }

    setQualityPreset(quality) {
        this.qualitySlider.value = quality;
        this.updateQuality(quality);
    }

    updateResultsDisplay() {
        if (this.results.length === 0) {
            this.resultsContainer.style.display = "none";
            return;
        }

        this.resultsContainer.style.display = "block";
        this.resultsList.innerHTML = "";

        this.results.forEach((result) => {
            this.resultsList.appendChild(this.createResultItem(result));
        });
    }

    createResultItem(result) {
        const div = document.createElement("div");
        div.className = "result-item";
        div.innerHTML = `
            <div class="result-info">
                <img src="${result.thumbnailDataURL}" alt="Thumbnail" class="result-thumbnail">
                <div class="result-details">
                    <h4>${result.webpName}</h4>
                    <p>${result.dimensions.width} × ${result.dimensions.height} • Quality: ${result.quality}%</p>
                    <div class="size-comparison">
                        <span>Original: ${this.formatFileSize(result.originalSize)}</span>
                        <span>→</span>
                        <span>WebP: ${this.formatFileSize(result.webpSize)}</span>
                        ${result.savings > 0 ? `<span class="size-savings">-${result.savings}%</span>` : ""}
                    </div>
                </div>
            </div>
            <div class="result-actions">
                <button class="download-btn" data-id="${result.id}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7,10 12,15 17,10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Download
                </button>
                <button class="remove-btn" data-id="${result.id}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3,6 5,6 21,6"></polyline>
                        <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                    </svg>
                    Remove
                </button>
            </div>
        `;

        // Bind events
        const downloadBtn = div.querySelector(".download-btn");
        const removeBtn = div.querySelector(".remove-btn");

        downloadBtn.addEventListener("click", () =>
            this.downloadSingle(result.id),
        );
        removeBtn.addEventListener("click", () => this.removeSingle(result.id));

        return div;
    }

    downloadSingle(id) {
        const result = this.results.find((r) => r.id === id);
        if (!result) return;

        this.downloadFile(result.webpDataURL, result.webpName);
        this.trackEvent("single_download", {
            filename: result.webpName,
            savings: result.savings,
        });
    }

    removeSingle(id) {
        this.results = this.results.filter((r) => r.id !== id);
        this.updateResultsDisplay();
        this.trackEvent("remove_single", { id });
    }

    downloadAll() {
        if (this.results.length === 0) return;

        this.results.forEach((result) => {
            setTimeout(() => {
                this.downloadFile(result.webpDataURL, result.webpName);
            }, 100); // Small delay to prevent browser blocking
        });

        this.trackEvent("bulk_download", {
            count: this.results.length,
            total_savings:
                this.results.reduce((sum, r) => sum + r.savings, 0) /
                this.results.length,
        });
    }

    clearAll() {
        this.results = [];
        this.files = [];
        this.updateResultsDisplay();
        this.trackEvent("clear_all");
    }

    downloadFile(dataURL, filename) {
        const link = document.createElement("a");
        link.href = dataURL;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    showLoading(show) {
        this.loadingOverlay.style.display = show ? "flex" : "none";
    }

    showError(message) {
        // Create error notification
        const errorDiv = document.createElement("div");
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ef4444;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            z-index: 10000;
            max-width: 400px;
            animation: slideIn 0.3s ease;
        `;

        errorDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: white; font-size: 1.2rem; cursor: pointer; margin-left: auto;">&times;</button>
            </div>
        `;

        document.body.appendChild(errorDiv);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);

        this.trackEvent("error_shown", { message });
    }

    trackEvent(eventName, properties = {}) {
        // Google Analytics tracking
        if (typeof gtag !== "undefined") {
            gtag("event", eventName, {
                custom_map: properties,
                event_category: "webp_converter",
                event_label: properties.filename || "unknown",
            });
        }

        // Console logging for development
        console.log(`Event: ${eventName}`, properties);
    }
}

// FAQ Toggle Functionality
document.addEventListener("DOMContentLoaded", function () {
    const faqItems = document.querySelectorAll(".faq-item");

    faqItems.forEach((item) => {
        const question = item.querySelector(".faq-question");
        const answer = item.querySelector(".faq-answer");

        // Initially hide all answers
        answer.style.display = "none";

        // Add click event to questions
        question.addEventListener("click", () => {
            const isOpen = answer.style.display === "block";

            // Close all other FAQ items
            faqItems.forEach((otherItem) => {
                const otherAnswer = otherItem.querySelector(".faq-answer");
                otherAnswer.style.display = "none";
            });

            // Toggle current item
            answer.style.display = isOpen ? "none" : "block";
        });

        // Add keyboard accessibility
        question.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                question.click();
            }
        });

        // Make questions focusable
        question.setAttribute("tabindex", "0");
    });
});

// Smooth scrolling for anchor links
document.addEventListener("DOMContentLoaded", function () {
    const links = document.querySelectorAll('a[href^="#"]');

    links.forEach((link) => {
        link.addEventListener("click", function (e) {
            e.preventDefault();

            const targetId = this.getAttribute("href").substring(1);
            const targetElement = document.getElementById(targetId);

            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                });
            }
        });
    });
});

// Performance optimization: Lazy load images
function lazyLoadImages() {
    const images = document.querySelectorAll("img[data-src]");

    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute("data-src");
                observer.unobserve(img);
            }
        });
    });

    images.forEach((img) => imageObserver.observe(img));
}

// Initialize WebP Converter when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
    window.webpConverter = new WebPConverter();
    lazyLoadImages();

    // Track page load
    if (typeof gtag !== "undefined") {
        gtag("event", "page_view", {
            page_title: "WebP Converter Online",
            page_location: window.location.href,
        });
    }
});

// Service Worker registration for PWA capabilities (optional)
if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
        // Uncomment to enable service worker
        // navigator.serviceWorker.register('/sw.js')
        //     .then(registration => console.log('SW registered:', registration))
        //     .catch(registrationError => console.log('SW registration failed:', registrationError));
    });
}

// Add CSS animations
const style = document.createElement("style");
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes pulse {
        0%, 100% {
            opacity: 1;
        }
        50% {
            opacity: 0.5;
        }
    }
    
    .loading-spinner {
        animation: spin 1s linear infinite, pulse 2s ease-in-out infinite;
    }
`;
document.head.appendChild(style);
