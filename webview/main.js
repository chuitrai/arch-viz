const canvas = document.getElementById('viz-canvas');
const ctx = canvas.getContext('2d');
const detailsPanel = document.getElementById('details-panel');
const nodeName = document.getElementById('node-name');
const nodePath = document.getElementById('node-path');
const nodeInfo = document.getElementById('node-info');
const nodeLayer = document.getElementById('node-layer');
const nodeRole = document.getElementById('node-role');
const nodeTech = document.getElementById('node-tech');
const nodeWarning = document.getElementById('node-warning');

const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');
const sendBtn = document.getElementById('send-btn');
const toggleLayersBtn = document.getElementById('toggle-layers');
const runAuditBtn = document.getElementById('run-audit');

let width, height;
let nodes = [];
let links = [];
let transform = { x: 0, y: 0, k: 0.8 };
let hoveredNode = null;
let dragging = false;
let lastMousePos = { x: 0, y: 0 };
let viewMode = 'force'; // 'force' or 'layered'

const layers = ['API/Interface', 'Domain/Logic', 'Infrastructure/Data', 'Models/Shared', 'Common'];

function init() {
    resize();
    window.addEventListener('resize', resize);
    processData(window.projectData);
    setupEvents();
    requestAnimationFrame(animate);
}

function setupEvents() {
    sendBtn.onclick = handleChat;
    chatInput.onkeypress = (e) => e.key === 'Enter' && handleChat();
    toggleLayersBtn.onclick = () => viewMode = viewMode === 'force' ? 'layered' : 'force';
    runAuditBtn.onclick = runFullAudit;
}

function handleChat() {
    const text = chatInput.value.trim();
    if (!text) return;
    
    addMessage(text, 'user');
    chatInput.value = '';
    
    setTimeout(() => {
        const response = getAIResponse(text);
        addMessage(response, 'ai');
    }, 600);
}

