"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupCleanupJob = setupCleanupJob;
const node_cron_1 = __importDefault(require("node-cron"));
const prisma_server_1 = __importDefault(require("./lib/prisma.server"));
const CHAT_GROUP_RETENTION_DAYS = 60;
async function cleanupOldChatGroups() {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - CHAT_GROUP_RETENTION_DAYS);
        const oldGroups = await prisma_server_1.default.chatGroup.findMany({
            where: {
                updatedAt: {
                    lt: cutoffDate
                }
            },
            select: {
                id: true
            }
        });
        const oldGroupIds = oldGroups.map((group) => group.id);
        if (oldGroupIds.length === 0) {
            console.log('No old chat groups to delete');
            return;
        }
        console.log(`Found ${oldGroupIds.length} chat groups older than ${CHAT_GROUP_RETENTION_DAYS} days`);
        const deletedMessages = await prisma_server_1.default.chatMessage.deleteMany({
            where: {
                chatGroupId: {
                    in: oldGroupIds
                }
            }
        });
        const deletedGroups = await prisma_server_1.default.chatGroup.deleteMany({
            where: {
                id: {
                    in: oldGroupIds
                }
            }
        });
        console.log(`Deleted ${deletedMessages.count} messages and ${deletedGroups.count} chat groups`);
    }
    catch (error) {
        console.error('Error cleaning up old chat groups:', error);
    }
}
function setupCleanupJob() {
    node_cron_1.default.schedule('0 2 1 */2 *', async () => {
        console.log('Running chat group cleanup job');
        await cleanupOldChatGroups();
    });
    console.log('Chat group cleanup job scheduled: runs every 2 months');
}
