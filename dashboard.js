const API_URL = "http://localhost:5000";

let adminToken = localStorage.getItem("adminToken");
let adminUser = JSON.parse(localStorage.getItem("adminUser") || "null");

let portfolioItems = [];
let videoItems = [];
let messageItems = [];
let categories = [];

let editingProjectId = null;


// =====================================================
// BASIC HELPERS
// =====================================================

function authHeaders(extra = {}) {
    return {
        ...extra,
        Authorization: `Bearer ${adminToken}`
    };
}


async function apiFetch(url, options = {}) {
    const response = await fetch(`${API_URL}${url}`, {
        ...options,
        headers: authHeaders(options.headers || {})
    });

    const contentType = response.headers.get("content-type") || "";

    let data;

    if (contentType.includes("application/json")) {
        data = await response.json();
    } else {
        const text = await response.text();
        data = {
            success: false,
            message: text || `Request failed (${response.status})`
        };
    }

    if (!response.ok) {
        throw new Error(data.message || `Request failed (${response.status})`);
    }

    return data;
}


function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function formatDate(date) {
    if (!date) return "";

    const d = new Date(date);

    if (Number.isNaN(d.getTime())) {
        return date;
    }

    return d.toLocaleString();
}


function formatFileSize(bytes) {
    if (!bytes || bytes <= 0) return "0 KB";

    const units = ["B", "KB", "MB", "GB"];
    const index = Math.floor(Math.log(bytes) / Math.log(1024));

    return `${(bytes / Math.pow(1024, index)).toFixed(1)} ${units[index]}`;
}


function showMessage(elementId, message, type = "success") {
    const element = document.getElementById(elementId);

    if (!element) return;

    element.textContent = message;
    element.className = `form-message ${type}`;

    setTimeout(() => {
        element.textContent = "";
        element.className = "form-message";
    }, 4000);
}


// =====================================================
// AUTH CHECK
// =====================================================

if (!adminToken) {
    window.location.href = "index.html";
}


// =====================================================
// ADMIN INFO
// =====================================================

function updateAdminUI() {
    if (!adminUser) return;

    const name = adminUser.name || "Raees Daud";
    const email = adminUser.email || "";

    const adminName = document.getElementById("adminName");
    const adminEmail = document.getElementById("adminEmail");
    const adminAvatar = document.getElementById("adminAvatar");
    const pageSubtitle = document.getElementById("pageSubtitle");

    if (adminName) adminName.textContent = name;
    if (adminEmail) adminEmail.textContent = email;
    if (adminAvatar) {
        adminAvatar.textContent = name.charAt(0).toUpperCase();
    }

    if (pageSubtitle) {
        pageSubtitle.textContent = `Welcome back, ${name}.`;
    }
}


updateAdminUI();


// =====================================================
// SECTION NAVIGATION
// =====================================================

const navItems = document.querySelectorAll(".nav-item");
const sections = document.querySelectorAll(".dashboard-section");

const sectionTitles = {
    dashboard: "Dashboard",
    portfolio: "Portfolio",
    videos: "Videos",
    messages: "Messages",
    profile: "Profile",
    services: "Services",
    settings: "Settings"
};


function showSection(sectionName) {

    sections.forEach(section => {
        section.classList.remove("active");
    });

    navItems.forEach(item => {
        item.classList.remove("active");
    });

    const section = document.getElementById(`${sectionName}Section`);

    if (section) {
        section.classList.add("active");
    }

    const activeNav = document.querySelector(
        `.nav-item[data-section="${sectionName}"]`
    );

    if (activeNav) {
        activeNav.classList.add("active");
    }

    const pageTitle = document.getElementById("pageTitle");

    if (pageTitle) {
        pageTitle.textContent = sectionTitles[sectionName] || "Dashboard";
    }

    if (sectionName === "dashboard") {
        loadDashboardStats();
    }

    if (sectionName === "portfolio") {
        loadCategories();
        loadPortfolio();
    }

    if (sectionName === "videos") {
        loadVideos();
    }

    if (sectionName === "messages") {
        loadMessages();
    }

    if (sectionName === "profile") {
        loadProfile();
    }

    if (sectionName === "settings") {
        loadSettings();
    }
}


