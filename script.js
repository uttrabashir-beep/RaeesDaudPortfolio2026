/* =========================
   API
========================= */

const API_URL = "http://localhost:5000";


/* =========================
   PORTFOLIO
========================= */

const portfolio = document.getElementById("portfolio");
const filterButtons = document.querySelectorAll(".filter-button");

let portfolioItems = [];


async function loadPortfolio() {

    if (!portfolio) return;

    portfolio.innerHTML = `
        <div style="
            grid-column:1/-1;
            padding:80px 20px;
            text-align:center;
            font-weight:700;
            font-size:12px;
            letter-spacing:1px;
        ">
            LOADING PROJECTS...
        </div>
    `;

    try {

        const response = await fetch(`${API_URL}/api/portfolio`);

        if (!response.ok) {
            throw new Error("Failed to load portfolio");
        }

        const data = await response.json();

        portfolioItems = Array.isArray(data) ? data : [];

        renderPortfolio("all");

    } catch (error) {

        console.error("Portfolio error:", error);

        portfolio.innerHTML = `
            <div style="
                grid-column:1/-1;
                padding:80px 20px;
                text-align:center;
                border:2px solid #111;
                background:#ffe600;
                font-weight:700;
                font-size:12px;
                letter-spacing:1px;
            ">
                PORTFOLIO COULD NOT BE LOADED
            </div>
        `;

    }

}


function getPortfolioImage(image) {

    if (!image) return "";

    if (
        image.startsWith("http://") ||
        image.startsWith("https://")
    ) {
        return image;
    }

    return `${API_URL}${image.startsWith("/") ? "" : "/"}${image}`;

}


function renderPortfolio(filter = "all") {

    if (!portfolio) return;

    portfolio.innerHTML = "";

    const filteredItems = portfolioItems.filter(item => {

        if (filter === "all") {
            return true;
        }

        return String(item.category || "").toLowerCase() ===
               String(filter).toLowerCase();

    });


    if (filteredItems.length === 0) {

        portfolio.innerHTML = `
            <div style="
                grid-column:1/-1;
                padding:80px 20px;
                text-align:center;
                border:2px solid #111;
                background:#ffe600;
                font-weight:700;
                font-size:12px;
                letter-spacing:1px;
            ">
                MORE PROJECTS WILL BE ADDED SOON
            </div>
        `;

        return;
    }


    filteredItems.forEach((item, index) => {

        const project = document.createElement("div");

        project.className = "project";

        project.dataset.index = index;


        const image = document.createElement("img");

        image.src = getPortfolioImage(item.image);

        image.alt = item.title || "Portfolio Project";

        image.loading = "lazy";


        const info = document.createElement("div");

        info.className = "project-info";

        info.innerHTML = `
            <span>
                ${escapeHTML(
                    String(item.category || "PROJECT").toUpperCase()
                )}
            </span>

            <h3>
                ${escapeHTML(
                    item.title || "Untitled Project"
                )}
            </h3>
        `;


        project.appendChild(image);

        project.appendChild(info);

        portfolio.appendChild(project);


        project.addEventListener("click", function () {

            openLightbox(
                getPortfolioImage(item.image)
            );

        });


        image.addEventListener("error", function () {

            project.innerHTML = `
                <div style="
                    width:100%;
                    min-height:300px;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    background:#ffe600;
                    color:#111;
                    font-family:Arial,sans-serif;
                    font-weight:bold;
                    text-align:center;
                    padding:30px;
                ">
                    IMAGE NOT FOUND
                </div>
            `;

        });

    });

}


/* =========================
   FILTERS
========================= */

filterButtons.forEach(button => {

    button.addEventListener("click", function () {

        filterButtons.forEach(btn => {

            btn.classList.remove("active");

        });


        this.classList.add("active");


        const filter = this.dataset.filter;

        renderPortfolio(filter);

    });

});


/* =========================
   VIDEOS
========================= */

const videoGrid = document.querySelector(".video-grid");


async function loadVideos() {

    if (!videoGrid) return;

    try {

        const response =
            await fetch(`${API_URL}/api/videos`);

        if (!response.ok) {
            throw new Error("Failed to load videos");
        }

        const videos = await response.json();

        renderVideos(videos);

    } catch (error) {

        console.error("Videos error:", error);

        videoGrid.innerHTML = `
            <div class="video-card">
                <div style="
                    min-height:250px;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    background:#ffe600;
                    color:#111;
                    font-weight:bold;
                    text-align:center;
                    padding:30px;
                ">
                    VIDEO WORK COULD NOT BE LOADED
                </div>
            </div>
        `;

    }

}


function getVideoUrl(videoPath) {

    if (!videoPath) return "";

    if (
        videoPath.startsWith("http://") ||
        videoPath.startsWith("https://")
    ) {
        return videoPath;
    }

    return `${API_URL}${videoPath.startsWith("/") ? "" : "/"}${videoPath}`;

}


