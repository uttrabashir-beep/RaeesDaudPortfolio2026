const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();


// =====================================================
// APP CONFIG
// =====================================================

const app = express();

const PORT = process.env.PORT || 5000;

const JWT_SECRET =
    process.env.JWT_SECRET ||
    "raees-daud-secret-change-this";


// =====================================================
// DIRECTORIES
// =====================================================

const uploadsDir = path.join(__dirname, "uploads");
const portfolioUploadsDir = path.join(
    uploadsDir,
    "portfolio"
);
const videoUploadsDir = path.join(
    uploadsDir,
    "videos"
);

fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(portfolioUploadsDir, { recursive: true });
fs.mkdirSync(videoUploadsDir, { recursive: true });


// =====================================================
// MIDDLEWARE
// =====================================================

app.use(
    cors({
        origin: true,
        credentials: true
    })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
    "/uploads",
    express.static(uploadsDir)
);


// =====================================================
// DATABASE
// =====================================================

const dbPath = path.join(
    __dirname,
    "portfolio.db"
);

const db = new Database(dbPath);

db.pragma("journal_mode = WAL");


// =====================================================
// DATABASE TABLES
// =====================================================

db.exec(`

    CREATE TABLE IF NOT EXISTS admin_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS portfolio (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        image TEXT NOT NULL,
        description TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS videos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        video TEXT NOT NULL,
        description TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS portfolio_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        slug TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        site_title TEXT DEFAULT 'Raees Daud Portfolio',
        tagline TEXT DEFAULT 'Graphic Designer',
        contact_email TEXT DEFAULT '',
        whatsapp TEXT DEFAULT '',
        location TEXT DEFAULT 'Rawalpindi, Pakistan',
        cv_url TEXT DEFAULT '',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

`);


// =====================================================
// DATABASE MIGRATION
// =====================================================

// Add is_read column to old messages table
// if it does not already exist.

const messageColumns =
    db.prepare(
        "PRAGMA table_info(messages)"
    ).all();

const hasIsRead =
    messageColumns.some(
        column => column.name === "is_read"
    );

if (!hasIsRead) {

    db.exec(`
        ALTER TABLE messages
        ADD COLUMN is_read INTEGER NOT NULL DEFAULT 0
    `);

    console.log(
        "Database migration: messages.is_read added."
    );
}


// =====================================================
// DEFAULT ADMIN
// =====================================================

const defaultAdminEmail =
    "admin@raeesdaud.com";

const defaultAdminPassword =
    "Raees@12345";

const existingAdmin =
    db.prepare(
        "SELECT id FROM admin_users WHERE email = ?"
    ).get(defaultAdminEmail);


if (!existingAdmin) {

    const hashedPassword =
        bcrypt.hashSync(
            defaultAdminPassword,
            12
        );

    db.prepare(`
        INSERT INTO admin_users
        (name, email, password)
        VALUES (?, ?, ?)
    `).run(
        "Raees Daud",
        defaultAdminEmail,
        hashedPassword
    );

    console.log(
        "Default admin account created."
    );
}


// =====================================================
// DEFAULT PORTFOLIO CATEGORIES
// =====================================================

const defaultCategories = [
    ["Graphic Design", "graphic"],
    ["Logo Design", "logo"],
    ["Social Media", "social"],
    ["Meta Ads", "ads"],
    ["Reels", "reels"],
    ["Branding", "branding"],
    ["Other", "other"]
];

const insertCategory =
    db.prepare(`
        INSERT OR IGNORE INTO portfolio_categories
        (name, slug)
        VALUES (?, ?)
    `);

for (const category of defaultCategories) {
    insertCategory.run(
        category[0],
        category[1]
    );
}


// =====================================================
// DEFAULT SETTINGS
// =====================================================

const existingSettings =
    db.prepare(
        "SELECT id FROM settings WHERE id = 1"
    ).get();