navItems.forEach(item => {

    item.addEventListener("click", () => {

        const sectionName = item.dataset.section;

        showSection(sectionName);

    });

});


// =====================================================
// DASHBOARD STATS
// =====================================================

async function loadDashboardStats() {

    try {

        const [portfolioResponse, videosResponse, messagesResponse, unreadResponse] =
            await Promise.all([
                apiFetch("/api/portfolio"),
                apiFetch("/api/videos"),
                apiFetch("/api/messages"),
                apiFetch("/api/messages/unread-count")
            ]);

        portfolioItems = portfolioResponse.portfolio || portfolioResponse.data || [];
        videoItems = videosResponse.videos || videosResponse.data || [];
        messageItems = messagesResponse.messages || messagesResponse.data || [];

        const unreadCount =
            unreadResponse.unreadCount ??
            unreadResponse.count ??
            0;

        document.getElementById("portfolioCount").textContent =
            portfolioItems.length;

        document.getElementById("videoCount").textContent =
            videoItems.length;

        document.getElementById("messageCount").textContent =
            messageItems.length;

        document.getElementById("unreadMessageCount").textContent =
            unreadCount;

        updateMessageBadge(unreadCount);

    } catch (error) {

        console.error("Dashboard stats error:", error);

    }
}


// =====================================================
// MESSAGE BADGE
// =====================================================

function updateMessageBadge(count) {

    const badge = document.getElementById("messageBadge");

    if (!badge) return;

    badge.textContent = count;

    if (Number(count) > 0) {
        badge.style.display = "inline-flex";
    } else {
        badge.style.display = "none";
    }
}


async function loadUnreadCount() {

    try {

        const response =
            await apiFetch("/api/messages/unread-count");

        const count =
            response.unreadCount ??
            response.count ??
            0;

        const unreadElement =
            document.getElementById("unreadMessageCount");

        if (unreadElement) {
            unreadElement.textContent = count;
        }

        updateMessageBadge(count);

    } catch (error) {

        console.error("Unread count error:", error);

    }
}


// =====================================================
// PORTFOLIO
// =====================================================

async function loadPortfolio() {

    try {

        const response = await apiFetch("/api/portfolio");

        portfolioItems =
            response.portfolio ||
            response.data ||
            [];

        renderPortfolio();

        updatePortfolioCount();

    } catch (error) {

        console.error("Portfolio loading error:", error);

        const grid = document.getElementById("portfolioGrid");

        if (grid) {
            grid.innerHTML = `
                <div class="empty-state">
                    Unable to load portfolio.
                </div>
            `;
        }
    }
}


function updatePortfolioCount() {

    const element = document.getElementById("portfolioCount");

    if (element) {
        element.textContent = portfolioItems.length;
    }
}


function getImageUrl(image) {

    if (!image) return "";

    if (image.startsWith("http://") || image.startsWith("https://")) {
        return image;
    }

    if (image.startsWith("/")) {
        return `${API_URL}${image}`;
    }

    return `${API_URL}/${image}`;
}


