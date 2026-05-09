const canvas = document.getElementById('viz-canvas');
const ctx = canvas.getContext('2d');
const detailsPanel = document.getElementById('details-panel');
const nodeName = document.getElementById('node-name');
const nodePath = document.getElementById('node-path');
const nodeInfo = document.getElementById('node-info');
const fileCountEl = document.getElementById('file-count');

let width, height;
let nodes = [];
let links = [];
let transform = { x: 0, y: 0, k: 1 };
let hoveredNode = null;
let dragging = false;
let lastMousePos = { x: 0, y: 0 };

function init() {
    resize();
    window.addEventListener('resize', resize);

    // Process projectData into nodes and links
    processData(window.projectData);
    
    fileCountEl.textContent = `${nodes.length} items discovered`;

    requestAnimationFrame(animate);
}

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    transform.x = width / 2;
    transform.y = height / 2;
}

function processData(root) {
    const nodeMap = new Map();

    function flatten(item, parentId = null) {
        const id = item.path;
        const node = {
            id,
            name: item.name,
            type: item.type,
            size: item.size || 0,
            extension: item.extension || '',
            x: (Math.random() - 0.5) * 500,
            y: (Math.random() - 0.5) * 500,
            vx: 0,
            vy: 0,
            radius: item.type === 'directory' ? 8 : 4
        };
        
        nodes.push(node);
        if (parentId) {
            links.push({ source: parentId, target: id });
        }

        if (item.children) {
            item.children.forEach(child => flatten(child, id));
        }
    }

    flatten(root);
}

function animate() {
    updatePhysics();
    draw();
    requestAnimationFrame(animate);
}

function updatePhysics() {
    const k = 0.05; // spring constant
    const d = 0.9; // damping
    const repulsion = 2000;

    // Repulsion
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const n1 = nodes[i];
            const n2 = nodes[j];
            const dx = n2.x - n1.x;
            const dy = n2.y - n1.y;
            const distSq = dx * dx + dy * dy + 0.1;
            const force = repulsion / distSq;
            const fx = (dx / Math.sqrt(distSq)) * force;
            const fy = (dy / Math.sqrt(distSq)) * force;
            n1.vx -= fx;
            n1.vy -= fy;
            n2.vx += fx;
            n2.vy += fy;
        }
    }

    // Spring forces (links)
    links.forEach(link => {
        const source = nodes.find(n => n.id === link.source);
        const target = nodes.find(n => n.id === link.target);
        if (!source || !target) return;

        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const force = (dist - 50) * k;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        source.vx += fx;
        source.vy += fy;
        target.vx -= fx;
        target.vy -= fy;
    });

    // Update positions
    nodes.forEach(node => {
        node.vx *= d;
        node.vy *= d;
        node.x += node.vx;
        node.y += node.vy;
    });
}

function draw() {
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.k, transform.k);

    // Draw links
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    links.forEach(link => {
        const source = nodes.find(n => n.id === link.source);
        const target = nodes.find(n => n.id === link.target);
        if (!source || !target) return;
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
    });

    // Draw nodes
    nodes.forEach(node => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        
        if (node.type === 'directory') {
            ctx.fillStyle = '#818cf8';
        } else {
            ctx.fillStyle = getFileColor(node.extension);
        }

        if (node === hoveredNode) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = ctx.fillStyle;
            ctx.arc(node.x, node.y, node.radius + 2, 0, Math.PI * 2);
        } else {
            ctx.shadowBlur = 0;
        }

        ctx.fill();
    });

    ctx.restore();
}

function getFileColor(ext) {
    const colors = {
        '.ts': '#3178c6',
        '.js': '#f7df1e',
        '.html': '#e34f26',
        '.css': '#1572b6',
        '.json': '#f8fafc',
        '.md': '#0891b2'
    };
    return colors[ext] || '#94a3b8';
}

// Interaction
canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left - transform.x) / transform.k;
    const my = (e.clientY - rect.top - transform.y) / transform.k;

    if (dragging) {
        transform.x += e.clientX - lastMousePos.x;
        transform.y += e.clientY - lastMousePos.y;
        lastMousePos = { x: e.clientX, y: e.clientY };
        return;
    }

    let found = null;
    for (const node of nodes) {
        const dx = node.x - mx;
        const dy = node.y - my;
        if (dx * dx + dy * dy < (node.radius + 5) * (node.radius + 5)) {
            found = node;
            break;
        }
    }

    if (found !== hoveredNode) {
        hoveredNode = found;
        if (hoveredNode) {
            detailsPanel.classList.remove('hidden');
            nodeName.textContent = hoveredNode.name;
            nodePath.textContent = hoveredNode.id;
            nodeInfo.textContent = hoveredNode.type === 'file' 
                ? `Size: ${(hoveredNode.size / 1024).toFixed(2)} KB` 
                : 'Directory';
        } else {
            detailsPanel.classList.add('hidden');
        }
    }
});

canvas.addEventListener('mousedown', e => {
    dragging = true;
    lastMousePos = { x: e.clientX, y: e.clientY };
});

window.addEventListener('mouseup', () => {
    dragging = false;
});

canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const zoomSpeed = 0.001;
    transform.k *= (1 - e.deltaY * zoomSpeed);
    transform.k = Math.max(0.1, Math.min(5, transform.k));
}, { passive: false });

init();
