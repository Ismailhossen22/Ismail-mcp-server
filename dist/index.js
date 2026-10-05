import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
function createServer() {
    const server = new McpServer({
        name: 'ismail-mcp-server',
        version: '1.0.0',
    });
    // Simple Hello Tool
    server.registerTool('hello', {
        description: 'Say hello to a person by name',
        inputSchema: z.object({
            name: z.string().describe('Person name'),
        }),
    }, async ({ name }) => {
        return {
            content: [
                {
                    type: 'text',
                    text: `Hello ${name}! Welcome to my MCP server.`,
                },
            ],
        };
    });
    // const allowedFolder = path.resolve('./server-files');
    const allowedFolder = path.resolve('D:/ismail-mcp-server/server-files');
    server.registerTool('read_file', {
        description: 'Read a text file from the server-files folder',
        inputSchema: z.object({
            fileName: z.string().describe('Name of the file to read'),
        }),
    }, async ({ fileName }) => {
        try {
            const filePath = path.resolve(allowedFolder, fileName);
            // Security check:
            // Prevent reading files outside server-files
            if (filePath !== allowedFolder &&
                !filePath.startsWith(`${allowedFolder}${path.sep}`)) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: 'Error: Access to this file is not allowed.',
                        },
                    ],
                    isError: true,
                };
            }
            const content = await readFile(filePath, 'utf-8');
            return {
                content: [
                    {
                        type: 'text',
                        text: content,
                    },
                ],
            };
        }
        catch (error) {
            console.error(`Error reading file ismail ${fileName}:`, error);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error reading file: ${fileName}`,
                    },
                ],
                isError: true,
            };
        }
    });
    // ============================================================
    // ধাপ ১: ফাইলের একদম উপরে import-এ readdir যোগ করুন
    // ============================================================
    // আগে:  import { readFile } from 'node:fs/promises';
    // এখন:  import { readFile, readdir, stat } from 'node:fs/promises';
    // ============================================================
    // ধাপ ২: createServer() ফাংশনের ঠিক আগে এই অংশ বসান
    // ============================================================
    // আপনার Angular প্রজেক্টের পাথ এখানে দিন
    const projectFolder = path.resolve('D:/Ismail_project/demoproject/demoproject');
    // এই ফোল্ডারগুলো তালিকায় দেখানো হবে না (অনেক বড় ও অপ্রয়োজনীয়)
    const IGNORED = new Set(['node_modules', 'dist', '.git', '.angular', '.vscode']);
    const MAX_FILES = 1000; // তালিকায় সর্বোচ্চ ফাইল
    const MAX_FILE_SIZE = 1_000_000; // সর্বোচ্চ ফাইলের আকার (বাইট)
    // প্রজেক্ট ফোল্ডারের বাইরে যেতে না দেওয়ার নিরাপত্তা যাচাই
    function safePath(root, relative) {
        const full = path.resolve(root, relative);
        if (full !== root && !full.startsWith(`${root}${path.sep}`)) {
            return null;
        }
        return full;
    }
    // ফোল্ডার ঘুরে সব ফাইলের তালিকা বানায়
    async function walk(dir, root, out) {
        if (out.length >= MAX_FILES)
            return;
        const entries = await readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            if (IGNORED.has(entry.name))
                continue;
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                await walk(full, root, out);
            }
            else {
                out.push(path.relative(root, full).replaceAll('\\', '/'));
            }
            if (out.length >= MAX_FILES)
                return;
        }
    }
    // ============================================================
    // ধাপ ৩: createServer()-এর ভেতরে, `return server;`-এর আগে বসান
    // ============================================================
    // টুল ১: প্রজেক্টের সব ফাইলের তালিকা
    server.registerTool('list_project_files', {
        description: 'List all files in the Angular project (ignores node_modules, dist, .git)',
        inputSchema: z.object({}),
    }, async () => {
        try {
            const files = [];
            await walk(projectFolder, projectFolder, files);
            return {
                content: [{ type: 'text', text: files.join('\n') }],
            };
        }
        catch (error) {
            console.error('list_project_files error:', error);
            return {
                content: [{ type: 'text', text: 'Error: could not list project files.' }],
                isError: true,
            };
        }
    });
    // টুল ২: প্রজেক্টের যেকোনো একটি ফাইল পড়া
    server.registerTool('read_project_file', {
        description: 'Read one file from the Angular project. Use a relative path like src/app/app.component.ts',
        inputSchema: z.object({
            filePath: z.string().describe('Relative path inside the project'),
        }),
    }, async ({ filePath }) => {
        try {
            const full = safePath(projectFolder, filePath);
            if (!full) {
                return {
                    content: [{ type: 'text', text: 'Error: Access to this file is not allowed.' }],
                    isError: true,
                };
            }
            const info = await stat(full);
            if (info.size > MAX_FILE_SIZE) {
                return {
                    content: [{ type: 'text', text: `Error: file is too large (${info.size} bytes).` }],
                    isError: true,
                };
            }
            const content = await readFile(full, 'utf-8');
            return {
                content: [{ type: 'text', text: content }],
            };
        }
        catch (error) {
            console.error('read_project_file error:', error);
            return {
                content: [{ type: 'text', text: `Error reading file: ${filePath}` }],
                isError: true,
            };
        }
    });
    return server;
}
// Start MCP server using stdio
serveStdio(createServer);
console.error('My MCP server is running...');