function renderPortfolio() {

    const grid = document.getElementById("portfolioGrid");

    if (!grid) return;

    const search =
        (document.getElementById("portfolioSearch")?.value || "")
            .toLowerCase()
            .trim();

    const filter =
        document.getElementById("portfolioFilter")?.value || "all";

    const filtered = portfolioItems.filter(item => {

        const title =
            String(item.title || "").toLowerCase();

        const description =
            String(item.description || "").toLowerCase();

        const category =
            String(item.category || "").toLowerCase();

        const matchesSearch =
            !search ||
            title.includes(search) ||
            description.includes(search) ||
            category.includes(search);

        const matchesCategory =
            filter === "all" ||
            category === filter;

        return matchesSearch && matchesCategory;
    });


    if (!filtered.length) {

        grid.innerHTML = `
            <div class="empty-state">
                No portfolio projects found.
            </div>
        `;

        return;
    }


    grid.innerHTML = filtered.map(item => {

        const image = getImageUrl(
            item.image ||
            item.image_url ||
            item.imageUrl
        );

        return `
            <article class="portfolio-card">

                <div class="portfolio-card-image">

                    ${
                        image
                            ? `<img src="${escapeHTML(image)}"
                                    alt="${escapeHTML(item.title)}">`
                            : `<div class="no-image">No Image</div>`
                    }

                </div>

                <div class="portfolio-card-content">

                    <span class="category-label">
                        ${escapeHTML(item.category || "Other")}
                    </span>

                    <h3>
                        ${escapeHTML(item.title || "Untitled")}
                    </h3>

                    <p>
                        ${escapeHTML(item.description || "")}
                    </p>

                    <div class="card-actions">

                        <button
                            type="button"
                            class="secondary-btn edit-project-btn"
                            data-id="${item.id}"
                        >
                            Edit
                        </button>

                        <button
                            type="button"
                            class="danger-btn delete-project-btn"
                            data-id="${item.id}"
                        >
                            Delete
                        </button>

                    </div>

                </div>

            </article>
        `;

    }).join("");


    document.querySelectorAll(".edit-project-btn")
        .forEach(button => {

            button.addEventListener("click", () => {
                openEditProject(button.dataset.id);
            });

        });


    document.querySelectorAll(".delete-project-btn")
        .forEach(button => {

            button.addEventListener("click", () => {
                deleteProject(button.dataset.id);
            });

        });
}


// =====================================================
// PORTFOLIO CATEGORIES
// =====================================================

async function loadCategories() {

    try {

        const response = await apiFetch("/api/categories");

        categories =
            response.categories ||
            response.data ||
            [];

        renderCategoryOptions();
        renderCategoriesList();

    } catch (error) {

        console.error("Categories error:", error);

    }
}


function renderCategoryOptions() {

    const filter = document.getElementById("portfolioFilter");
    const select = document.getElementById("projectCategory");

    if (filter) {

        filter.innerHTML =
            `<option value="all">All Categories</option>` +
            categories.map(category => `
                <option value="${escapeHTML(category.slug)}">
                    ${escapeHTML(category.name)}
                </option>
            `).join("");

    }


    if (select) {

        select.innerHTML =
            `<option value="">Select Category</option>` +
            categories.map(category => `
                <option value="${escapeHTML(category.slug)}">
                    ${escapeHTML(category.name)}
                </option>
            `).join("");

    }

}


function renderCategoriesList() {

    const container =
        document.getElementById("categoriesList");

    if (!container) return;

    if (!categories.length) {

        container.innerHTML =
            `<p class="empty-state">No categories found.</p>`;

        return;
    }


    container.innerHTML = categories.map(category => {

        return `
            <div class="category-item">

                <div>
                    <strong>${escapeHTML(category.name)}</strong>
                    <small>${escapeHTML(category.slug)}</small>
                </div>

                <div class="category-actions">

                    <button
                        type="button"
                        class="secondary-btn edit-category-btn"
                        data-id="${category.id}"
                        data-name="${escapeHTML(category.name)}"
                    >
                        Edit
                    </button>

                    <button
                        type="button"
                        class="danger-btn delete-category-btn"
                        data-id="${category.id}"
                    >
                        Delete
                    </button>

                </div>

            </div>
        `;

    }).join("");


    document.querySelectorAll(".edit-category-btn")
        .forEach(button => {

            button.addEventListener("click", () => {

                editCategory(
                    button.dataset.id,
                    button.dataset.name
                );

            });

        });


    document.querySelectorAll(".delete-category-btn")
        .forEach(button => {

            button.addEventListener("click", () => {

                deleteCategory(button.dataset.id);

            });

        });

}