function addMessage(text, type) {
    const div = document.createElement('div');
    div.className = `msg ${type}`;
    div.textContent = text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function getAIResponse(text) {
    const q = text.toLowerCase();
    const stats = {
        files: nodes.filter(n => n.type === 'file').length,
        dirs: nodes.filter(n => n.type === 'directory').length,
        warnings: nodes.filter(n => n.warning).length
    };

    if (q.includes('cấu trúc') || q.includes('structure')) {
        return `Dự án này có ${stats.dirs} thư mục và ${stats.files} tệp tin. Tôi nhận thấy các lớp: ${layers.join(', ')}.`;
    }
    if (q.includes('điểm yếu') || q.includes('weak') || q.includes('audit')) {
        return `Tôi tìm thấy ${stats.warnings} điểm cần lưu ý. Có một số tệp quá lớn hoặc thư mục quá dày đặc. Bạn nên cân nhắc chia nhỏ chúng ra.`;
    }
    return "Tôi có thể giúp bạn phân tích kiến trúc, tìm điểm yếu hoặc giải thích các mẫu thiết kế trong dự án này.";
}

function runFullAudit() {
    const warnings = nodes.filter(n => n.warning);
    addMessage(`Đang chạy kiểm thử kiến trúc... Tìm thấy ${warnings.length} vấn đề.`, 'ai');
    warnings.forEach(w => {
        addMessage(`⚠️ ${w.name}: ${w.warning}`, 'ai');
    });
}

function resize() {
    width = canvas.width = canvas.parentElement.clientWidth;
    height = canvas.height = canvas.parentElement.clientHeight;
    transform.x = width / 2;
    transform.y = height / 2;
}

function processData(root) {
    function flatten(item, parentId = null) {
        const id = item.path;
        const node = {
            id,
            name: item.name,
            type: item.type,
            size: item.size || 0,
            loc: item.loc || 0,
            extension: item.extension || '',
            layer: item.layer || 'Common',
            role: item.role || 'File',
            tech: item.tech || '',
            desc: item.description || '',
            warning: item.warning || null,
            x: (Math.random() - 0.5) * 800,
            y: (Math.random() - 0.5) * 800,
            vx: 0,
            vy: 0,
            radius: item.type === 'directory' ? 22 : 12
        };
        
        nodes.push(node);
        if (parentId) links.push({ source: parentId, target: id });
        if (item.children) item.children.forEach(child => flatten(child, id));
    }
    flatten(root);
}

function animate() {
    updatePhysics();
    draw();
    requestAnimationFrame(animate);
}

function updatePhysics() {
    const k = 0.04;
    const d = 0.85;
    const repulsion = 3000;

    nodes.forEach((n1, i) => {
        // Force to layer position if in layered mode
        if (viewMode === 'layered') {
            const layerIdx = layers.indexOf(n1.layer);
            const targetY = (layerIdx - 2) * 150;
            n1.vy += (targetY - n1.y) * 0.05;
        }

        for (let j = i + 1; j < nodes.length; j++) {
            const n2 = nodes[j];
            const dx = n2.x - n1.x;
            const dy = n2.y - n1.y;
            const distSq = dx * dx + dy * dy + 0.1;
            const force = repulsion / distSq;
            n1.vx -= (dx / Math.sqrt(distSq)) * force;
            n1.vy -= (dy / Math.sqrt(distSq)) * force;
            n2.vx += (dx / Math.sqrt(distSq)) * force;
            n2.vy += (dy / Math.sqrt(distSq)) * force;
        }
    });

    links.forEach(link => {
        const s = nodes.find(n => n.id === link.source);
        const t = nodes.find(n => n.id === link.target);
        if (!s || !t) return;
        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const force = (dist - 80) * k;
        s.vx += (dx / dist) * force;
        s.vy += (dy / dist) * force;
        t.vx -= (dx / dist) * force;
        t.vy -= (dy / dist) * force;
    });

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

    // Draw Layer Labels in layered mode
    if (viewMode === 'layered') {
        ctx.font = 'bold 20px Inter';
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        layers.forEach((layer, i) => {
            ctx.fillText(layer, -400, (i - 2) * 150);
            ctx.beginPath();
            ctx.moveTo(-400, (i - 2) * 150 + 10);
            ctx.lineTo(400, (i - 2) * 150 + 10);
            ctx.strokeStyle = 'rgba(255,255,255,0.05)';
            ctx.stroke();
        });
    }

    links.forEach(link => {
        const s = nodes.find(n => n.id === link.source);
        const t = nodes.find(n => n.id === link.target);
        if (!s || !t) return;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(t.x, t.y); ctx.stroke();
    });

    nodes.forEach(node => {
        ctx.beginPath();
        
        ctx.fillStyle = node.type === 'directory' ? '#818cf8' : getFileColor(node.extension);
        
        if (node.role === 'Database') {
            // Draw Cylinder
            ctx.fillStyle = '#10b981';
            const w = node.radius * 2;
            const h = node.radius * 1.5;
            ctx.ellipse(node.x, node.y - h/2, w/2, h/4, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(node.x - w/2, node.y - h/2, w, h);
            ctx.beginPath();
            ctx.ellipse(node.x, node.y + h/2, w/2, h/4, 0, 0, Math.PI * 2);
            ctx.fill();
        } else if (node.type === 'directory' && viewMode === 'layered') {
            // Draw Rectangle for Services in layered view
            ctx.fillStyle = '#3b82f6';
            ctx.roundRect(node.x - node.radius, node.y - node.radius, node.radius * 2, node.radius * 2, 4);
            ctx.fill();
        } else {
            // Default Circle
            ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        if (node.warning) {
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        if (node === hoveredNode) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = ctx.fillStyle;
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.radius + 5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // Draw Icon inside the node
        ctx.font = `${node.radius * 0.8}px "Segoe UI Emoji", Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        let icon = node.type === 'directory' ? '📁' : getFileIcon(node.extension);
        
        if (node.layer === 'API/Interface' && node.type === 'directory') icon = '🌐';
        if (node.layer === 'Domain/Logic' && node.type === 'directory') icon = '🧠';
        if (node.layer === 'Infrastructure/Data' && node.type === 'directory') icon = '🗄️';
        if (node.role === 'Database') icon = '🛢️';
        if (node.warning) icon = '⚠️';

        ctx.fillText(icon, node.x, node.y);
    });
    ctx.restore();
}

function getFileIcon(ext) {
    const icons = { '.ts': '⚡', '.js': '💛', '.go': '🐹', '.py': '🐍', '.html': '🖼️', '.css': '🎨', '.json': '⚙️', '.md': '📝', '.yml': '⚙️', '.yaml': '⚙️' };
    return icons[ext] || '📄';
}

function getFileColor(ext) {
    const colors = { '.ts': '#3178c6', '.js': '#f7df1e', '.go': '#00add8', '.py': '#3776ab' };
    return colors[ext] || '#94a3b8';
}

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

    let found = nodes.find(n => {
        const dx = n.x - mx; const dy = n.y - my;
        return dx*dx + dy*dy < (n.radius+10)*(n.radius+10);
    });

    if (found !== hoveredNode) {
        hoveredNode = found;
        if (hoveredNode) {
            detailsPanel.classList.remove('hidden');
            nodeName.textContent = hoveredNode.name;
            nodePath.textContent = hoveredNode.id;
            nodeLayer.textContent = hoveredNode.layer;
            nodeRole.textContent = hoveredNode.role;
            nodeTech.textContent = hoveredNode.tech;
            
            let infoText = hoveredNode.desc || 'Thành phần hệ thống';
            if (hoveredNode.type === 'file') {
                infoText = `Size: ${(hoveredNode.size/1024).toFixed(2)} KB`;
                if (hoveredNode.loc > 0) infoText += ` • LOC: ${hoveredNode.loc} lines`;
            }
            nodeInfo.textContent = infoText;
            
            if (hoveredNode.warning) {
                nodeWarning.textContent = hoveredNode.warning;
                nodeWarning.classList.remove('hidden');
            } else {
                nodeWarning.classList.add('hidden');
            }
        } else {
            detailsPanel.classList.add('hidden');
        }
    }
});

canvas.addEventListener('mousedown', e => { dragging = true; lastMousePos = { x: e.clientX, y: e.clientY }; });
window.addEventListener('mouseup', () => dragging = false);
canvas.addEventListener('wheel', e => {
    e.preventDefault();
    transform.k *= (1 - e.deltaY * 0.001);
    transform.k = Math.max(0.1, Math.min(3, transform.k));
}, { passive: false });

init();
