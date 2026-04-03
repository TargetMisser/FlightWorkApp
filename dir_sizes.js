const fs = require('fs');
const path = require('path');

function getDirSize(dirPath) {
    let size = 0;
    try {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stats = fs.statSync(filePath);
            if (stats.isDirectory()) {
                size += getDirSize(filePath);
            } else {
                size += stats.size;
            }
        }
    } catch (err) {
        // Ignore errors for system files or permission issues
    }
    return size;
}

const root = process.cwd();
const items = fs.readdirSync(root);

console.log('Directory Sizes:');
for (const item of items) {
    const itemPath = path.join(root, item);
    const stats = fs.statSync(itemPath);
    if (stats.isDirectory()) {
        const size = getDirSize(itemPath);
        const sizeGB = (size / (1024 * 1024 * 1024)).toFixed(2);
        console.log(`${item}: ${sizeGB} GB`);
    } else {
        const sizeGB = (stats.size / (1024 * 1024 * 1024)).toFixed(2);
        if (parseFloat(sizeGB) > 0.01) {
             console.log(`${item}: ${sizeGB} GB`);
        }
    }
}