async function addCategory() {

    const input =
        document.getElementById("categoryName");

    const name = input?.value.trim();

    if (!name) {

        showMessage(
            "categoryMessage",
            "Please enter a category name.",
            "error"
        );

        return;
    }


    try {

        await apiFetch("/api/categories", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({ name })

        });


        input.value = "";

        showMessage(
            "categoryMessage",
            "Category added successfully."
        );

        await loadCategories();

    } catch (error) {

        showMessage(
            "categoryMessage",
            error.message,
            "error"
        );

    }
}


async function editCategory(id, oldName) {

    const newName =
        prompt("Enter new category name:", oldName);

    if (!newName || !newName.trim()) {
        return;
    }


    try {

        await apiFetch(`/api/categories/${id}`, {

            method: "PUT",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                name: newName.trim()
            })

        });


        await loadCategories();
        await loadPortfolio();

    } catch (error) {

        showMessage(
            "categoryMessage",
            error.message,
            "error"
        );

    }
}


async function deleteCategory(id) {

    if (!confirm("Delete this category?")) {
        return;
    }


    try {

        await apiFetch(`/api/categories/${id}`, {
            method: "DELETE"
        });


        await loadCategories();
        await loadPortfolio();

    } catch (error) {

        showMessage(
            "categoryMessage",
            error.message,
            "error"
        );

    }
}


// =====================================================
// PROJECT FORM
// =====================================================

function openProjectForm() {

    const box = document.getElementById("projectFormBox");

    if (!box) return;

    editingProjectId = null;

    document.getElementById("projectForm").reset();

    document.getElementById("projectId").value = "";

    document.getElementById("projectFormTitle").textContent =
        "Add Project";

    document.getElementById("currentImageBox")
        .classList.add("hidden");

    document.getElementById("imagePreviewBox")
        .classList.add("hidden");

    box.classList.remove("hidden");

}


function closeProjectForm() {

    const box = document.getElementById("projectFormBox");

    if (box) {
        box.classList.add("hidden");
    }

    editingProjectId = null;
}


function openEditProject(id) {

    const project =
        portfolioItems.find(item => String(item.id) === String(id));

    if (!project) return;

    editingProjectId = id;

    document.getElementById("projectId").value = id;

    document.getElementById("projectTitle").value =
        project.title || "";

    document.getElementById("projectCategory").value =
        project.category || "";

    document.getElementById("projectDescription").value =
        project.description || "";


    const image = getImageUrl(
        project.image ||
        project.image_url ||
        project.imageUrl
    );


    if (image) {

        document.getElementById("currentProjectImage").src =
            image;

        document.getElementById("currentImageBox")
            .classList.remove("hidden");

    }


    document.getElementById("projectFormTitle").textContent =
        "Edit Project";

    document.getElementById("projectFormBox")
        .classList.remove("hidden");

}


async function saveProject(event) {

    event.preventDefault();

    const title =
        document.getElementById("projectTitle").value.trim();

    const category =
        document.getElementById("projectCategory").value;

    const description =
        document.getElementById("projectDescription").value.trim();

    const imageInput =
        document.getElementById("projectImage");


    if (!title) {

        showMessage(
            "formMessage",
            "Project title is required.",
            "error"
        );

        return;
    }


    if (!category) {

        showMessage(
            "formMessage",
            "Please select a category.",
            "error"
        );

        return;
    }


    const button =
        document.getElementById("saveProjectBtn");

    button.disabled = true;
    button.textContent = "Saving...";


    try {

        const formData = new FormData();

        formData.append("title", title);
        formData.append("category", category);
        formData.append("description", description);

        if (imageInput.files.length > 0) {
            formData.append("image", imageInput.files[0]);
        }


        if (editingProjectId) {

            await apiFetch(
                `/api/portfolio/${editingProjectId}`,
                {
                    method: "PUT",
                    body: formData
                }
            );

            showMessage(
                "formMessage",
                "Project updated successfully."
            );

        } else {

            await apiFetch(
                "/api/portfolio",
                {
                    method: "POST",
                    body: formData
                }
            );

            showMessage(
                "formMessage",
                "Project added successfully."
            );

        }


        await loadPortfolio();

        setTimeout(() => {
            closeProjectForm();
        }, 700);

    } catch (error) {

        showMessage(
            "formMessage",
            error.message,
            "error"
        );

    } finally {

        button.disabled = false;
        button.textContent = "Save Project";

    }
}


