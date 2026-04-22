const multer = require("multer");
const path = require("path");

// Configure storage for recordings
const recordingStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/recordings/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname),
    );
  },
});

const uploadRecording = multer({
  storage: recordingStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    // Accept audio and video files based on MIME type or common extensions
    const isAudioOrVideo =
      file.mimetype.startsWith("audio/") || file.mimetype.startsWith("video/");

    const allowedExtensions =
      /^\.(mp3|wav|m4a|mp4|webm|ogg|aac|3gp|flac|mkv|avi|mov|m4v|opus|ts)$/i;
    const hasAllowedExt = allowedExtensions.test(
      path.extname(file.originalname),
    );

    if (isAudioOrVideo || hasAllowedExt) {
      return cb(null, true);
    } else {
      cb(new Error("Only audio and video files are allowed!"));
    }
  },
});

module.exports = { uploadRecording };
