// utils.js

export function throttle(func, limit) {
    let lastFunc;
    let lastRan;
    return function() {
        const context = this;
        const args = arguments;
        if (!lastRan) {
            func.apply(context, args);
            lastRan = Date.now();
        } else {
            clearTimeout(lastFunc);
            lastFunc = setTimeout(function() {
                if ((Date.now() - lastRan) >= limit) {
                    func.apply(context, args);
                    lastRan = Date.now();
                }
            }, limit - (Date.now() - lastRan));
        }
    }
}

export function debounce(func, wait, immediate) {
    let timeout;
    return function() {
        const context = this, args = arguments;
        const later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
}

export function simplifyStroke(points, tolerance) {
    if (points.length <= 2) {
        return points;
    }

    const findPerpendicularDistance = (p, p1, p2) => {
        const slope = (p2.y - p1.y) / (p2.x - p1.x);
        const intercept = p1.y - (slope * p1.x);
        const result = Math.abs(slope * p.x - p.y + intercept) / Math.sqrt(Math.pow(slope, 2) + 1);
        return isNaN(result) ? 0 : result;
    };

    let maxDistance = 0;
    let index = 0;
    const end = points.length - 1;

    for (let i = 1; i < end; i++) {
        const distance = findPerpendicularDistance(points[i], points[0], points[end]);
        if (distance > maxDistance) {
            maxDistance = distance;
            index = i;
        }
    }

    if (maxDistance > tolerance) {
        const results1 = simplifyStroke(points.slice(0, index + 1), tolerance);
        const results2 = simplifyStroke(points.slice(index), tolerance);
        return [...results1.slice(0, -1), ...results2];
    } else {
        return [points[0], points[end]];
    }
}

export function getDistance(p1, p2) {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

export function lerp(start, end, t) {
    return start * (1 - t) + end * t;
}

export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

export function randomColor() {
    return `#${Math.floor(Math.random()*16777215).toString(16)}`;
}

export function isPointInRect(point, rect) {
    return point.x >= rect.x && 
           point.x <= rect.x + rect.width && 
           point.y >= rect.y && 
           point.y <= rect.y + rect.height;
}

export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

export function formatDate(date) {
    return new Date(date).toLocaleString();
}

export function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
