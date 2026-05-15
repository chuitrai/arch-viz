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
    const allFiles: any[] = [];
    const tree = walk(rootPath, allFiles);

    const dependencies: any[] = [];
    for (const file of allFiles) {
        if (file.imports && file.imports.length > 0) {
            for (const imp of file.imports) {
                // Fuzzy match
                const impName = path.basename(imp).replace(/['"]/g, '');
                if (impName.length < 3) continue;
                const target = allFiles.find(f => f.name.includes(impName) || f.path.replace(/\\/g, '/').includes(imp));
                if (target && target.path !== file.path) {
                    dependencies.push({ source: file.path, target: target.path });
                }
            }
        }
    }

    return { tree, dependencies };
}

function walk(dir: string, allFiles: any[]): any {
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
            .map(child => walk(path.join(dir, child), allFiles));
        
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
                    node.suggestion = `Refactor: Tách class này ra làm các module nhỏ hơn theo Single Responsibility Principle. Xem xét áp dụng Facade Pattern.`;
                } else {
                    const dirLower = dir.toLowerCase();
                    const isDomain = ['domain', 'service', 'logic', 'usecase'].some(k => dirLower.includes(k));
                    const isController = ['controller', 'api', 'routes', 'handler'].some(k => dirLower.includes(k));
                    
                    // Extract imports for dependency graph
                    const importRegex = /(?:import|require)[^'"]*['"]([^'"]+)['"]/g;
                    let match;
                    node.imports = [];
                    while ((match = importRegex.exec(content)) !== null) {
                        node.imports.push(match[1]);
                    }

                    if (isDomain) {
                        if (node.imports.some((i: string) => /(controller|api|routes|handler|gateway)/i.test(i))) {
                            node.warning = 'Cấm (Forbidden): Domain gọi ngược ra API/Controller';
                            node.suggestion = `Refactor: Đảo ngược phụ thuộc (Dependency Inversion). Tạo một interface ở tầng Domain và implement nó ở tầng API.`;
                        }
                    }
                    if (isController) {
                        if (node.imports.some((i: string) => /(repo|db|infrastructure|dal|storage)/i.test(i))) {
                            node.warning = 'Lỗi Kiến Trúc: Controller gọi thẳng Repository';
                            node.suggestion = `Refactor: Thêm một tầng Service/UseCase ở giữa. Controller chỉ nên gọi Service, và Service gọi Repository.`;
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
        allFiles.push(node);
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
                <button id="toggle-mermaid">Mermaid View</button>
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
            <div id="mermaid-container" class="hidden" style="flex:1; background:#1e293b; padding:2rem; overflow:auto;">
                <h3 style="color:#fff;">Mermaid Flowchart</h3>
                <p style="color:#94a3b8; font-size:0.8rem">Copy code này vào file .md của bạn trên GitHub để vẽ sơ đồ.</p>
                <button id="copy-mermaid" style="margin-bottom:1rem">Copy Code</button>
                <pre><code id="mermaid-code" style="color:#38bdf8; font-family:monospace"></code></pre>
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
            <div id="node-suggestion" class="suggestion-block hidden"></div>
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