function renderVideos(videos) {

    if (!videoGrid) return;

    videoGrid.innerHTML = "";


    if (!videos.length) {

        videoGrid.innerHTML = `
            <div class="video-card">
                <div style="
                    min-height:250px;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    background:#ffe600;
                    color:#111;
                    font-weight:bold;
                    text-align:center;
                    padding:30px;
                ">
                    MORE VIDEOS WILL BE ADDED SOON
                </div>
            </div>
        `;

        return;

    }


    videos.forEach((video, index) => {

        const card = document.createElement("div");

        card.className = "video-card video-real";


        const videoElement = document.createElement("video");

        videoElement.controls = true;

        videoElement.preload = "metadata";


        const source = document.createElement("source");

        source.src = getVideoUrl(video.video_url);

        source.type = "video/mp4";


        videoElement.appendChild(source);


        const title = document.createElement("div");

        title.className = "video-title";

        title.textContent =
            video.title ||
            `VIDEO PROJECT ${String(index + 1).padStart(2, "0")}`;


        card.appendChild(videoElement);

        card.appendChild(title);


        if (video.description) {

            const description =
                document.createElement("div");

            description.style.marginTop = "10px";

            description.style.fontSize = "13px";

            description.style.opacity = "0.65";

            description.textContent =
                video.description;

            card.appendChild(description);

        }


        videoElement.addEventListener(
            "error",
            function () {

                card.innerHTML = `
                    <div style="
                        min-height:250px;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        flex-direction:column;
                        gap:12px;
                        background:#ffe600;
                        color:#111;
                        font-weight:bold;
                        text-align:center;
                        padding:30px;
                    ">
                        VIDEO NOT FOUND

                        <small style="font-weight:normal;">
                            Check uploaded video
                        </small>
                    </div>
                `;

            }
        );


        videoGrid.appendChild(card);

    });

}


/* =========================
   LIGHTBOX
========================= */

const lightbox =
    document.getElementById("lightbox");

const lightboxImage =
    document.getElementById("lightboxImage");

const closeLightbox =
    document.getElementById("closeLightbox");


function openLightbox(imageSource) {

    if (!lightbox || !lightboxImage) return;

    lightboxImage.src = imageSource;

    lightbox.classList.add("active");

    document.body.style.overflow = "hidden";

}


function closeLightboxFunction() {

    if (!lightbox) return;

    lightbox.classList.remove("active");

    document.body.style.overflow = "";

}


if (closeLightbox) {

    closeLightbox.addEventListener(
        "click",
        closeLightboxFunction
    );

}


if (lightbox) {

    lightbox.addEventListener(
        "click",
        function (event) {

            if (event.target === lightbox) {

                closeLightboxFunction();

            }

        }
    );

}


document.addEventListener(
    "keydown",
    function (event) {

        if (event.key === "Escape") {

            closeLightboxFunction();

        }

    }
);


/* =========================
   CONTACT FORM
========================= */

const contactForm =
    document.getElementById("contactForm");

const formStatus =
    document.getElementById("formStatus");


if (contactForm) {

    contactForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            if (formStatus) {

                formStatus.textContent =
                    "Sending message...";

            }


            const name =
                document.getElementById("name")?.value.trim();

            const email =
                document.getElementById("email")?.value.trim();

            const subject =
                document.getElementById("subject")?.value.trim();

            const message =
                document.getElementById("message")?.value.trim();


            if (
                !name ||
                !email ||
                !subject ||
                !message
            ) {

                if (formStatus) {

                    formStatus.textContent =
                        "Please fill all fields.";

                }

                return;

            }


            try {

                const response = await fetch(
                    `${API_URL}/api/messages`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({

                            name: name,

                            email: email,

                            message:
                                `Subject: ${subject}\n\n${message}`

                        })

                    }
                );


                const data =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        data.message ||
                        "Message could not be sent."
                    );

                }


                if (formStatus) {

                    formStatus.textContent =
                        "Message sent successfully.";

                }


                contactForm.reset();


            } catch (error) {

                console.error(
                    "Contact form error:",
                    error
                );


                if (formStatus) {

                    formStatus.textContent =
                        "Unable to send message. Please try again.";

                }

            }

        }
    );

}


/* =========================
   NAVBAR SCROLL EFFECT
========================= */

const navbar =
    document.querySelector(".navbar");


window.addEventListener(
    "scroll",
    function () {

        if (!navbar) return;


        if (window.scrollY > 50) {

            navbar.style.boxShadow =
                "0 8px 25px rgba(0,0,0,.08)";

        } else {

            navbar.style.boxShadow =
                "none";

        }

    }
);


/* =========================
   SCROLL REVEAL
========================= */

function initializeReveal() {

    const revealElements =
        document.querySelectorAll(
            ".section, .stat, .service-item, .skill-box, .process-card, .featured-card, .video-card"
        );


    revealElements.forEach(element => {

        element.classList.add("reveal");

    });


    if (!("IntersectionObserver" in window)) {

        revealElements.forEach(element => {

            element.classList.add("show");

        });

        return;

    }


    const revealObserver =
        new IntersectionObserver(
            function (entries) {

                entries.forEach(entry => {

                    if (entry.isIntersecting) {

                        entry.target.classList.add("show");

                        revealObserver.unobserve(
                            entry.target
                        );

                    }

                });

            },
            {
                threshold: 0.08
            }
        );


    revealElements.forEach(element => {

        revealObserver.observe(element);

    });

}


/* =========================
   IMAGE PRELOAD
========================= */

const preloadImage =
    new Image();

preloadImage.src =
    "images/mubashir1.jpg";


/* =========================
   HTML ESCAPE
========================= */

function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }


    return String(value)

        .replace(/&/g, "&amp;")

        .replace(/</g, "&lt;")

        .replace(/>/g, "&gt;")

        .replace(/"/g, "&quot;")

        .replace(/'/g, "&#039;");

}


/* =========================
   START
========================= */

loadPortfolio();

loadVideos();

initializeReveal();