if (!existingSettings) {

    db.prepare(`
        INSERT INTO settings
        (
            id,
            site_title,
            tagline,
            contact_email,
            whatsapp,
            location,
            cv_url
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
        1,
        "Raees Daud Portfolio",
        "Graphic Designer",
        "",
        "",
        "Rawalpindi, Pakistan",
        ""
    );

}


// =====================================================
// MULTER STORAGE - PORTFOLIO
// =====================================================

const portfolioStorage =
    multer.diskStorage({

        destination: function (
            req,
            file,
            cb
        ) {

            cb(
                null,
                portfolioUploadsDir
            );

        },

        filename: function (
            req,
            file,
            cb
        ) {

            const extension =
                path.extname(
                    file.originalname
                ).toLowerCase();

            const uniqueName =
                `portfolio-${Date.now()}-${Math.round(
                    Math.random() * 1000000
                )}${extension}`;

            cb(
                null,
                uniqueName
            );

        }

    });


// =====================================================
// MULTER STORAGE - VIDEOS
// =====================================================

const videoStorage =
    multer.diskStorage({

        destination: function (
            req,
            file,
            cb
        ) {

            cb(
                null,
                videoUploadsDir
            );

        },

        filename: function (
            req,
            file,
            cb
        ) {

            const extension =
                path.extname(
                    file.originalname
                ).toLowerCase();

            const uniqueName =
                `video-${Date.now()}-${Math.round(
                    Math.random() * 1000000
                )}${extension}`;

            cb(
                null,
                uniqueName
            );

        }

    });


// =====================================================
// FILE FILTER - IMAGES
// =====================================================

function imageFileFilter(
    req,
    file,
    cb
) {

    const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/gif"
    ];

    if (
        allowedTypes.includes(
            file.mimetype
        )
    ) {

        cb(null, true);

    } else {

        cb(
            new Error(
                "Only JPG, JPEG, PNG, WEBP and GIF images are allowed."
            )
        );

    }

}


// =====================================================
// FILE FILTER - VIDEOS
// =====================================================

function videoFileFilter(
    req,
    file,
    cb
) {

    const allowedTypes = [
        "video/mp4",
        "video/webm",
        "video/ogg",
        "video/quicktime"
    ];

    if (
        allowedTypes.includes(
            file.mimetype
        )
    ) {

        cb(null, true);

    } else {

        cb(
            new Error(
                "Only MP4, WEBM, OGG and MOV videos are allowed."
            )
        );

    }

}


// =====================================================
// UPLOAD CONFIG
// =====================================================

const uploadPortfolio =
    multer({

        storage: portfolioStorage,

        fileFilter: imageFileFilter,

        limits: {
            fileSize:
                15 * 1024 * 1024
        }

    });


const uploadVideo =
    multer({

        storage: videoStorage,

        fileFilter: videoFileFilter,

        limits: {
            fileSize:
                500 * 1024 * 1024
        }

    });


// =====================================================
// JWT AUTHENTICATION
// =====================================================

function authenticateAdmin(
    req,
    res,
    next
) {

    const authHeader =
        req.headers.authorization;

    if (!authHeader) {

        return res.status(401).json({
            success: false,
            message:
                "Authorization token is required."
        });

    }

    const parts =
        authHeader.split(" ");

    if (
        parts.length !== 2 ||
        parts[0] !== "Bearer"
    ) {

        return res.status(401).json({
            success: false,
            message:
                "Invalid authorization format."
        });

    }

    const token =
        parts[1];

    try {

        const decoded =
            jwt.verify(
                token,
                JWT_SECRET
            );

        req.admin = decoded;

        next();

    } catch (error) {

        return res.status(401).json({
            success: false,
            message:
                "Invalid or expired token."
        });

    }

}


// =====================================================
// BASIC TEST
// =====================================================

app.get(
    "/api",
    (req, res) => {

        res.json({
            success: true,
            message:
                "Raees Daud Portfolio API is running."
        });

    }
);


// =====================================================
// ADMIN LOGIN
// =====================================================

app.post(
    "/api/admin/login",
    (req, res) => {

        try {

            const {
                email,
                password
            } = req.body;

            if (!email || !password) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Email and password are required."
                });

            }

            const admin =
                db.prepare(`
                    SELECT *
                    FROM admin_users
                    WHERE email = ?
                `).get(
                    email.trim().toLowerCase()
                );

            if (!admin) {

                return res.status(401).json({
                    success: false,
                    message:
                        "Invalid email or password."
                });

            }

            const passwordCorrect =
                bcrypt.compareSync(
                    password,
                    admin.password
                );

            if (!passwordCorrect) {

                return res.status(401).json({
                    success: false,
                    message:
                        "Invalid email or password."
                });

            }

            const token =
                jwt.sign(
                    {
                        id: admin.id,
                        name: admin.name,
                        email: admin.email
                    },
                    JWT_SECRET,
                    {
                        expiresIn: "7d"
                    }
                );

            res.json({

                success: true,

                message:
                    "Login successful.",

                token,

                user: {
                    id: admin.id,
                    name: admin.name,
                    email: admin.email
                }

            });

        } catch (error) {

            console.error(
                "Login error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Server error during login."
            });

        }

    }
);


// =====================================================
// CHECK ADMIN SESSION
// =====================================================

app.get(
    "/api/admin/me",
    authenticateAdmin,
    (req, res) => {

        const admin =
            db.prepare(`
                SELECT
                    id,
                    name,
                    email,
                    created_at
                FROM admin_users
                WHERE id = ?
            `).get(
                req.admin.id
            );

        if (!admin) {

            return res.status(401).json({
                success: false,
                message:
                    "Admin account not found."
            });

        }

        res.json({
            success: true,
            user: admin
        });

    }
);


// =====================================================
// UPDATE ADMIN PROFILE
// =====================================================

app.put(
    "/api/admin/profile",
    authenticateAdmin,
    async (req, res) => {

        try {

            const {
                name,
                email,
                currentPassword,
                newPassword
            } = req.body;

            const admin =
                db.prepare(`
                    SELECT *
                    FROM admin_users
                    WHERE id = ?
                `).get(
                    req.admin.id
                );

            if (!admin) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Admin account not found."
                });

            }

            const cleanName =
                name !== undefined
                    ? name.trim()
                    : admin.name;

            const cleanEmail =
                email !== undefined
                    ? email.trim().toLowerCase()
                    : admin.email;

            if (!cleanName) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Name is required."
                });

            }

            if (!cleanEmail) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Email is required."
                });

            }

            const emailExists =
                db.prepare(`
                    SELECT id
                    FROM admin_users
                    WHERE email = ?
                    AND id != ?
                `).get(
                    cleanEmail,
                    admin.id
                );

            if (emailExists) {

                return res.status(400).json({
                    success: false,
                    message:
                        "This email is already in use."
                });

            }

            let passwordHash =
                admin.password;

            if (
                newPassword &&
                newPassword.trim()
            ) {

                if (!currentPassword) {

                    return res.status(400).json({
                        success: false,
                        message:
                            "Current password is required."
                    });

                }

                const validPassword =
                    bcrypt.compareSync(
                        currentPassword,
                        admin.password
                    );

                if (!validPassword) {

                    return res.status(400).json({
                        success: false,
                        message:
                            "Current password is incorrect."
                    });

                }

                if (
                    newPassword.trim().length < 6
                ) {

                    return res.status(400).json({
                        success: false,
                        message:
                            "New password must be at least 6 characters."
                    });

                }

                passwordHash =
                    bcrypt.hashSync(
                        newPassword.trim(),
                        12
                    );

            }

            db.prepare(`
                UPDATE admin_users
                SET
                    name = ?,
                    email = ?,
                    password = ?
                WHERE id = ?
            `).run(
                cleanName,
                cleanEmail,
                passwordHash,
                admin.id
            );

            const updatedAdmin =
                db.prepare(`
                    SELECT
                        id,
                        name,
                        email,
                        created_at
                    FROM admin_users
                    WHERE id = ?
                `).get(
                    admin.id
                );

            const token =
                jwt.sign(
                    {
                        id: updatedAdmin.id,
                        name: updatedAdmin.name,
                        email: updatedAdmin.email
                    },
                    JWT_SECRET,
                    {
                        expiresIn: "7d"
                    }
                );

            res.json({

                success: true,

                message:
                    "Profile updated successfully.",

                token,

                user: updatedAdmin

            });

        } catch (error) {

            console.error(
                "Profile update error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to update profile."
            });

        }

    }
);


// =====================================================
// PORTFOLIO CATEGORIES - GET
// =====================================================

app.get(
    "/api/categories",
    authenticateAdmin,
    (req, res) => {

        try {

            const categories =
                db.prepare(`
                    SELECT *
                    FROM portfolio_categories
                    ORDER BY name ASC
                `).all();

            res.json(categories);

        } catch (error) {

            console.error(
                "Categories fetch error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to load categories."
            });

        }

    }
);


// =====================================================
// PORTFOLIO CATEGORY - ADD
// =====================================================

app.post(
    "/api/categories",
    authenticateAdmin,
    (req, res) => {

        try {

            const name =
                (req.body.name || "")
                    .trim();

            if (!name) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Category name is required."
                });

            }

            const slug =
                name
                    .toLowerCase()
                    .replace(
                        /[^a-z0-9]+/g,
                        "-"
                    )
                    .replace(
                        /^-+|-+$/g,
                        ""
                    );

            if (!slug) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid category name."
                });

            }

            const exists =
                db.prepare(`
                    SELECT id
                    FROM portfolio_categories
                    WHERE name = ?
                    OR slug = ?
                `).get(
                    name,
                    slug
                );

            if (exists) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Category already exists."
                });

            }

            const result =
                db.prepare(`
                    INSERT INTO portfolio_categories
                    (name, slug)
                    VALUES (?, ?)
                `).run(
                    name,
                    slug
                );

            const category =
                db.prepare(`
                    SELECT *
                    FROM portfolio_categories
                    WHERE id = ?
                `).get(
                    result.lastInsertRowid
                );

            res.status(201).json({

                success: true,

                message:
                    "Category added successfully.",

                category

            });

        } catch (error) {

            console.error(
                "Category add error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to add category."
            });

        }

    }
);


// =====================================================
// PORTFOLIO CATEGORY - UPDATE
// =====================================================

app.put(
    "/api/categories/:id",
    authenticateAdmin,
    (req, res) => {

        try {

            const id =
                req.params.id;

            const name =
                (req.body.name || "")
                    .trim();

            if (!name) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Category name is required."
                });

            }

            const existing =
                db.prepare(`
                    SELECT *
                    FROM portfolio_categories
                    WHERE id = ?
                `).get(id);

            if (!existing) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Category not found."
                });

            }

            const slug =
                name
                    .toLowerCase()
                    .replace(
                        /[^a-z0-9]+/g,
                        "-"
                    )
                    .replace(
                        /^-+|-+$/g,
                        ""
                    );

            const duplicate =
                db.prepare(`
                    SELECT id
                    FROM portfolio_categories
                    WHERE (name = ? OR slug = ?)
                    AND id != ?
                `).get(
                    name,
                    slug,
                    id
                );

            if (duplicate) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Another category with this name already exists."
                });

            }

            // Update existing portfolio projects
            // so their category continues to work.
            db.prepare(`
                UPDATE portfolio
                SET category = ?
                WHERE category = ?
            `).run(
                slug,
                existing.slug
            );

            db.prepare(`
                UPDATE portfolio_categories
                SET
                    name = ?,
                    slug = ?
                WHERE id = ?
            `).run(
                name,
                slug,
                id
            );

            const updated =
                db.prepare(`
                    SELECT *
                    FROM portfolio_categories
                    WHERE id = ?
                `).get(id);

            res.json({

                success: true,

                message:
                    "Category updated successfully.",

                category: updated

            });

        } catch (error) {

            console.error(
                "Category update error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to update category."
            });

        }

    }
);


// =====================================================
// PORTFOLIO CATEGORY - DELETE
// =====================================================

app.delete(
    "/api/categories/:id",
    authenticateAdmin,
    (req, res) => {

        try {

            const id =
                req.params.id;

            const category =
                db.prepare(`
                    SELECT *
                    FROM portfolio_categories
                    WHERE id = ?
                `).get(id);

            if (!category) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Category not found."
                });

            }

            const used =
                db.prepare(`
                    SELECT COUNT(*) AS count
                    FROM portfolio
                    WHERE category = ?
                `).get(
                    category.slug
                );

            if (used.count > 0) {

                return res.status(400).json({
                    success: false,
                    message:
                        `This category is being used by ${used.count} portfolio project(s). Change those projects first.`
                });

            }

            db.prepare(`
                DELETE FROM portfolio_categories
                WHERE id = ?
            `).run(id);

            res.json({

                success: true,

                message:
                    "Category deleted successfully."

            });

        } catch (error) {

            console.error(
                "Category delete error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to delete category."
            });

        }

    }
);


// =====================================================
// GET SETTINGS
// =====================================================

app.get(
    "/api/settings",
    authenticateAdmin,
    (req, res) => {

        try {

            const settings =
                db.prepare(`
                    SELECT *
                    FROM settings
                    WHERE id = 1
                `).get();

            res.json(settings);

        } catch (error) {

            console.error(
                "Settings fetch error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to load settings."
            });

        }

    }
);


// =====================================================
// UPDATE SETTINGS
// =====================================================

app.put(
    "/api/settings",
    authenticateAdmin,
    (req, res) => {

        try {

            const {
                site_title,
                tagline,
                contact_email,
                whatsapp,
                location,
                cv_url
            } = req.body;

            db.prepare(`
                UPDATE settings
                SET
                    site_title = ?,
                    tagline = ?,
                    contact_email = ?,
                    whatsapp = ?,
                    location = ?,
                    cv_url = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = 1
            `).run(
                (site_title || "").trim(),
                (tagline || "").trim(),
                (contact_email || "").trim(),
                (whatsapp || "").trim(),
                (location || "").trim(),
                (cv_url || "").trim()
            );

            const settings =
                db.prepare(`
                    SELECT *
                    FROM settings
                    WHERE id = 1
                `).get();

            res.json({

                success: true,

                message:
                    "Settings saved successfully.",

                settings

            });

        } catch (error) {

            console.error(
                "Settings update error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to save settings."
            });

        }

    }
);


// =====================================================
// GET ALL PORTFOLIO
// =====================================================

app.get(
    "/api/portfolio",
    (req, res) => {

        try {

            const portfolio =
                db.prepare(`
                    SELECT *
                    FROM portfolio
                    ORDER BY id DESC
                `).all();

            res.json(portfolio);

        } catch (error) {

            console.error(
                "Portfolio fetch error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to load portfolio."
            });

        }

    }
);


// =====================================================
// GET SINGLE PORTFOLIO
// =====================================================

app.get(
    "/api/portfolio/:id",
    (req, res) => {

        try {

            const item =
                db.prepare(`
                    SELECT *
                    FROM portfolio
                    WHERE id = ?
                `).get(
                    req.params.id
                );

            if (!item) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Portfolio item not found."
                });

            }

            res.json(item);

        } catch (error) {

            console.error(error);

            res.status(500).json({
                success: false,
                message:
                    "Unable to load portfolio item."
            });

        }

    }
);


// =====================================================
// ADD PORTFOLIO PROJECT
// =====================================================

app.post(
    "/api/portfolio",
    authenticateAdmin,
    uploadPortfolio.single("image"),
    (req, res) => {

        try {

            const {
                title,
                category,
                description
            } = req.body;

            if (!title || !category) {

                if (req.file) {
                    fs.unlinkSync(
                        req.file.path
                    );
                }

                return res.status(400).json({
                    success: false,
                    message:
                        "Title and category are required."
                });

            }

            if (!req.file) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Please select an image."
                });

            }

            const imagePath =
                `/uploads/portfolio/${req.file.filename}`;

            const result =
                db.prepare(`
                    INSERT INTO portfolio
                    (
                        title,
                        category,
                        image,
                        description
                    )
                    VALUES (?, ?, ?, ?)
                `).run(
                    title.trim(),
                    category.trim(),
                    imagePath,
                    description
                        ? description.trim()
                        : ""
                );

            const newItem =
                db.prepare(`
                    SELECT *
                    FROM portfolio
                    WHERE id = ?
                `).get(
                    result.lastInsertRowid
                );

            res.status(201).json({

                success: true,

                message:
                    "Portfolio project uploaded successfully.",

                item: newItem

            });

        } catch (error) {

            console.error(
                "Portfolio upload error:",
                error
            );

            if (req.file) {

                try {
                    fs.unlinkSync(
                        req.file.path
                    );
                } catch (deleteError) {
                    console.error(
                        deleteError
                    );
                }

            }

            res.status(500).json({
                success: false,
                message:
                    error.message ||
                    "Portfolio upload failed."
            });

        }

    }
);


// =====================================================
// UPDATE PORTFOLIO PROJECT
// =====================================================

app.put(
    "/api/portfolio/:id",
    authenticateAdmin,
    uploadPortfolio.single("image"),
    (req, res) => {

        try {

            const id =
                req.params.id;

            const existing =
                db.prepare(`
                    SELECT *
                    FROM portfolio
                    WHERE id = ?
                `).get(id);

            if (!existing) {

                if (req.file) {
                    fs.unlinkSync(
                        req.file.path
                    );
                }

                return res.status(404).json({
                    success: false,
                    message:
                        "Portfolio project not found."
                });

            }

            const title =
                req.body.title !== undefined
                    ? req.body.title.trim()
                    : existing.title;

            const category =
                req.body.category !== undefined
                    ? req.body.category.trim()
                    : existing.category;

            const description =
                req.body.description !== undefined
                    ? req.body.description.trim()
                    : existing.description;

            let imagePath =
                existing.image;

            if (req.file) {

                imagePath =
                    `/uploads/portfolio/${req.file.filename}`;

                const oldFilePath =
                    path.join(
                        uploadsDir,
                        existing.image.replace(
                            "/uploads/",
                            ""
                        )
                    );

                if (
                    fs.existsSync(
                        oldFilePath
                    )
                ) {
                    fs.unlinkSync(
                        oldFilePath
                    );
                }

            }

            db.prepare(`
                UPDATE portfolio
                SET
                    title = ?,
                    category = ?,
                    image = ?,
                    description = ?
                WHERE id = ?
            `).run(
                title,
                category,
                imagePath,
                description,
                id
            );

            const updated =
                db.prepare(`
                    SELECT *
                    FROM portfolio
                    WHERE id = ?
                `).get(id);

            res.json({

                success: true,

                message:
                    "Portfolio project updated successfully.",

                item: updated

            });

        } catch (error) {

            console.error(
                "Portfolio update error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Portfolio update failed."
            });

        }

    }
);


// =====================================================
// DELETE PORTFOLIO PROJECT
// =====================================================

app.delete(
    "/api/portfolio/:id",
    authenticateAdmin,
    (req, res) => {

        try {

            const item =
                db.prepare(`
                    SELECT *
                    FROM portfolio
                    WHERE id = ?
                `).get(
                    req.params.id
                );

            if (!item) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Portfolio project not found."
                });

            }

            const filePath =
                path.join(
                    uploadsDir,
                    item.image.replace(
                        "/uploads/",
                        ""
                    )
                );

            if (
                fs.existsSync(
                    filePath
                )
            ) {
                fs.unlinkSync(
                    filePath
                );
            }

            db.prepare(`
                DELETE FROM portfolio
                WHERE id = ?
            `).run(
                req.params.id
            );

            res.json({

                success: true,

                message:
                    "Portfolio project deleted successfully."

            });

        } catch (error) {

            console.error(
                "Portfolio delete error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Portfolio delete failed."
            });

        }

    }
);


// =====================================================
// GET ALL VIDEOS
// =====================================================

app.get(
    "/api/videos",
    (req, res) => {

        try {

            const videos =
                db.prepare(`
                    SELECT *
                    FROM videos
                    ORDER BY id DESC
                `).all();

            res.json(videos);

        } catch (error) {

            console.error(
                "Video fetch error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to load videos."
            });

        }

    }
);


// =====================================================
// ADD VIDEO
// =====================================================

app.post(
    "/api/videos",
    authenticateAdmin,
    uploadVideo.single("video"),
    (req, res) => {

        try {

            const {
                title,
                description
            } = req.body;

            if (!title) {

                if (req.file) {
                    fs.unlinkSync(
                        req.file.path
                    );
                }

                return res.status(400).json({
                    success: false,
                    message:
                        "Video title is required."
                });

            }

            if (!req.file) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Please select a video."
                });

            }

            const videoPath =
                `/uploads/videos/${req.file.filename}`;

            const result =
                db.prepare(`
                    INSERT INTO videos
                    (
                        title,
                        video,
                        description
                    )
                    VALUES (?, ?, ?)
                `).run(
                    title.trim(),
                    videoPath,
                    description
                        ? description.trim()
                        : ""
                );

            const newVideo =
                db.prepare(`
                    SELECT *
                    FROM videos
                    WHERE id = ?
                `).get(
                    result.lastInsertRowid
                );

            res.status(201).json({

                success: true,

                message:
                    "Video uploaded successfully.",

                item: newVideo

            });

        } catch (error) {

            console.error(
                "Video upload error:",
                error
            );

            if (req.file) {

                try {
                    fs.unlinkSync(
                        req.file.path
                    );
                } catch (deleteError) {
                    console.error(
                        deleteError
                    );
                }

            }

            res.status(500).json({
                success: false,
                message:
                    error.message ||
                    "Video upload failed."
            });

        }

    }
);


// =====================================================
// DELETE VIDEO
// =====================================================

app.delete(
    "/api/videos/:id",
    authenticateAdmin,
    (req, res) => {

        try {

            const video =
                db.prepare(`
                    SELECT *
                    FROM videos
                    WHERE id = ?
                `).get(
                    req.params.id
                );

            if (!video) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Video not found."
                });

            }

            const filePath =
                path.join(
                    uploadsDir,
                    video.video.replace(
                        "/uploads/",
                        ""
                    )
                );

            if (
                fs.existsSync(
                    filePath
                )
            ) {
                fs.unlinkSync(
                    filePath
                );
            }

            db.prepare(`
                DELETE FROM videos
                WHERE id = ?
            `).run(
                req.params.id
            );

            res.json({

                success: true,

                message:
                    "Video deleted successfully."

            });

        } catch (error) {

            console.error(
                "Video delete error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Video delete failed."
            });

        }

    }
);


// =====================================================
// CREATE MESSAGE
// =====================================================

app.post(
    "/api/messages",
    (req, res) => {

        try {

            const {
                name,
                email,
                message
            } = req.body;

            if (
                !name ||
                !email ||
                !message
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Name, email and message are required."
                });

            }

            const result =
                db.prepare(`
                    INSERT INTO messages
                    (
                        name,
                        email,
                        message,
                        is_read
                    )
                    VALUES (?, ?, ?, 0)
                `).run(
                    name.trim(),
                    email.trim(),
                    message.trim()
                );

            res.status(201).json({

                success: true,

                message:
                    "Your message has been sent successfully.",

                id:
                    result.lastInsertRowid

            });

        } catch (error) {

            console.error(
                "Message error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to send message."
            });

        }

    }
);


// =====================================================
// GET MESSAGES
// =====================================================

app.get(
    "/api/messages",
    authenticateAdmin,
    (req, res) => {

        try {

            const messages =
                db.prepare(`
                    SELECT *
                    FROM messages
                    ORDER BY id DESC
                `).all();

            res.json(messages);

        } catch (error) {

            console.error(
                "Messages fetch error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to load messages."
            });

        }

    }
);


// =====================================================
// GET UNREAD MESSAGE COUNT
// =====================================================

app.get(
    "/api/messages/unread-count",
    authenticateAdmin,
    (req, res) => {

        try {

            const result =
                db.prepare(`
                    SELECT COUNT(*) AS count
                    FROM messages
                    WHERE is_read = 0
                `).get();

            res.json({

                success: true,

                count:
                    result.count

            });

        } catch (error) {

            console.error(
                "Unread count error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to get unread message count."
            });

        }

    }
);


// =====================================================
// MARK MESSAGE AS READ
// =====================================================

app.patch(
    "/api/messages/:id/read",
    authenticateAdmin,
    (req, res) => {

        try {

            const result =
                db.prepare(`
                    UPDATE messages
                    SET is_read = 1
                    WHERE id = ?
                `).run(
                    req.params.id
                );

            if (
                result.changes === 0
            ) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Message not found."
                });

            }

            res.json({

                success: true,

                message:
                    "Message marked as read."

            });

        } catch (error) {

            console.error(
                "Mark read error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to mark message as read."
            });

        }

    }
);


// =====================================================
// MARK MESSAGE AS UNREAD
// =====================================================

app.patch(
    "/api/messages/:id/unread",
    authenticateAdmin,
    (req, res) => {

        try {

            const result =
                db.prepare(`
                    UPDATE messages
                    SET is_read = 0
                    WHERE id = ?
                `).run(
                    req.params.id
                );

            if (
                result.changes === 0
            ) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Message not found."
                });

            }

            res.json({

                success: true,

                message:
                    "Message marked as unread."

            });

        } catch (error) {

            console.error(
                "Mark unread error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to mark message as unread."
            });

        }

    }
);


// =====================================================
// MARK ALL MESSAGES AS READ
// =====================================================

app.patch(
    "/api/messages/read-all",
    authenticateAdmin,
    (req, res) => {

        try {

            db.prepare(`
                UPDATE messages
                SET is_read = 1
                WHERE is_read = 0
            `).run();

            res.json({

                success: true,

                message:
                    "All messages marked as read."

            });

        } catch (error) {

            console.error(
                "Read all error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to mark messages as read."
            });

        }

    }
);


// =====================================================
// DELETE MESSAGE
// =====================================================

app.delete(
    "/api/messages/:id",
    authenticateAdmin,
    (req, res) => {

        try {

            const result =
                db.prepare(`
                    DELETE FROM messages
                    WHERE id = ?
                `).run(
                    req.params.id
                );

            if (
                result.changes === 0
            ) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Message not found."
                });

            }

            res.json({

                success: true,

                message:
                    "Message deleted successfully."

            });

        } catch (error) {

            console.error(
                "Message delete error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Message delete failed."
            });

        }

    }
);


// =====================================================
// ERROR HANDLER
// =====================================================

app.use(
    (error, req, res, next) => {

        console.error(
            "Server error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                error.message ||
                "Something went wrong."

        });

    }
);


// =====================================================
// START SERVER
// =====================================================

app.listen(
    PORT,
    () => {

        console.log("");
        console.log(
            "----------------------------------------"
        );
        console.log(
            "RAEES DAUD PORTFOLIO BACKEND"
        );
        console.log(
            "----------------------------------------"
        );
        console.log(
            `Server running at: http://localhost:${PORT}`
        );
        console.log(
            "Database ready."
        );
        console.log(
            "Read/Unread messages enabled."
        );
        console.log(
            "Portfolio categories enabled."
        );
        console.log(
            "Profile & settings enabled."
        );
        console.log(
            "----------------------------------------"
        );
        console.log("");
        console.log(
            "ADMIN LOGIN"
        );
        console.log(
            `Email: ${defaultAdminEmail}`
        );
        console.log(
            `Password: ${defaultAdminPassword}`
        );
        console.log("");
        console.log(
            "UPLOAD FOLDERS"
        );
        console.log(
            `Portfolio: ${portfolioUploadsDir}`
        );
        console.log(
            `Videos: ${videoUploadsDir}`
        );
        console.log(
            "----------------------------------------"
        );
        console.log("");

    }
);