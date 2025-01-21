"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const suggestions_1 = __importDefault(require("./suggestions"));
const notifications_1 = __importDefault(require("./notifications"));
const router = (0, express_1.Router)();
// Mount routes
router.use('/api', suggestions_1.default);
router.use('/api', notifications_1.default);
exports.default = router;
