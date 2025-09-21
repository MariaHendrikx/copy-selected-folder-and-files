import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';

// Patterns that are *always* ignored, even if the user has not configured
// an explicit `fileCopyToClipboard.excludeGlobs` entry in their settings.
const ALWAYS_EXCLUDED = [
    '**/__pycache__/**',
    '**/node_modules/**'
];

// Binary file extensions that should never be in‑lined. Instead we insert a
// lightweight placeholder so the clipboard is never flooded with binary
// data.
const BINARY_EXTENSIONS = new Set([
    // Images
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.bmp', '.tiff', '.tif',
    // Videos
    '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.m4v',
    // Audio
    '.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.m4a',
    // Archives
    '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz',
    // Executables
    '.exe', '.dll', '.so', '.dylib', '.bin',
    // Documents (binary formats)
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    // Other binary formats
    '.db', '.sqlite', '.sqlite3', '.mdb', '.accdb',
    '.psd', '.ai', '.sketch', '.fig',
    '.iso', '.img', '.dmg', '.pkg', '.deb', '.rpm'
]);

/** Combine the hard‑coded exclusions with anything the user added */
function mergeExcludes(userExcludes: string[] | undefined): string[] {
    return [...new Set([...ALWAYS_EXCLUDED, ...(userExcludes ?? [])])];
}

function isBinary(filePath: string): boolean {
    return BINARY_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

/**
 * Checks if a file should be excluded based on simple glob‑like rules.
 * Supports:
 *   - `*folder*`  → path *contains* that folder anywhere
 *   - `**.ext`      → file extension match (case‑insensitive)
 */
function isExcluded(filePath: string, excludeGlobs: string[], rootDir: string): boolean {
    const relativePath = path
        .relative(rootDir, filePath)
        .replace(/\\/g, '/')
        .toLowerCase();

    return excludeGlobs.some(pattern => {
        const normalized = pattern.toLowerCase();

        // "**/folder/**" → exclude any path containing /folder/
        if (normalized.startsWith('**/') && normalized.endsWith('/**')) {
            const folderName = normalized.slice(3, -3);
            return relativePath.includes(`/${folderName}/`);
        }

        // "**/*.ext" → exclude the given extension
        if (normalized.startsWith('**/*.')) {
            const ext = normalized.slice(5);
            return relativePath.endsWith(`.${ext}`);
        }

        return false; // unrecognised pattern – ignore
    });
}

/** Recursively gather all files in a folder, respecting exclusions */
async function getAllFilesInFolder(dirPath: string, excludeGlobs: string[], rootDir: string): Promise<string[]> {
    let files: string[] = [];
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (isExcluded(fullPath, excludeGlobs, rootDir)) {
            continue;
        }

        if (entry.isDirectory()) {
            const subFiles = await getAllFilesInFolder(fullPath, excludeGlobs, rootDir);
            files = files.concat(subFiles);
        } else {
            files.push(fullPath);
        }
    }

    return files;
}

/** Resolve every file path the user selected (handles folders + multi‑select). */
async function getFilePathsFromUris(uris: vscode.Uri[]): Promise<string[]> {
    const config = vscode.workspace.getConfiguration('fileCopyToClipboard');
    const excludeGlobs = mergeExcludes(config.get<string[]>('excludeGlobs'));

    let allFiles: string[] = [];
    for (const uri of uris) {
        const stat = await fs.stat(uri.fsPath);
        const rootDir = stat.isDirectory() ? uri.fsPath : path.dirname(uri.fsPath);

        if (stat.isDirectory()) {
            const folderFiles = await getAllFilesInFolder(uri.fsPath, excludeGlobs, rootDir);
            allFiles = allFiles.concat(folderFiles);
        } else if (!isExcluded(uri.fsPath, excludeGlobs, rootDir)) {
            allFiles.push(uri.fsPath);
        }
    }

    return [...new Set(allFiles)];
}

/** Format a single file (or binary file placeholder) for the clipboard. */
async function readFileContent(filePath: string): Promise<string> {
    const commentPrefix = '//';

    // Build a workspace‑relative label so the path is compact and useful.
    let relativePath = filePath;
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(filePath));
    if (workspaceFolder) {
        relativePath = path.relative(workspaceFolder.uri.fsPath, filePath);
    }

    // For binary files we only want a short stub.
    if (isBinary(filePath)) {
        return `${commentPrefix} Binary file: ${relativePath}`;
    }

    // Text file → read content.
    const data = await fs.readFile(filePath, 'utf8');
    return `${commentPrefix} File: ${relativePath}\n${data}`;
}

/** Concatenate every file's formatted output, separated by blank lines */
async function readAndCombineFileContents(filePaths: string[]): Promise<string> {
    const chunks: string[] = [];
    for (const filePath of filePaths) {
        chunks.push(await readFileContent(filePath));
    }
    return chunks.join('\n\n');
}

export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand(
        'file-copy-to-clipboard.copyFromExplorer',
        async (uri: vscode.Uri, allSelectedUris: vscode.Uri[]) => {
            if (!allSelectedUris || allSelectedUris.length === 0) {
                vscode.window.showWarningMessage('No files or folders selected.');
                return;
            }

            const filePaths = await getFilePathsFromUris(allSelectedUris);
            if (filePaths.length === 0) {
                vscode.window.showWarningMessage('No files found after applying exclusions.');
                return;
            }

            const finalContent = await readAndCombineFileContents(filePaths);
            await vscode.env.clipboard.writeText(finalContent);
            vscode.window.showInformationMessage(`Copied ${filePaths.length} file(s) to clipboard.`);
        }
    );

    context.subscriptions.push(disposable);
}

export function deactivate() {}