async function deleteProject(id) {

    if (!confirm("Are you sure you want to delete this project?")) {
        return;
    }


    try {

        await apiFetch(`/api/portfolio/${id}`, {
            method: "DELETE"
        });

        await loadPortfolio();
        await loadDashboardStats();

    } catch (error) {

        alert(error.message);

    }
}


// =====================================================
// VIDEOS
// =====================================================

async function loadVideos() {

    try {

        const response = await apiFetch("/api/videos");

        videoItems =
            response.videos ||
            response.data ||
            [];

        renderVideos();

        const count =
            document.getElementById("videoCount");

        if (count) {
            count.textContent = videoItems.length;
        }

    } catch (error) {

        console.error("Videos error:", error);

    }
}


function renderVideos() {

    const grid =
        document.getElementById("videosGrid");

    if (!grid) return;

    const search =
        (document.getElementById("videoSearch")?.value || "")
            .toLowerCase()
            .trim();


    const filtered =
        videoItems.filter(video => {

            const title =
                String(video.title || "").toLowerCase();

            const description =
                String(video.description || "").toLowerCase();

            return !search ||
                title.includes(search) ||
                description.includes(search);

        });


    if (!filtered.length) {

        grid.innerHTML = `
            <div class="empty-state">
                No videos found.
            </div>
        `;

        return;
    }


    grid.innerHTML = filtered.map(video => {

        const videoUrl =
            getImageUrl(
                video.video ||
                video.url ||
                video.video_url
            );

        return `
            <article class="video-card">

                <video
                    src="${escapeHTML(videoUrl)}"
                    controls
                    preload="metadata"
                ></video>

                <div class="video-card-content">

                    <h3>
                        ${escapeHTML(video.title || "Untitled")}
                    </h3>

                    <p>
                        ${escapeHTML(video.description || "")}
                    </p>

                    <div class="card-actions">

                        <button
                            type="button"
                            class="danger-btn delete-video-btn"
                            data-id="${video.id}"
                        >
                            Delete
                        </button>

                    </div>

                </div>

            </article>
        `;

    }).join("");


    document.querySelectorAll(".delete-video-btn")
        .forEach(button => {

            button.addEventListener("click", () => {
                deleteVideo(button.dataset.id);
            });

        });

}


async function saveVideo(event) {

    event.preventDefault();

    const title =
        document.getElementById("videoTitle").value.trim();

    const description =
        document.getElementById("videoDescription").value.trim();

    const fileInput =
        document.getElementById("videoFile");


    if (!title) {

        showMessage(
            "videoFormMessage",
            "Video title is required.",
            "error"
        );

        return;
    }


    if (!fileInput.files.length) {

        showMessage(
            "videoFormMessage",
            "Please select a video.",
            "error"
        );

        return;
    }


    const button =
        document.getElementById("saveVideoBtn");

    button.disabled = true;
    button.textContent = "Uploading...";


    try {

        const formData = new FormData();

        formData.append("title", title);
        formData.append("description", description);
        formData.append("video", fileInput.files[0]);


        await apiFetch("/api/videos", {

            method: "POST",

            body: formData

        });


        showMessage(
            "videoFormMessage",
            "Video uploaded successfully."
        );


        await loadVideos();
        await loadDashboardStats();


        setTimeout(() => {
            closeVideoForm();
        }, 700);

    } catch (error) {

        showMessage(
            "videoFormMessage",
            error.message,
            "error"
        );

    } finally {

        button.disabled = false;
        button.textContent = "Upload Video";

    }
}


