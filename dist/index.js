import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import { readFile } from 'node:fs/promises';
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
    return server;
}
// Start MCP server using stdio
serveStdio(createServer);
console.error('My MCP server is running...');
