# File Copy to Clipboard Extension

**File Copy to Clipboard** is a Visual Studio Code extension that allows you to copy the contents of one or more selected files or entire folders directly to your clipboard. Each file's content is prefixed with a comment line indicating its file path, making it easy to track where each portion came from.

## Features

- **Copy Multiple Files**: Select multiple files and copy their contents into the clipboard, each separated by a blank line.
- **Copy Entire Folders**: Select a folder (or multiple folders) to recursively copy all of its files.
- **File Path Commenting**: Each file’s path is inserted at the top of its content as a comment (e.g., `// File: path/to/file.js`).
- **Easy Explorer Integration**: Use the Explorer context menu or a keyboard shortcut to run the command on currently selected items.

## Usage

1. **Select Files or Folders in the Explorer**:  
   In VS Code’s Explorer, hold `Ctrl` (Windows/Linux) or `Cmd` (macOS) to select multiple files and/or folders.

2. **Right-Click to Copy**:  
   Right-click on one of the selected items and choose **"Copy File(s)/Folder Content to Clipboard"** from the context menu.

3. **Keyboard Shortcut** (Optional):  
   By default, pressing `Ctrl+Shift+C` (Windows/Linux) or `Cmd+Shift+C` (macOS) while the Explorer is focused and files are selected will also copy them. *(Adjust this keybinding in your `package.json` or user settings as needed.)*

Once done, all selected files’ contents are in your clipboard. Each file’s content includes a comment line with the file path, making it simple to track the source of the copied text.

## Installation

1. **From VSIX (Local Installation)**:  
   If you have the packaged `.vsix` file:
   - Open VS Code and go to the Extensions view (`Ctrl+Shift+X` or `Cmd+Shift+X`).
   - Click the **...** (More Actions) button and select **"Install from VSIX..."**.
   - Choose the `.vsix` file to install.

2. **From Marketplace (If Published)**:  
   Search for **"File Copy to Clipboard"** in the Extensions Marketplace and install it directly within VS Code.

## Requirements

- VS Code version 1.80.0 or later is recommended.
- Node.js is only required for building and packaging the extension, not for using it.

## Known Issues / Limitations

- Comment style is currently fixed to `//`. You can update `readFileContent()` in `extension.ts` to detect file extensions and choose different comment styles.
- The command currently copies all files from selected folders. If you have a large directory structure, this may take some time.

## Contributing

Contributions are welcome! To develop and test:

1. Clone the repository.
2. Run `npm install` to install dependencies.
3. Run `npm run compile` to build the extension.
4. Press `F5` in VS Code to launch an Extension Development Host to test changes.

Submit a pull request or open an issue for bug reports and improvements.

