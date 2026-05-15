import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('arch-viz.visualize', () => {
        const panel = vscode.window.createWebviewPanel(
            'archViz',
            'Project Architecture',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'webview'))]
            }
        );

        const projectData = getProjectStructure();
        panel.webview.html = getWebviewContent(panel.webview, context.extensionUri, projectData);
    });

    context.subscriptions.push(disposable);
}

function getProjectStructure() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        return { name: 'No workspace', children: [] };
    }

    const rootPath = workspaceFolders[0].uri.fsPath;
    return walk(rootPath);
}

function walk(dir: string): any {
    const name = path.basename(dir);
    const stats = fs.statSync(dir);
    const node: any = { name, path: dir };

    if (stats.isDirectory()) {
        node.type = 'directory';
        node.layer = detectLayer(name);
        node.role = detectRole(name);
        node.tech = 'Unknown';
        node.description = `Thành phần ${name} (Auto-detected)`;

        const exclude = ['node_modules', '.git', 'out', 'dist', '.gemini'];
        node.children = fs.readdirSync(dir)
            .filter(child => !exclude.includes(child))
            .map(child => walk(path.join(dir, child)));
        
        // Infer Tech from children
        const exts = new Set(node.children.filter((c:any) => c.type === 'file').map((c:any) => c.extension));
        if (exts.has('.ts') || exts.has('.js')) node.tech = 'Node.js / TS';
        if (exts.has('.go')) node.tech = 'Golang';
        if (exts.has('.py')) node.tech = 'Python';
        if (exts.has('.java')) node.tech = 'Java';
        
        // Basic audit: Flag empty directories or very large ones
        if (node.children.length === 0) node.warning = 'Empty directory';
        if (node.children.length > 20) node.warning = 'Folder too crowded (Architectural smell)';
    } else {
        node.type = 'file';
        node.size = stats.size;
        node.extension = path.extname(dir);
        
        // Static Linter: God Class & Layer Violation
        const CODE_EXTENSIONS = ['.ts', '.js', '.go', '.py', '.java', '.cs', '.php'];
        if (CODE_EXTENSIONS.includes(node.extension) && node.size < 500000) { // Limit size for speed
            try {
                const content = fs.readFileSync(dir, 'utf8');
                const loc = content.split('\n').length;
                node.loc = loc;
                
                if (loc > 500) {
                    node.warning = `God Class (Quá dài: ${loc} dòng code)`;
                } else {
                    // Check architecture violations (e.g. Domain depending on API)
                    const dirLower = dir.toLowerCase();
                    const isDomain = ['domain', 'service', 'logic', 'usecase'].some(k => dirLower.includes(k));
                    if (isDomain) {
                        const importRegex = /(import|require|use).*[\/'"](controller|api|routes|handler|gateway)[\/'"]/i;
                        if (importRegex.test(content)) {
                            node.warning = 'Cấm (Forbidden): Domain gọi ngược ra API/Controller';
                        }
                    }
                }
            } catch (e) {
                // Ignore read errors
            }
        }
        
        // Audit: Large files generic check
        if (!node.warning && node.size > 500000) {
            node.warning = 'File quá lớn (Potential monolith)';
        }
    }

    return node;
}

function detectLayer(name: string): string {
    const n = name.toLowerCase();
    if (['controller', 'api', 'routes', 'handler', 'gateway'].some(k => n.includes(k))) return 'API/Interface';
    if (['service', 'usecase', 'logic', 'domain', 'app'].some(k => n.includes(k))) return 'Domain/Logic';
    if (['repo', 'db', 'infrastructure', 'dal', 'persistence', 'storage'].some(k => n.includes(k))) return 'Infrastructure/Data';
    if (['dto', 'model', 'entities', 'schema'].some(k => n.includes(k))) return 'Models/Shared';
    return 'Common';
}

function detectRole(name: string): string {
    const n = name.toLowerCase();
    if (['db', 'database', 'mongo', 'postgres', 'sql', 'redis', 'storage'].some(k => n.includes(k))) return 'Database';
    if (['queue', 'kafka', 'rabbitmq', 'broker', 'pubsub'].some(k => n.includes(k))) return 'Message Broker';
    if (['ui', 'frontend', 'web', 'client', 'app'].some(k => n.includes(k))) return 'Web Frontend';
    if (['gateway', 'proxy', 'ingress'].some(k => n.includes(k))) return 'API Gateway';
    return 'Service';
}

function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri, data: any) {
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'webview', 'main.js'));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'webview', 'style.css'));

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Architecture Visualization</title>
    <link rel="stylesheet" href="${styleUri}">
</head>
<body>
    <div id="app">
        <header>
            <div class="logo">
                <h1>ArchViz AI</h1>
                <span class="badge">Enterprise</span>
            </div>
            <div class="controls">
                <button id="toggle-layers">Layered View</button>
                <button id="run-audit">Audit Project</button>
            </div>
        </header>

        <main>
            <div id="legend-panel">
                <h4>C4 Model Legend</h4>
                <div class="legend-item"><span class="legend-shape shape-rect"></span> Service/App</div>
                <div class="legend-item"><span class="legend-shape shape-cyl"></span> Database</div>
                <div class="legend-item"><span class="legend-shape" style="background:#818cf8; border-radius:50%"></span> File/Folder</div>
            </div>
            <div id="viz-container">
                <canvas id="viz-canvas"></canvas>
            </div>

            <aside id="chat-sidebar">
                <div class="chat-header">
                    <h3>Architect AI</h3>
                </div>
                <div id="chat-messages">
                    <div class="msg ai">Chào bạn! Tôi là trợ lý kiến trúc. Cấu trúc C4 Model đã được bật. Bạn muốn tôi phân tích điều gì?</div>
                </div>
                <div class="chat-input-area">
                    <input type="text" id="chat-input" placeholder="Hỏi về kiến trúc dự án...">
                    <button id="send-btn">🚀</button>
                </div>
            </aside>
        </main>

        <div id="details-panel" class="hidden">
            <h2 id="node-name"></h2>
            <p id="node-path"></p>
            <div class="node-meta">
                <span id="node-layer" class="badge"></span>
                <span id="node-role" class="c4-role"></span>
                <span id="node-tech" class="c4-tech"></span>
                <span id="node-warning" class="warning-badge hidden"></span>
            </div>
            <p id="node-info" style="font-size: 0.8rem; margin-top: 0.5rem"></p>
        </div>
    </div>
    <script>
        window.projectData = ${JSON.stringify(data)};
    </script>
    <script src="${scriptUri}"></script>
</body>
</html>`;
}

export function deactivate() {}
