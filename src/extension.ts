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
        node.layer = detectLayer(name); // New: Detect architectural layer
        const exclude = ['node_modules', '.git', 'out', 'dist', '.gemini'];
        node.children = fs.readdirSync(dir)
            .filter(child => !exclude.includes(child))
            .map(child => walk(path.join(dir, child)));
        
        // Basic audit: Flag empty directories or very large ones
        if (node.children.length === 0) node.warning = 'Empty directory';
        if (node.children.length > 20) node.warning = 'Folder too crowded (Architectural smell)';
    } else {
        node.type = 'file';
        node.size = stats.size;
        node.extension = path.extname(dir);
        
        // Audit: Large files
        if (node.size > 50000) node.warning = 'Large file (Potential monolith)';
    }

    return node;
}

function detectLayer(name: string): string {
    const n = name.toLowerCase();
    if (['controller', 'api', 'routes', 'handler'].some(k => n.includes(k))) return 'API/Interface';
    if (['service', 'usecase', 'logic', 'domain'].some(k => n.includes(k))) return 'Domain/Logic';
    if (['repo', 'db', 'infrastructure', 'dal', 'persistence'].some(k => n.includes(k))) return 'Infrastructure/Data';
    if (['dto', 'model', 'entities', 'schema'].some(k => n.includes(k))) return 'Models/Shared';
    return 'Common';
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
            <div id="viz-container">
                <canvas id="viz-canvas"></canvas>
            </div>

            <aside id="chat-sidebar">
                <div class="chat-header">
                    <h3>Architect AI</h3>
                </div>
                <div id="chat-messages">
                    <div class="msg ai">Chào bạn! Tôi là trợ lý kiến trúc. Bạn muốn tôi phân tích cấu trúc dự án này không?</div>
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
                <span id="node-warning" class="warning-badge hidden"></span>
            </div>
            <div id="node-info"></div>
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
