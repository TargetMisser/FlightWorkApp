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
        // Ignore errors
    }
    return size;
}

const root = process.cwd();
const items = fs.readdirSync(root);

console.log('--- Sizes in ' + root + ' ---');
const results = [];

for (const item of items) {
    const itemPath = path.join(root, item);
    try {
        const stats = fs.statSync(itemPath);
        if (stats.isDirectory()) {
            const size = getDirSize(itemPath);
            results.push({ name: item + ' (Dir)', size: size });
        } else {
            results.push({ name: item + ' (File)', size: stats.size });
        }
    } catch (err) {
        // Ignore
    }
}

// Sort by size descending
results.sort((a, b) => b.size - a.size);

for (const res of results) {
    const sizeGB = (res.size / (1024 * 1024 * 1024)).toFixed(2);
    const sizeMB = (res.size / (1024 * 1024)).toFixed(2);
    if (parseFloat(sizeGB) > 0.01) {
        console.log(`${res.name}: ${sizeGB} GB`);
    } else if (parseFloat(sizeMB) > 0.1) {
        console.log(`${res.name}: ${sizeMB} MB`);
    } else {
         console.log(`${res.name}: < 0.1 MB`);
    }
}
console.log('--- End ---');