async function deleteVideo(id) {

    if (!confirm("Are you sure you want to delete this video?")) {
        return;
    }


    try {

        await apiFetch(`/api/videos/${id}`, {
            method: "DELETE"
        });

        await loadVideos();
        await loadDashboardStats();

    } catch (error) {

        alert(error.message);

    }
}


function openVideoForm() {

    document.getElementById("videoForm").reset();

    document.getElementById("videoPreviewBox")
        .classList.add("hidden");

    document.getElementById("videoFormBox")
        .classList.remove("hidden");

}


function closeVideoForm() {

    document.getElementById("videoFormBox")
        .classList.add("hidden");

}


// =====================================================
// MESSAGES
// =====================================================

async function loadMessages() {

    try {

        const response =
            await apiFetch("/api/messages");

        messageItems =
            response.messages ||
            response.data ||
            [];

        renderMessages();

        const count =
            document.getElementById("messageCount");

        if (count) {
            count.textContent = messageItems.length;
        }

        await loadUnreadCount();

    } catch (error) {

        console.error("Messages error:", error);

    }
}


function renderMessages() {

    const grid =
        document.getElementById("messagesGrid");

    if (!grid) return;

    const search =
        (document.getElementById("messageSearch")?.value || "")
            .toLowerCase()
            .trim();


    const filtered =
        messageItems.filter(message => {

            const name =
                String(message.name || "").toLowerCase();

            const email =
                String(message.email || "").toLowerCase();

            const subject =
                String(message.subject || "").toLowerCase();

            const text =
                String(message.message || "").toLowerCase();

            return !search ||
                name.includes(search) ||
                email.includes(search) ||
                subject.includes(search) ||
                text.includes(search);

        });


    if (!filtered.length) {

        grid.innerHTML = `
            <div class="empty-state">
                No messages found.
            </div>
        `;

        return;
    }


    grid.innerHTML = filtered.map(message => {

        const isRead =
            Number(message.is_read) === 1 ||
            message.is_read === true;


        return `
            <article class="message-card ${isRead ? "read" : "unread"}">

                <div class="message-card-header">

                    <div>

                        <h3>
                            ${escapeHTML(message.name || "Unknown")}
                        </h3>

                        <span>
                            ${escapeHTML(message.email || "")}
                        </span>

                    </div>

                    <span class="message-status">
                        ${isRead ? "Read" : "Unread"}
                    </span>

                </div>


                <div class="message-body">

                    ${
                        message.subject
                            ? `<h4>${escapeHTML(message.subject)}</h4>`
                            : ""
                    }

                    <p>
                        ${escapeHTML(message.message || "")}
                    </p>

                </div>


                <div class="message-meta">

                    <span>
                        ${formatDate(
                            message.created_at ||
                            message.createdAt
                        )}
                    </span>

                </div>


                <div class="card-actions">

                    <button
                        type="button"
                        class="secondary-btn message-read-btn"
                        data-id="${message.id}"
                        data-read="${isRead ? "1" : "0"}"
                    >
                        ${isRead ? "Mark Unread" : "Mark Read"}
                    </button>

                    <button
                        type="button"
                        class="secondary-btn reply-message-btn"
                        data-email="${escapeHTML(message.email || "")}"
                        data-subject="${escapeHTML(message.subject || "Reply")}"
                    >
                        Reply
                    </button>

                    <button
                        type="button"
                        class="danger-btn delete-message-btn"
                        data-id="${message.id}"
                    >
                        Delete
                    </button>

                </div>

            </article>
        `;

    }).join("");


    document.querySelectorAll(".message-read-btn")
        .forEach(button => {

            button.addEventListener("click", () => {

                toggleMessageRead(
                    button.dataset.id,
                    button.dataset.read === "1"
                );

            });

        });


    document.querySelectorAll(".delete-message-btn")
        .forEach(button => {

            button.addEventListener("click", () => {
                deleteMessage(button.dataset.id);
            });

        });


    document.querySelectorAll(".reply-message-btn")
        .forEach(button => {

            button.addEventListener("click", () => {

                const email = button.dataset.email;
                const subject = button.dataset.subject;

                window.location.href =
                    `mailto:${email}?subject=${encodeURIComponent(
                        `Re: ${subject}`
                    )}`;

            });

        });

}


