"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isGuest = exports.isMember = void 0;
// Type guard functions
function isMember(player) {
    return !('isGuest' in player);
}
exports.isMember = isMember;
function isGuest(player) {
    return 'isGuest' in player && player.isGuest === true;
}
exports.isGuest = isGuest;
//# sourceMappingURL=types.js.map