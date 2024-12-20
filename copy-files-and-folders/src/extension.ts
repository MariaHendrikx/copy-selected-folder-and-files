import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';

async function getAllFilesInFolder(dirPath: string): Promise<string[]> {
    let files: string[] = [];
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            files = files.concat(await getAllFilesInFolder(fullPath));
        } else {
            files.push(fullPath);
        }
    }
    return files;
}

/**
 * Given an array of URIs, determines which are directories and which are files.
 * For directories, it gathers all files inside them.
 * Returns a list of all files.
 */
async function getFilePathsFromUris(uris: vscode.Uri[]): Promise<string[]> {
    let allFiles: string[] = [];
    for (const selectedUri of uris) {
        const stat = await fs.stat(selectedUri.fsPath);
        if (stat.isDirectory()) {
            const folderFiles = await getAllFilesInFolder(selectedUri.fsPath);
            allFiles = allFiles.concat(folderFiles);
        } else {
            allFiles.push(selectedUri.fsPath);
        }
    }
    // Remove duplicates just in case
    allFiles = [...new Set(allFiles)];
    return allFiles;
}

/**
 * Reads a single file’s content and prepends a comment with the file path.
 */
async function readFileContent(filePath: string): Promise<string> {
    const data = await fs.readFile(filePath, 'utf8');
    const commentPrefix = '//';
    return `${commentPrefix} File: ${filePath}\n${data}`;
}

/**
 * Given an array of file paths, reads and combines their contents.
 */
async function readAndCombineFileContents(filePaths: string[]): Promise<string> {
    const allContents: string[] = [];
    for (const filePath of filePaths) {
        const content = await readFileContent(filePath);
        allContents.push(content);
    }
    return allContents.join('\n\n');
}

export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('file-copy-to-clipboard.copyFromExplorer', 
        async (uri: vscode.Uri, allSelectedUris: vscode.Uri[]) => {
            // If no selection is provided, show a warning
            if (!allSelectedUris || allSelectedUris.length === 0) {
                vscode.window.showWarningMessage("No files or folders selected.");
                return;
            }

            const filePaths = await getFilePathsFromUris(allSelectedUris);
            if (filePaths.length === 0) {
                vscode.window.showWarningMessage("No files found in the selected directories.");
                return;
            }

            const finalContent = await readAndCombineFileContents(filePaths);
            await vscode.env.clipboard.writeText(finalContent);
            vscode.window.showInformationMessage(`Copied ${filePaths.length} file(s) from the Explorer selection to clipboard.`);
        }
    );

    context.subscriptions.push(disposable);
}

export function deactivate() {}