async function toggleMessageRead(id, currentlyRead) {

    try {

        await apiFetch(
            `/api/messages/${id}/${currentlyRead ? "unread" : "read"}`,
            {
                method: "PATCH"
            }
        );

        await loadMessages();
        await loadDashboardStats();

    } catch (error) {

        alert(error.message);

    }
}


async function markAllMessagesRead() {

    try {

        await apiFetch("/api/messages/read-all", {
            method: "PATCH"
        });

        await loadMessages();
        await loadDashboardStats();

    } catch (error) {

        alert(error.message);

    }
}


async function deleteMessage(id) {

    if (!confirm("Delete this message permanently?")) {
        return;
    }


    try {

        await apiFetch(`/api/messages/${id}`, {
            method: "DELETE"
        });

        await loadMessages();
        await loadDashboardStats();

    } catch (error) {

        alert(error.message);

    }
}


// =====================================================
// PROFILE
// =====================================================

async function loadProfile() {

    try {

        const response =
            await apiFetch("/api/admin/me");

        const user =
            response.user ||
            response.admin ||
            response.data;

        if (!user) return;

        document.getElementById("profileName").value =
            user.name || "";

        document.getElementById("profileEmail").value =
            user.email || "";

        adminUser = user;

        localStorage.setItem(
            "adminUser",
            JSON.stringify(user)
        );

        updateAdminUI();

    } catch (error) {

        console.error("Profile error:", error);

    }
}


async function saveProfile(event) {

    event.preventDefault();

    const name =
        document.getElementById("profileName").value.trim();

    const email =
        document.getElementById("profileEmail").value.trim();

    const currentPassword =
        document.getElementById("currentPassword").value;

    const newPassword =
        document.getElementById("newPassword").value;


    if (!name || !email) {

        showMessage(
            "profileMessage",
            "Name and email are required.",
            "error"
        );

        return;
    }


    if (newPassword && !currentPassword) {

        showMessage(
            "profileMessage",
            "Current password is required to change password.",
            "error"
        );

        return;
    }


    try {

        const body = {
            name,
            email
        };


        if (currentPassword) {
            body.currentPassword = currentPassword;
        }


        if (newPassword) {
            body.newPassword = newPassword;
        }


        const response =
            await apiFetch("/api/admin/profile", {

                method: "PUT",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(body)

            });


        if (response.token) {

            adminToken = response.token;

            localStorage.setItem(
                "adminToken",
                adminToken
            );

        }


        if (response.user) {

            adminUser = response.user;

            localStorage.setItem(
                "adminUser",
                JSON.stringify(adminUser)
            );

        }


        document.getElementById("currentPassword").value = "";
        document.getElementById("newPassword").value = "";

        updateAdminUI();


        showMessage(
            "profileMessage",
            "Profile updated successfully."
        );

    } catch (error) {

        showMessage(
            "profileMessage",
            error.message,
            "error"
        );

    }
}


// =====================================================
// SETTINGS
// =====================================================

async function loadSettings() {

    try {

        const response =
            await apiFetch("/api/settings");

        const settings =
            response.settings ||
            response.data;

        if (!settings) return;


        document.getElementById("siteTitle").value =
            settings.site_title || "";

        document.getElementById("siteTagline").value =
            settings.tagline || "";

        document.getElementById("contactEmail").value =
            settings.contact_email || "";

        document.getElementById("whatsapp").value =
            settings.whatsapp || "";

        document.getElementById("location").value =
            settings.location || "";

        document.getElementById("cvUrl").value =
            settings.cv_url || "";

    } catch (error) {

        console.error("Settings error:", error);

    }
}


async function saveSettings(event) {

    event.preventDefault();


    const settings = {

        site_title:
            document.getElementById("siteTitle").value.trim(),

        tagline:
            document.getElementById("siteTagline").value.trim(),

        contact_email:
            document.getElementById("contactEmail").value.trim(),

        whatsapp:
            document.getElementById("whatsapp").value.trim(),

        location:
            document.getElementById("location").value.trim(),

        cv_url:
            document.getElementById("cvUrl").value.trim()

    };


    try {

        await apiFetch("/api/settings", {

            method: "PUT",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(settings)

        });


        showMessage(
            "settingsMessage",
            "Settings saved successfully."
        );

    } catch (error) {

        showMessage(
            "settingsMessage",
            error.message,
            "error"
        );

    }
}


// =====================================================
// SEARCH EVENTS
// =====================================================

document.getElementById("portfolioSearch")
    ?.addEventListener("input", renderPortfolio);

document.getElementById("portfolioFilter")
    ?.addEventListener("change", renderPortfolio);

document.getElementById("videoSearch")
    ?.addEventListener("input", renderVideos);

document.getElementById("messageSearch")
    ?.addEventListener("input", renderMessages);


// =====================================================
// CATEGORY EVENTS
// =====================================================

document.getElementById("addCategoryBtn")
    ?.addEventListener("click", addCategory);


// =====================================================
// PROJECT EVENTS
// =====================================================

document.getElementById("addProjectBtn")
    ?.addEventListener("click", openProjectForm);

document.getElementById("quickAddProject")
    ?.addEventListener("click", () => {

        showSection("portfolio");
        openProjectForm();

    });

document.getElementById("projectForm")
    ?.addEventListener("submit", saveProject);

document.getElementById("closeProjectForm")
    ?.addEventListener("click", closeProjectForm);

document.getElementById("cancelProjectBtn")
    ?.addEventListener("click", closeProjectForm);


document.getElementById("projectImage")
    ?.addEventListener("change", event => {

        const file = event.target.files[0];

        if (!file) return;

        const preview =
            document.getElementById("imagePreview");

        preview.src =
            URL.createObjectURL(file);

        document.getElementById("imagePreviewBox")
            .classList.remove("hidden");

    });


// =====================================================
// VIDEO EVENTS
// =====================================================

document.getElementById("addVideoBtn")
    ?.addEventListener("click", openVideoForm);

document.getElementById("quickAddVideo")
    ?.addEventListener("click", () => {

        showSection("videos");
        openVideoForm();

    });

document.getElementById("videoForm")
    ?.addEventListener("submit", saveVideo);

document.getElementById("closeVideoForm")
    ?.addEventListener("click", closeVideoForm);

document.getElementById("cancelVideoBtn")
    ?.addEventListener("click", closeVideoForm);


document.getElementById("videoFile")
    ?.addEventListener("change", event => {

        const file = event.target.files[0];

        if (!file) return;

        const preview =
            document.getElementById("videoPreview");

        preview.src =
            URL.createObjectURL(file);

        document.getElementById("videoPreviewBox")
            .classList.remove("hidden");

    });


// =====================================================
// MESSAGE EVENTS
// =====================================================

document.getElementById("markAllReadBtn")
    ?.addEventListener("click", markAllMessagesRead);

document.getElementById("quickMessages")
    ?.addEventListener("click", () => {

        showSection("messages");

    });


// =====================================================
// PROFILE / SETTINGS EVENTS
// =====================================================

document.getElementById("profileForm")
    ?.addEventListener("submit", saveProfile);

document.getElementById("settingsForm")
    ?.addEventListener("submit", saveSettings);


// =====================================================
// LOGOUT
// =====================================================

document.getElementById("logoutBtn")
    ?.addEventListener("click", () => {

        localStorage.removeItem("adminToken");
        localStorage.removeItem("adminUser");

        window.location.href = "index.html";

    });


// =====================================================
// INITIAL LOAD
// =====================================================

async function initializeDashboard() {

    updateAdminUI();

    await loadDashboardStats();

    await loadCategories();

    await loadPortfolio();

    await loadVideos();

    await loadMessages();

}


initializeDashboard();